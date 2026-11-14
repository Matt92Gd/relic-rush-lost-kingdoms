import { Vector3 } from '@babylonjs/core';
import { eventBus } from '../core/EventBus';
import { TRACK_WIDTH, TrackMath } from '../world/TrackMath';
import type { Lane, PlayerAnimState, TrackSegmentData } from '../types/game.types';

export type BufferedInputAction = 'left' | 'right' | 'jump' | 'slide';

interface QueuedAction {
  action: BufferedInputAction;
  expiresAtMs: number;
}

export interface PlayerStepCallbacks {
  onLaneChanged?: () => void;
  onJump?: (isDouble: boolean) => void;
  onSlide?: () => void;
  onTurnExecuted?: (branch: 'left' | 'right', newSegment: TrackSegmentData) => void;
  onEnteredNewSegment?: (newSegment: TrackSegmentData) => void;
  onMissedTurn?: () => void;
}

export class PlayerController {
  public currentSegment!: TrackSegmentData;
  public localZ = 3;
  public currentLane: Lane = 0;
  public smoothLane = 0;
  public y = 0;
  public vy = 0;
  public isGrounded = true;
  public isSliding = false;
  public slideTimer = 0;
  public landTimer = 0;
  public stumbleTimer = 0;
  public laneAnimTimer = 0;
  public laneAnimDir: -1 | 0 | 1 = 0;
  public doubleJumpUsed = false;
  public currentYaw = 0;
  public targetYaw = 0;

  private inputBuffer: QueuedAction[] = [];
  private pendingTurn: 'left' | 'right' | null = null;
  private footstepTimer = 0;

  public reset(startSegment: TrackSegmentData): void {
    this.currentSegment = startSegment;
    this.localZ = 4.0;
    this.currentLane = 0;
    this.smoothLane = 0;
    this.y = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.isSliding = false;
    this.slideTimer = 0;
    this.landTimer = 0;
    this.stumbleTimer = 0;
    this.laneAnimTimer = 0;
    this.laneAnimDir = 0;
    this.doubleJumpUsed = false;
    this.currentYaw = TrackMath.getYaw(startSegment.direction);
    this.targetYaw = this.currentYaw;
    this.inputBuffer = [];
    this.pendingTurn = null;
  }

  public queueInput(action: BufferedInputAction, nowMs: number = performance.now()): void {
    // Input buffering breve (220ms) per reattività totale anche durante animazioni o pre-curva
    this.inputBuffer.push({ action, expiresAtMs: nowMs + 220 });
  }

  public step(
    dt: number,
    forwardSpeed: number,
    allowDoubleJump: boolean,
    getSegment: (id: number) => TrackSegmentData | undefined,
    resolveFork: (forkId: number, branch: 'left' | 'right') => TrackSegmentData | null,
    callbacks: PlayerStepCallbacks,
    nowMs: number = performance.now()
  ): void {
    // 1. Scade buffer vecchi
    this.inputBuffer = this.inputBuffer.filter((q) => q.expiresAtMs >= nowMs);

    // 2. Avanzamento lungo il segmento attivo
    this.localZ += forwardSpeed * dt;

    // 3. Controllo zona svolta / bivio
    const isTurnSeg =
      this.currentSegment.type === 'turn_left' ||
      this.currentSegment.type === 'turn_right' ||
      this.currentSegment.type === 'fork_t';

    const preTurnZoneStart = this.currentSegment.length - 12.0;
    const junctionTriggerZ = this.currentSegment.length - TRACK_WIDTH / 2;
    const inPreTurnZone = isTurnSeg && this.localZ >= preTurnZoneStart;
    const inJunctionSquare = isTurnSeg && this.localZ >= this.currentSegment.length - TRACK_WIDTH;
    let turnedThisFrame = false;

    // Consuma eventuale input dal buffer
    while (this.inputBuffer.length > 0) {
      const next = this.inputBuffer[0];

      if (next.action === 'left' || next.action === 'right') {
        if (inPreTurnZone) {
          const wantedBranch = next.action;
          const validForTurn =
            this.currentSegment.type === 'fork_t' ||
            (this.currentSegment.type === 'turn_left' && wantedBranch === 'left') ||
            (this.currentSegment.type === 'turn_right' && wantedBranch === 'right');

          if (validForTurn) {
            this.inputBuffer.shift();
            if (inJunctionSquare) {
              this.pendingTurn = null;
              this.executeTurn(wantedBranch, getSegment, resolveFork, callbacks);
              turnedThisFrame = true;
              break;
            } else {
              // Memorizza la svolta imminente e la esegue appena raggiunge il centro dell'incrocio
              this.pendingTurn = wantedBranch;
              continue;
            }
          }
        }

        // Cambio corsia standard (impedito nei tratti narrow se si prova a uscire dal centro)
        const delta = next.action === 'left' ? -1 : 1;
        const target = (this.currentLane + delta) as Lane;
        const maxLane = this.currentSegment.type === 'narrow' ? 0 : 1;
        if (target >= -maxLane && target <= maxLane) {
          this.currentLane = target;
          this.laneAnimDir = delta as -1 | 1;
          this.laneAnimTimer = 0.2;
          callbacks.onLaneChanged?.();
        }
        this.inputBuffer.shift();
        continue;
      }

      if (next.action === 'jump') {
        if (this.isGrounded) {
          this.vy = 12.2;
          this.isGrounded = false;
          this.isSliding = false;
          this.slideTimer = 0;
          this.doubleJumpUsed = false;
          eventBus.emit('audio:sfx', { sfx: 'jump' });
          callbacks.onJump?.(false);
          this.inputBuffer.shift();
          continue;
        } else if (allowDoubleJump && !this.doubleJumpUsed) {
          this.vy = 11.4;
          this.doubleJumpUsed = true;
          this.isSliding = false;
          eventBus.emit('audio:sfx', { sfx: 'double_jump' });
          callbacks.onJump?.(true);
          this.inputBuffer.shift();
          continue;
        }
        break; // Mantieni nel buffer finché atterra entro 220ms
      }

      if (next.action === 'slide') {
        if (this.isGrounded) {
          this.isSliding = true;
          this.slideTimer = 0.68;
          eventBus.emit('audio:sfx', { sfx: 'slide' });
          callbacks.onSlide?.();
          this.inputBuffer.shift();
          continue;
        } else {
          // Fast-fall in aria -> scivola immediatamente appena tocca terra
          this.vy = Math.min(this.vy, -19.5);
          this.isSliding = true;
          this.slideTimer = 0.68;
          callbacks.onSlide?.();
          this.inputBuffer.shift();
          continue;
        }
      }
    }

    if (!turnedThisFrame && this.pendingTurn && isTurnSeg && this.localZ >= junctionTriggerZ) {
      const branch = this.pendingTurn;
      this.pendingTurn = null;
      this.executeTurn(branch, getSegment, resolveFork, callbacks);
      turnedThisFrame = true;
    }

    // 4. Fisica verticale salto/gravità
    if (!this.isGrounded) {
      this.vy -= 31.5 * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.isGrounded = true;
        this.landTimer = 0.14;
      }
    }

    // 5. Timer scivolata, atterraggio, inciampo, passi
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }
    if (this.landTimer > 0) this.landTimer -= dt;
    if (this.stumbleTimer > 0) this.stumbleTimer -= dt;
    if (this.laneAnimTimer > 0) {
      this.laneAnimTimer -= dt;
      if (this.laneAnimTimer <= 0) this.laneAnimDir = 0;
    }

    if (this.isGrounded && !this.isSliding) {
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.footstepTimer = Math.max(0.18, 4.2 / Math.max(10, forwardSpeed));
        eventBus.emit('audio:sfx', { sfx: 'footstep' });
      }
    }

    // 6. Interpolazione morbida corsia e rotazione yaw
    const laneOffsetTarget =
      this.currentSegment.type === 'narrow' ? 0 : this.currentLane;
    this.smoothLane += (laneOffsetTarget - this.smoothLane) * Math.min(1, dt * 16);
    this.currentYaw = TrackMath.shortestAngleLerp(
      this.currentYaw,
      this.targetYaw,
      Math.min(1, dt * 14)
    );

    // 7. Transizione fine segmento
    if (!turnedThisFrame && this.localZ >= this.currentSegment.length) {
      if (isTurnSeg) {
        // Il giocatore ha raggiunto la fine di una curva senza svoltare!
        callbacks.onMissedTurn?.();
        return;
      }
      const nextId = this.currentSegment.nextSegmentId;
      const nextSeg = nextId !== null ? getSegment(nextId) : undefined;
      if (nextSeg) {
        this.localZ -= this.currentSegment.length;
        this.currentSegment = nextSeg;
        this.pendingTurn = null;
        if (nextSeg.type === 'narrow') {
          this.currentLane = 0;
        }
        callbacks.onEnteredNewSegment?.(nextSeg);
      }
    }
  }

  private executeTurn(
    branch: 'left' | 'right',
    getSegment: (id: number) => TrackSegmentData | undefined,
    resolveFork: (forkId: number, branch: 'left' | 'right') => TrackSegmentData | null,
    callbacks: PlayerStepCallbacks
  ): void {
    const worldPos = TrackMath.localToWorld(
      this.currentSegment.origin,
      this.currentSegment.direction,
      this.localZ,
      TrackMath.laneToOffset(this.smoothLane),
      this.y
    );

    let nextSeg: TrackSegmentData | null = null;
    if (this.currentSegment.type === 'fork_t') {
      nextSeg = resolveFork(this.currentSegment.id, branch);
    } else if (this.currentSegment.nextSegmentId !== null) {
      nextSeg = getSegment(this.currentSegment.nextSegmentId) ?? null;
    }

    if (!nextSeg) return;

    const mapped = TrackMath.worldToLocal(nextSeg, worldPos);
    this.currentSegment = nextSeg;
    this.localZ = Math.max(-TRACK_WIDTH * 0.85, mapped.localZ);
    const nearestLane = Math.max(-1, Math.min(1, Math.round(mapped.lateralOffset / 1.9))) as Lane;
    this.currentLane = nextSeg.type === 'narrow' ? 0 : nearestLane;
    this.smoothLane =
      nextSeg.type === 'narrow' ? 0 : Math.max(-1, Math.min(1, mapped.lateralOffset / 1.9));
    this.targetYaw = TrackMath.getYaw(nextSeg.direction);

    eventBus.emit('audio:sfx', { sfx: 'turn' });
    callbacks.onTurnExecuted?.(branch, nextSeg);
  }

  public triggerStumble(): void {
    this.stumbleTimer = 0.55;
  }

  public getWorldPosition(): Vector3 {
    const w = TrackMath.localToWorld(
      this.currentSegment.origin,
      this.currentSegment.direction,
      this.localZ,
      TrackMath.laneToOffset(this.smoothLane),
      this.y
    );
    return new Vector3(w.x, w.y, w.z);
  }

  public getAnimationState(isMenu: boolean, isGameOver: boolean): PlayerAnimState {
    if (isGameOver) return 'CRASH';
    if (isMenu) return 'IDLE';
    if (this.stumbleTimer > 0) return 'STUMBLE';
    if (!this.isGrounded) {
      if (this.doubleJumpUsed && this.vy > 0) return 'DOUBLE_JUMP';
      return this.vy >= 0 ? 'JUMP' : 'FALL';
    }
    if (this.isSliding) return 'SLIDE';
    if (this.landTimer > 0) return 'LAND';
    if (this.laneAnimTimer > 0 && this.laneAnimDir < 0) return 'LANE_LEFT';
    if (this.laneAnimTimer > 0 && this.laneAnimDir > 0) return 'LANE_RIGHT';
    return 'RUN';
  }
}

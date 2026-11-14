import {
  DefaultRenderingPipeline,
  Engine,
  Scene,
  SSAO2RenderingPipeline,
  Vector3,
} from '@babylonjs/core';
import { eventBus } from '../core/EventBus';
import { GameStateManager } from '../core/GameStateManager';
import { AudioManager } from '../audio/AudioManager';
import { CharacterMeshBuilder } from '../entities/CharacterMeshBuilder';
import { PlayerController } from '../entities/PlayerController';
import { CameraController } from '../entities/CameraController';
import { EnemyAI } from '../entities/EnemyAI';
import { EnvironmentManager } from '../world/EnvironmentManager';
import { ModelAssetLoader } from '../world/ModelAssetLoader';
import { ObstacleSystem } from '../world/ObstacleSystem';
import { PhysicsManager } from '../world/PhysicsManager';
import { ProceduralWorldGenerator } from '../world/ProceduralWorldGenerator';
import { SolvabilityValidator } from '../world/SolvabilityValidator';
import { TrackMath } from '../world/TrackMath';
import { PerformanceManager } from './PerformanceManager';
import { BIOME_ORDER, CHARACTERS } from '../data/gameCatalog';
import type { BiomeId, GameModeId, TrackSegmentData } from '../types/game.types';

export const BIOME_STAGE_DISTANCE = 220;

export class GameEngine {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly pipeline: DefaultRenderingPipeline | null = null;
  private readonly ssaoPipeline: SSAO2RenderingPipeline | null = null;
  private readonly modelLoader: ModelAssetLoader;
  private readonly envManager: EnvironmentManager;
  private readonly obstacleSystem: ObstacleSystem;
  private readonly physicsManager: PhysicsManager;
  private readonly worldGen: ProceduralWorldGenerator;
  private readonly character: CharacterMeshBuilder;
  private readonly player: PlayerController;
  private readonly cameraCtrl: CameraController;
  private readonly enemy: EnemyAI;
  private readonly perfManager: PerformanceManager;

  private activeBiome: BiomeId = 'jungle';
  private simTimeSec = 0;
  private chromaticPulse = 0;
  private swipeStart: { x: number; y: number } | null = null;
  private tiltCooldown = 0;
  private disposed = false;

  private readonly onKeyDownBound: (e: KeyboardEvent) => void;
  private readonly onTouchStartBound: (e: TouchEvent) => void;
  private readonly onTouchEndBound: (e: TouchEvent) => void;
  private readonly onDeviceOrientationBound: (e: DeviceOrientationEvent) => void;
  private readonly onResizeBound: () => void;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    public readonly stateManager: GameStateManager,
    public readonly audio: AudioManager
  ) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      powerPreference: 'high-performance',
    });

    this.scene = new Scene(this.engine);

    this.modelLoader = new ModelAssetLoader(this.scene);
    this.envManager = new EnvironmentManager(this.scene, this.modelLoader);
    this.obstacleSystem = new ObstacleSystem(this.scene, this.modelLoader);
    this.physicsManager = new PhysicsManager(this.scene);
    this.worldGen = new ProceduralWorldGenerator(
      this.scene,
      this.envManager,
      this.obstacleSystem,
      this.modelLoader
    );
    this.character = new CharacterMeshBuilder(this.scene, () => {
      this.envManager.registerShadowCaster(this.character.root);
    });
    this.player = new PlayerController();
    this.cameraCtrl = new CameraController(this.scene);
    this.enemy = new EnemyAI(this.scene);
    this.envManager.registerShadowCaster(this.character.root);
    this.envManager.registerShadowCaster(this.enemy.root);

    try {
      this.pipeline = new DefaultRenderingPipeline('defaultPipeline', true, this.scene, [
        this.cameraCtrl.camera,
      ]);
      this.pipeline.imageProcessingEnabled = true;
      this.pipeline.imageProcessing.toneMappingEnabled = true;
      this.pipeline.imageProcessing.toneMappingType = 1; // ACES
      this.pipeline.imageProcessing.contrast = 1.12;
      this.pipeline.imageProcessing.exposure = 1.04;
      this.pipeline.bloomEnabled = true;
      this.pipeline.bloomThreshold = 0.86;
      this.pipeline.bloomWeight = 0.18;
      this.pipeline.sharpenEnabled = true;
      this.pipeline.sharpen.edgeAmount = 0.24;
      this.pipeline.chromaticAberrationEnabled = true;
      this.pipeline.chromaticAberration.aberrationAmount = 0;
    } catch {
      this.pipeline = null;
    }

    this.envManager.initVolumetricLight(this.cameraCtrl.camera);

    try {
      if (SSAO2RenderingPipeline.IsSupported && this.engine.webGLVersion >= 2) {
        const ssao = new SSAO2RenderingPipeline(
          'ssaoPipeline',
          this.scene,
          { ssaoRatio: 0.75, blurRatio: 1.0 },
          [this.cameraCtrl.camera]
        );
        ssao.radius = 1.4;
        ssao.totalStrength = 0.38;
        ssao.samples = 12;
        ssao.maxZ = 90;
        this.ssaoPipeline = ssao;
      }
    } catch {
      this.ssaoPipeline = null;
    }

    this.perfManager = new PerformanceManager(this.engine, this.scene, this.pipeline);

    // Applica impostazioni salvate e precarica modelli 3D .glb in background
    this.syncSettingsAndCustomization();
    this.setupPreviewWorld();
    void this.modelLoader.preloadAll().then(() => {
      if (!this.disposed && this.stateManager.getState() === 'MENU') {
        this.setupPreviewWorld();
      }
    });

    // Eventi input e resize
    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onTouchStartBound = this.handleTouchStart.bind(this);
    this.onTouchEndBound = this.handleTouchEnd.bind(this);
    this.onDeviceOrientationBound = this.handleDeviceOrientation.bind(this);
    this.onResizeBound = () => this.engine.resize();

    window.addEventListener('keydown', this.onKeyDownBound);
    this.canvas.addEventListener('touchstart', this.onTouchStartBound, { passive: true });
    this.canvas.addEventListener('touchend', this.onTouchEndBound, { passive: true });
    window.addEventListener('deviceorientation', this.onDeviceOrientationBound);
    window.addEventListener('resize', this.onResizeBound);

    // Loop principale
    this.engine.runRenderLoop(() => {
      if (this.disposed) return;
      const rawDt = Math.min(0.05, this.engine.getDeltaTime() * 0.001);
      this.update(rawDt);
      this.scene.render();
    });
  }

  public syncSettingsAndCustomization(): void {
    const save = this.stateManager.saveManager.getData();
    this.audio.applySettings(save.settings);
    this.envManager.setQualityPreset(save.settings.qualityPreset);
    this.perfManager.applyPreset(save.settings.qualityPreset);

    const defChar = CHARACTERS.find((c) => c.id === save.selectedCharacter) ?? CHARACTERS[0];
    const charColor = save.characterCustomColors[save.selectedCharacter] ?? defChar.baseColor;
    this.character.applyCustomization(
      save.selectedCharacter,
      charColor,
      save.selectedAccessory,
      save.selectedTrail
    );
  }

  private setupPreviewWorld(): void {
    const save = this.stateManager.saveManager.getData();
    const previewBiome: BiomeId =
      save.selectedBiome === 'rotating' ? 'jungle' : save.selectedBiome;
    this.activeBiome = previewBiome;
    this.envManager.applyBiomeAtmosphere(previewBiome);
    const startSeg = this.worldGen.reset(
      this.stateManager.getRunRng(),
      previewBiome,
      save.selectedMode,
      0,
      (b) => this.stateManager.relics.getMissingFragmentForBiome(b)
    );
    this.player.reset(startSeg);
    this.character.root.position.copyFrom(this.player.getWorldPosition());
    this.enemy.root.setEnabled(false);
  }

  public startRun(customSeed?: string): void {
    this.audio.unlock();
    this.syncSettingsAndCustomization();
    this.physicsManager.clear();

    const telemetry = this.stateManager.startNewRun(customSeed);
    const save = this.stateManager.saveManager.getData();
    this.activeBiome = telemetry.currentBiome;
    this.envManager.applyBiomeAtmosphere(this.activeBiome);
    this.envManager.setTempestActive(false);

    const coinUpgradeChance = (save.upgrades.coin_value ?? 0) * 0.15;
    const startSeg = this.worldGen.reset(
      this.stateManager.getRunRng(),
      this.activeBiome,
      telemetry.mode,
      coinUpgradeChance,
      (b) => this.stateManager.relics.getMissingFragmentForBiome(b)
    );

    this.player.reset(startSeg);
    this.cameraCtrl.snapToPlayer(this.player.getWorldPosition(), this.player.currentYaw);
    this.enemy.reset(this.stateManager.relics.isRelicCompleted('relic_shadow'));
    this.simTimeSec = 0;

    eventBus.emit('biome:changed', { biome: this.activeBiome });
  }

  public pauseRun(): void {
    this.stateManager.pause();
  }

  public resumeRun(): void {
    this.audio.unlock();
    this.stateManager.resume();
  }

  public returnToMenu(): void {
    this.stateManager.returnToMenu();
    this.setupPreviewWorld();
  }

  public reviveRun(): boolean {
    if (!this.stateManager.reviveRun()) return false;

    const seg = this.player.currentSegment;
    for (const obs of seg.obstacles) {
      if (Math.abs(obs.localZ - this.player.localZ) < 4.5) {
        obs.destroyed = true;
      }
    }

    this.player.y = 0;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.player.isSliding = false;
    this.player.stumbleTimer = 0;
    if (this.player.localZ >= seg.length - 2) {
      this.player.localZ = Math.max(4, seg.length - 8);
    }

    this.enemy.onShieldPushback();
    this.character.setShieldVisual(true);
    this.character.triggerBurst('near_miss');
    eventBus.emit('audio:sfx', { sfx: 'powerup' });
    return true;
  }

  public triggerOverdrive(): boolean {
    if (!this.stateManager.consumeOverdrive()) return false;

    const seg = this.player.currentSegment;
    const playerWorldPos = this.player.getWorldPosition();
    for (const obs of seg.obstacles) {
      if (
        obs.type !== 'chasm_pit' &&
        obs.type !== 'broken_bridge' &&
        Math.abs(obs.localZ - this.player.localZ) < 9.0
      ) {
        obs.destroyed = true;
      }
    }

    this.physicsManager.spawnSmashDebris(
      playerWorldPos.add(new Vector3(0, 1, 0)),
      '#f97316',
      16
    );
    this.enemy.onShieldPushback();
    this.cameraCtrl.triggerBiomeWarp(0.85);
    this.cameraCtrl.triggerShake(0.28, 0.25);
    this.triggerChromaticPulse(24);
    this.character.triggerBurst('near_miss');
    eventBus.emit('audio:sfx', { sfx: 'powerup' });
    return true;
  }

  private update(dt: number): void {
    const state = this.stateManager.getState();
    const save = this.stateManager.saveManager.getData();

    const currentEvent = this.stateManager.dynamicEvents.getCurrentEvent();
    const isIntense = currentEvent?.type === 'intense_pursuit' || this.enemy.getThreatLevel() > 0.65;
    this.audio.setContextState(state, this.activeBiome, isIntense);

    if (state === 'MENU') {
      const previewBiome: BiomeId =
        save.selectedBiome === 'rotating' ? 'jungle' : save.selectedBiome;
      if (previewBiome !== this.activeBiome) {
        this.setupPreviewWorld();
      }
      const pos = this.player.getWorldPosition();
      this.character.root.position.set(pos.x + 0.54, pos.y, pos.z + 1.15);
      this.character.root.rotation.y = Math.PI * 0.88;
      this.character.setShieldVisual(false);
      this.character.updateAnimation('IDLE', dt, 0, save.selectedCelebration);
      this.cameraCtrl.updateMenu(dt, pos);
      this.envManager.update(dt, pos, 0);
      this.perfManager.sample(
        dt,
        this.worldGen.getActiveSegmentCount(),
        this.worldGen.getPooledCount()
      );
      return;
    }

    if (state === 'PAUSED') {
      return;
    }

    if (state === 'GAME_OVER') {
      const pos = this.player.getWorldPosition();
      this.character.updateAnimation('CRASH', dt, 0, save.selectedCelebration);
      this.enemy.update(dt, pos, this.player.currentYaw, false, false);
      this.cameraCtrl.updateMenu(dt, pos);
      this.physicsManager.update(dt);
      return;
    }

    // State === PLAYING or TUTORIAL
    const telemetry = this.stateManager.getTelemetry();
    const diff = this.stateManager.difficulty.evaluate(telemetry.distance, telemetry.mode);
    const powerFactor = this.stateManager.powerUps.getSpeedFactor();
    const forwardSpeed = diff.baseSpeed * powerFactor;
    const scaledDt = dt * (this.stateManager.powerUps.isActive('time_slow') ? 0.72 : 1.0);
    this.simTimeSec += scaledDt;

    // 1. Avanza giocatore
    const coinUpgradeChance = (save.upgrades.coin_value ?? 0) * 0.15;
    this.player.step(
      scaledDt,
      forwardSpeed,
      this.stateManager.powerUps.hasDoubleJump(),
      (id) => this.worldGen.getSegment(id),
      (forkId, branch) => this.worldGen.resolveFork(forkId, branch),
      {
        onLaneChanged: () => this.stateManager.registerLaneChange(),
        onJump: () => this.stateManager.registerJump(),
        onSlide: () => this.stateManager.registerSlide(),
        onTurnExecuted: (_branch, newSeg) => {
          this.stateManager.registerTurn();
          this.handleSegmentTransition(newSeg, telemetry.mode, coinUpgradeChance);
        },
        onEnteredNewSegment: (newSeg) => {
          this.handleSegmentTransition(newSeg, telemetry.mode, coinUpgradeChance);
        },
        onMissedTurn: () => {
          this.handleFatalImpact('Uscito fuori strada in curva!');
        },
      }
    );

    if (this.stateManager.getState() === 'GAME_OVER') return;

    const playerPos = this.player.getWorldPosition();

    // 2. Aggiorna animazioni ostacoli, monete e collezionabili
    const activeObs = this.worldGen.getAllActiveObstacles();
    this.obstacleSystem.updateAnimations(activeObs, this.simTimeSec, scaledDt, playerPos, () =>
      this.cameraCtrl.triggerShake(0.16, 0.15)
    );
    this.worldGen.updateCollectibleVisuals(this.simTimeSec, scaledDt);
    this.physicsManager.update(dt);

    // 3. Controllo collisioni ostacoli sul segmento corrente
    this.checkCurrentSegmentObstacles();
    if (this.stateManager.getState() === 'GAME_OVER') return;

    // 4. Raccolta monete (con Magnete), power-up e frammenti reliquia
    this.checkCollectibles(scaledDt);

    // 5. Eventi dinamici -> effetti visivi
    this.envManager.setTempestActive(currentEvent?.type === 'sudden_tempest');

    // 6. Aggiorna grafica giocatore, telecamera, nemico e ambiente
    this.character.root.position.copyFrom(playerPos);
    this.character.root.rotation.y = this.player.currentYaw;
    this.character.setShieldVisual(this.stateManager.powerUps.isActive('shield'));
    const animState = this.player.getAnimationState(false, false);
    this.character.updateAnimation(animState, dt, forwardSpeed, save.selectedCelebration);

    this.chromaticPulse = Math.max(0, this.chromaticPulse - dt * 55);
    if (this.pipeline?.chromaticAberration) {
      this.pipeline.chromaticAberration.aberrationAmount =
        (this.stateManager.powerUps.isActive('turbo') ? 10 : 0) + this.chromaticPulse;
    }

    this.cameraCtrl.updateGameplay(
      dt,
      playerPos,
      this.player.currentYaw,
      this.player.isSliding,
      this.stateManager.powerUps.isActive('turbo'),
      this.player.smoothLane,
      forwardSpeed
    );

    this.enemy.update(
      dt,
      playerPos,
      this.player.currentYaw,
      currentEvent?.type === 'intense_pursuit',
      true
    );

    this.envManager.update(dt, playerPos, this.player.currentYaw);

    // 7. Segnala svolte imminenti e aggiorna telemetria e progressione partita
    const activeSeg = this.player.currentSegment;
    const distToSegEnd = activeSeg.length - this.player.localZ;
    let upcomingTurn: 'left' | 'right' | 'fork' | null = null;
    if (distToSegEnd <= 14.5) {
      if (activeSeg.type === 'turn_left') upcomingTurn = 'left';
      else if (activeSeg.type === 'turn_right') upcomingTurn = 'right';
      else if (activeSeg.type === 'fork_t') upcomingTurn = 'fork';
    }
    this.stateManager.setUpcomingTurn(upcomingTurn);

    const endedByTimer = this.stateManager.stepRun(
      dt,
      this.activeBiome,
      forwardSpeed,
      this.enemy.getThreatLevel()
    );
    if (endedByTimer) return;

    this.worldGen.ensureAhead(
      activeSeg.id,
      this.stateManager.getRunRng(),
      (dist) => this.resolveBiomeForDistance(dist),
      telemetry.mode,
      coinUpgradeChance,
      (b) => this.stateManager.relics.getMissingFragmentForBiome(b),
      10,
      1
    );

    this.perfManager.sample(
      dt,
      this.worldGen.getActiveSegmentCount(),
      this.worldGen.getPooledCount()
    );
  }

  private handleSegmentTransition(
    newSeg: TrackSegmentData,
    mode: GameModeId,
    coinUpgradeChance: number
  ): void {
    if (newSeg.biome !== this.activeBiome) {
      const prevBiome = this.activeBiome;
      this.activeBiome = newSeg.biome;
      this.envManager.applyBiomeAtmosphere(newSeg.biome, false);
      this.cameraCtrl.triggerBiomeWarp(1.2);
      this.triggerChromaticPulse(22);
      this.character.triggerBurst('near_miss');
      eventBus.emit('audio:sfx', { sfx: 'level_up' });
      eventBus.emit('biome:changed', { biome: newSeg.biome, previousBiome: prevBiome });
    }
    this.worldGen.ensureAhead(
      newSeg.id,
      this.stateManager.getRunRng(),
      (dist) => this.resolveBiomeForDistance(dist),
      mode,
      coinUpgradeChance,
      (b) => this.stateManager.relics.getMissingFragmentForBiome(b),
      10,
      1
    );
    this.worldGen.recyclePassedSegments(newSeg.id);
  }

  private resolveBiomeForDistance(dist: number): BiomeId {
    const save = this.stateManager.saveManager.getData();
    if (save.selectedBiome !== 'rotating') {
      return save.selectedBiome;
    }
    const idx = Math.floor(dist / BIOME_STAGE_DISTANCE) % BIOME_ORDER.length;
    return BIOME_ORDER[idx] ?? 'jungle';
  }

  private triggerChromaticPulse(amount: number): void {
    this.chromaticPulse = Math.max(this.chromaticPulse, amount);
  }

  private checkCurrentSegmentObstacles(): void {
    const seg = this.player.currentSegment;
    const isInvuln = this.stateManager.powerUps.isInvulnerable();
    const playerWorldPos = this.player.getWorldPosition();

    for (const obs of seg.obstacles) {
      if (obs.destroyed) continue;

      // Conta ostacolo schivato + controllo Near-Miss quando il giocatore lo ha appena superato
      if (!obs.triggered && this.player.localZ > obs.localZ + 1.4) {
        obs.triggered = true;
        this.stateManager.registerObstacleDodged();

        if (obs.type !== 'narrow_path' && obs.type !== 'chasm_pit' && obs.type !== 'broken_bridge') {
          const covered = SolvabilityValidator.getCoveredLanes(obs.lane, obs.widthLanes);
          const minLaneDist = Math.min(...covered.map((l) => Math.abs(this.player.smoothLane - l)));
          const passedCloseLat =
            minLaneDist >= 0.52 && minLaneDist <= 1.25 && this.player.y < obs.height + 0.5;
          const clearedTightVert =
            minLaneDist < 0.52 &&
            ((obs.avoidMethod === 'JUMP' &&
              this.player.y >= obs.height - 0.15 &&
              this.player.y < obs.height + 0.85) ||
              (obs.avoidMethod === 'SLIDE' && this.player.isSliding));
          if (passedCloseLat || clearedTightVert) {
            this.stateManager.registerNearMiss();
            this.character.triggerBurst('near_miss');
            this.triggerChromaticPulse(18);
          }
        }
      }

      const outcome = ObstacleSystem.evaluateCollision(
        obs,
        {
          playerLane: this.player.smoothLane,
          playerY: this.player.y,
          playerLocalZ: this.player.localZ,
          isSliding: this.player.isSliding,
        },
        this.simTimeSec
      );

      if (!outcome.hit) continue;

      // Turbo distrugge qualsiasi ostacolo senza fermarsi
      if (isInvuln && obs.type !== 'chasm_pit' && obs.type !== 'broken_bridge') {
        obs.destroyed = true;
        this.physicsManager.spawnSmashDebris(playerWorldPos.add(new Vector3(0, 1, 0)), '#f97316', 12);
        this.cameraCtrl.triggerShake(0.22, 0.2);
        this.triggerChromaticPulse(14);
        continue;
      }

      // Scudo assorbe la collisione (tranne cadute nel vuoto)
      if (obs.type !== 'chasm_pit' && obs.type !== 'broken_bridge') {
        if (this.stateManager.powerUps.consumeShield()) {
          obs.destroyed = true;
          this.enemy.onShieldPushback();
          this.physicsManager.spawnSmashDebris(playerWorldPos.add(new Vector3(0, 1, 0)), '#34d399', 14);
          this.cameraCtrl.triggerShake(0.35, 0.28);
          this.triggerChromaticPulse(22);
          eventBus.emit('toast:message', {
            title: 'Scudo Infranto!',
            subtitle: 'Ostacolo distrutto e Guardiano respinto!',
            kind: 'info',
          });
          continue;
        }
      }

      if (!outcome.lethal) {
        obs.destroyed = true;
        this.player.triggerStumble();
        this.stateManager.registerStumble();
        this.cameraCtrl.triggerShake(0.32, 0.26);
        this.triggerChromaticPulse(26);
        eventBus.emit('audio:sfx', { sfx: 'stumble' });
        const caught = this.enemy.onPlayerStumble();
        if (caught) {
          this.handleFatalImpact('Catturato da Malakor dopo un inciampo!');
          return;
        }
      } else {
        const reason =
          obs.type === 'chasm_pit' || obs.type === 'broken_bridge'
            ? 'Caduto in un precipizio!'
            : 'Impatto fatale contro un ostacolo!';
        this.handleFatalImpact(reason);
        return;
      }
    }
  }

  private checkCollectibles(dt: number): void {
    const seg = this.player.currentSegment;
    const save = this.stateManager.saveManager.getData();
    const magnetRadius = this.stateManager.powerUps.getMagnetRadius(save);
    const magnetActive = this.stateManager.powerUps.isActive('magnet');
    const ren = this.worldGen.getRenderedSegment(seg.id);

    for (const coin of seg.coins) {
      if (coin.collected) continue;
      const dz = coin.localZ - this.player.localZ;
      const dx = TrackMath.laneToOffset(coin.lane) - TrackMath.laneToOffset(this.player.smoothLane);
      const dy = coin.localY - (this.player.y + 0.9);
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (magnetActive && dist < magnetRadius) {
        // Attira la moneta verso il giocatore
        const pull = Math.min(1, dt * 11);
        coin.localZ += (this.player.localZ - coin.localZ) * pull;
        coin.lane = (coin.lane + (this.player.smoothLane - coin.lane) * pull) as typeof coin.lane;
        coin.localY += (this.player.y + 0.9 - coin.localY) * pull;
        const mesh = ren?.coinMeshes.get(coin.id);
        if (mesh) {
          mesh.position.set(TrackMath.laneToOffset(coin.lane), coin.localY, coin.localZ);
        }
      }

      if (dist < 1.35) {
        coin.collected = true;
        this.stateManager.registerCoinCollected(coin.value);
        this.character.triggerBurst('coin');
      }
    }

    for (const pu of seg.powerUps) {
      if (pu.collected) continue;
      const dz = Math.abs(pu.localZ - this.player.localZ);
      const dx = Math.abs(TrackMath.laneToOffset(pu.lane) - TrackMath.laneToOffset(this.player.smoothLane));
      const dy = Math.abs(pu.localY - (this.player.y + 0.9));
      if (dz < 1.3 && dx < 1.25 && dy < 1.45) {
        pu.collected = true;
        this.stateManager.registerPowerUpCollected(pu.type);
        this.character.triggerBurst('coin');
      }
    }

    for (const rf of seg.relicFragments) {
      if (rf.collected) continue;
      const dz = Math.abs(rf.localZ - this.player.localZ);
      const dx = Math.abs(TrackMath.laneToOffset(rf.lane) - TrackMath.laneToOffset(this.player.smoothLane));
      if (dz < 1.45 && dx < 1.35) {
        rf.collected = true;
        this.stateManager.registerRelicFragmentCollected(rf.relicId, rf.fragmentIndex);
      }
    }
  }

  private handleFatalImpact(reason: string): void {
    this.enemy.triggerInstantCatch();
    this.cameraCtrl.triggerShake(0.55, 0.45);
    this.triggerChromaticPulse(38);
    eventBus.emit('audio:sfx', { sfx: 'crash' });
    this.stateManager.finishRun(reason);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.audio.unlock();
    const state = this.stateManager.getState();

    if (e.key === 'Escape') {
      if (state === 'PLAYING' || state === 'TUTORIAL') {
        this.pauseRun();
      } else if (state === 'PAUSED') {
        this.resumeRun();
      }
      return;
    }

    if (state !== 'PLAYING' && state !== 'TUTORIAL') return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.player.queueInput('left');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.player.queueInput('right');
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
      case ' ':
        e.preventDefault();
        this.player.queueInput('jump');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault();
        this.player.queueInput('slide');
        break;
      case 'e':
      case 'E':
      case 'Shift':
        this.triggerOverdrive();
        break;
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    this.audio.unlock();
    if (e.touches.length === 0) return;
    this.swipeStart = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }

  private handleTouchEnd(e: TouchEvent): void {
    const state = this.stateManager.getState();
    if ((state !== 'PLAYING' && state !== 'TUTORIAL') || !this.swipeStart) return;
    if (e.changedTouches.length === 0) return;

    const dx = e.changedTouches[0].clientX - this.swipeStart.x;
    const dy = e.changedTouches[0].clientY - this.swipeStart.y;
    this.swipeStart = null;

    const minDist = 26;
    if (Math.abs(dx) < minDist && Math.abs(dy) < minDist) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.player.queueInput(dx > 0 ? 'right' : 'left');
    } else {
      this.player.queueInput(dy < 0 ? 'jump' : 'slide');
    }
  }

  private handleDeviceOrientation(e: DeviceOrientationEvent): void {
    const save = this.stateManager.saveManager.getData();
    if (!save.settings.tiltControlsEnabled) return;
    const state = this.stateManager.getState();
    if (state !== 'PLAYING' && state !== 'TUTORIAL') return;
    if (e.gamma === null) return;

    const now = performance.now();
    if (now < this.tiltCooldown) return;

    if (e.gamma < -18) {
      this.player.queueInput('left');
      this.tiltCooldown = now + 450;
    } else if (e.gamma > 18) {
      this.player.queueInput('right');
      this.tiltCooldown = now + 450;
    }
  }

  public dispose(): void {
    this.disposed = true;
    window.removeEventListener('keydown', this.onKeyDownBound);
    this.canvas.removeEventListener('touchstart', this.onTouchStartBound);
    this.canvas.removeEventListener('touchend', this.onTouchEndBound);
    window.removeEventListener('deviceorientation', this.onDeviceOrientationBound);
    window.removeEventListener('resize', this.onResizeBound);

    this.character.dispose();
    this.enemy.dispose();
    this.physicsManager.clear();
    this.worldGen.dispose();
    this.obstacleSystem.dispose();
    this.envManager.dispose();
    this.modelLoader.dispose();
    this.ssaoPipeline?.dispose();
    this.pipeline?.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}

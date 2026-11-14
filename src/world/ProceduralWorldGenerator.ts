import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { BIOMES, POWERUP_INFO } from '../data/gameCatalog';
import { SeededRandom } from '../core/SeededRandom';
import { DynamicDifficultySystem } from '../systems/DynamicDifficultySystem';
import { SolvabilityValidator } from './SolvabilityValidator';
import { TRACK_WIDTH, TrackMath } from './TrackMath';
import { EnvironmentManager } from './EnvironmentManager';
import { ObstacleSystem, type ActiveObstacleInstance } from './ObstacleSystem';
import type { ModelAssetLoader } from './ModelAssetLoader';
import type {
  BiomeId,
  CoinPlacement,
  Direction,
  GameModeId,
  Lane,
  ObstacleAvoidMethod,
  ObstacleType,
  PowerUpType,
  SegmentType,
  TrackSegmentData,
} from '../types/game.types';

export interface RenderedSegment {
  data: TrackSegmentData;
  root: TransformNode;
  obstacles: ActiveObstacleInstance[];
  coinMeshes: Map<string, TransformNode>;
  powerUpMeshes: Map<string, TransformNode>;
  relicMeshes: Map<string, Mesh>;
}

const OBSTACLE_SPECS: Record<
  ObstacleType,
  { avoidMethod: ObstacleAvoidMethod; height: number; widthLanes: number }
> = {
  fallen_log: { avoidMethod: 'JUMP', height: 0.9, widthLanes: 1 },
  low_wall: { avoidMethod: 'JUMP', height: 1.15, widthLanes: 2 },
  low_arch: { avoidMethod: 'SLIDE', height: 1.45, widthLanes: 3 },
  chasm_pit: { avoidMethod: 'JUMP', height: 1.0, widthLanes: 3 },
  broken_bridge: { avoidMethod: 'JUMP', height: 1.0, widthLanes: 3 },
  collapsed_pillar: { avoidMethod: 'LANE', height: 2.8, widthLanes: 1 },
  rolling_boulder: { avoidMethod: 'LANE', height: 1.7, widthLanes: 1 },
  swinging_blade: { avoidMethod: 'TIMED', height: 2.6, widthLanes: 1 },
  pressure_trap: { avoidMethod: 'LANE', height: 1.15, widthLanes: 1 },
  fire_jet: { avoidMethod: 'TIMED', height: 2.2, widthLanes: 1 },
  crumbling_tile: { avoidMethod: 'LANE', height: 0.6, widthLanes: 1 },
  volcanic_rock: { avoidMethod: 'LANE', height: 2.2, widthLanes: 1 },
  moving_barrier: { avoidMethod: 'TIMED', height: 2.1, widthLanes: 1 },
  rotating_mechanism: { avoidMethod: 'JUMP', height: 1.1, widthLanes: 2 },
  narrow_path: { avoidMethod: 'LANE', height: 2.2, widthLanes: 2 },
};

const ALL_POWERUPS: PowerUpType[] = [
  'magnet',
  'shield',
  'turbo',
  'multiplier',
  'double_jump',
  'time_slow',
  'coin_bonus',
];

export class ProceduralWorldGenerator {
  private segments: Map<number, TrackSegmentData> = new Map();
  private rendered: Map<number, RenderedSegment> = new Map();
  private pooledCount = 0;
  private nextId = 1;
  private spineTailId: number | null = null;
  private generatedDistance = 0;
  private lastSegmentWasTurn = false;
  private lastObstacleExitGap = 999;

  private coinTex: Texture | null = null;
  private coinMat: StandardMaterial | null = null;
  private powerUpMats: Map<PowerUpType, StandardMaterial> = new Map();
  private relicMat: StandardMaterial | null = null;

  private readonly difficulty = new DynamicDifficultySystem();

  constructor(
    private readonly scene: Scene | null = null,
    private readonly envManager: EnvironmentManager | null = null,
    private readonly obstacleSystem: ObstacleSystem | null = null,
    private readonly modelLoader: ModelAssetLoader | null = null
  ) {
    if (this.scene) {
      this.initCollectibleMaterials(this.scene);
    }
  }

  private initCollectibleMaterials(scene: Scene): void {
    this.coinTex = new Texture('/assets/textures/ancient_gold_metal.jpg', scene, false, true);
    this.coinMat = new StandardMaterial('mat_coin', scene);
    this.coinMat.diffuseTexture = this.coinTex;
    this.coinMat.diffuseColor = new Color3(1.0, 0.86, 0.32);
    this.coinMat.emissiveColor = new Color3(0.2, 0.13, 0.01);
    this.coinMat.specularColor = new Color3(1.0, 0.96, 0.72);
    this.coinMat.specularPower = 96;

    for (const pType of ALL_POWERUPS) {
      const m = new StandardMaterial(`mat_pu_${pType}`, scene);
      const col = Color3.FromHexString(POWERUP_INFO[pType].color);
      m.diffuseColor = col;
      m.emissiveColor = col.scale(0.65);
      this.powerUpMats.set(pType, m);
    }

    this.relicMat = new StandardMaterial('mat_relic', scene);
    this.relicMat.diffuseColor = new Color3(0.3, 0.95, 0.85);
    this.relicMat.emissiveColor = new Color3(0.18, 0.65, 0.6);
  }

  public getActiveSegmentCount(): number {
    return this.segments.size;
  }

  public getPooledCount(): number {
    return this.pooledCount;
  }

  public getSegment(id: number): TrackSegmentData | undefined {
    return this.segments.get(id);
  }

  public getRenderedSegment(id: number): RenderedSegment | undefined {
    return this.rendered.get(id);
  }

  public getAllActiveObstacles(): ActiveObstacleInstance[] {
    const out: ActiveObstacleInstance[] = [];
    for (const r of this.rendered.values()) {
      out.push(...r.obstacles);
    }
    return out;
  }

  public reset(
    rng: SeededRandom,
    initialBiome: BiomeId,
    mode: GameModeId,
    coinBonusChance: number,
    missingRelicLookup: (b: BiomeId) => { relicId: string; fragmentIndex: number } | null
  ): TrackSegmentData {
    this.clearAll();
    this.nextId = 1;
    this.generatedDistance = 0;
    this.lastSegmentWasTurn = false;
    this.lastObstacleExitGap = 999;

    // Primo segmento sempre dritto, ampio e sicuro (zona partenza / inseguimento iniziale)
    const first = this.createSegmentData(
      'straight',
      initialBiome,
      { x: 0, y: 0, z: 0 },
      0,
      30,
      rng,
      mode,
      0,
      true,
      coinBonusChance,
      null
    );
    this.registerSegment(first);
    this.spineTailId = first.id;

    // Genera in anticipo 10 segmenti davanti al giocatore
    this.ensureAhead(
      first.id,
      rng,
      () => initialBiome,
      mode,
      coinBonusChance,
      missingRelicLookup
    );

    return first;
  }

  public ensureAhead(
    currentSegmentId: number,
    rng: SeededRandom,
    getBiomeForDistance: (dist: number) => BiomeId,
    mode: GameModeId,
    coinBonusChance: number,
    missingRelicLookup: (b: BiomeId) => { relicId: string; fragmentIndex: number } | null,
    targetAheadCount: number = 10,
    maxNewSegments: number = 99
  ): void {
    // Conta quanti segmenti esistono davanti a currentSegmentId lungo la spina
    let ahead = 0;
    let cursor = this.segments.get(currentSegmentId);
    while (cursor && cursor.nextSegmentId !== null) {
      ahead += 1;
      cursor = this.segments.get(cursor.nextSegmentId);
      if (ahead > 25) break;
    }

    let createdCount = 0;
    while (ahead < targetAheadCount && createdCount < maxNewSegments && this.spineTailId !== null) {
      const tail = this.segments.get(this.spineTailId);
      if (!tail) break;

      // Se la coda è un fork_t già biforcato, aspettiamo che il giocatore scelga il ramo
      if (tail.type === 'fork_t' && tail.nextSegmentId !== null && tail.altNextSegmentId !== null) {
        break;
      }

      const biome = getBiomeForDistance(this.generatedDistance);
      const isTransition = biome !== tail.biome;
      const diff = this.difficulty.evaluate(this.generatedDistance, mode);
      const segType = isTransition
        ? 'straight'
        : this.pickNextSegmentType(tail, rng, diff.turnProbability, diff.forkProbability);

      if (segType === 'fork_t') {
        const length = 26;
        const nextBiome = biome;
        const forkSeg = this.createSegmentData(
          'fork_t',
          nextBiome,
          TrackMath.getExitOrigin(tail.origin, tail.direction, tail.length, TRACK_WIDTH, 'straight').origin,
          tail.direction,
          length,
          rng,
          mode,
          diff.baseSpeed,
          false,
          coinBonusChance,
          null
        );
        tail.nextSegmentId = forkSeg.id;
        this.registerSegment(forkSeg);

        // Crea e pre-estende entrambi i rami del bivio (sinistra e destra) per azzerare i micro-lag alla svolta
        const leftExit = TrackMath.getExitOrigin(
          forkSeg.origin,
          forkSeg.direction,
          forkSeg.length,
          TRACK_WIDTH,
          'left'
        );
        const rightExit = TrackMath.getExitOrigin(
          forkSeg.origin,
          forkSeg.direction,
          forkSeg.length,
          TRACK_WIDTH,
          'right'
        );

        const leftSeg = this.createSegmentData(
          'straight',
          nextBiome,
          leftExit.origin,
          leftExit.direction,
          28,
          rng,
          mode,
          diff.baseSpeed,
          false,
          coinBonusChance,
          missingRelicLookup(nextBiome)
        );
        const rightSeg = this.createSegmentData(
          'bridge',
          nextBiome,
          rightExit.origin,
          rightExit.direction,
          28,
          rng,
          mode,
          diff.baseSpeed,
          false,
          coinBonusChance + 0.25,
          null
        );

        forkSeg.nextSegmentId = leftSeg.id;
        forkSeg.altNextSegmentId = rightSeg.id;
        this.registerSegment(leftSeg);
        this.registerSegment(rightSeg);

        this.generatedDistance += length + 28;
        let lTail = leftSeg;
        let rTail = rightSeg;
        for (let k = 0; k < 1; k++) {
          lTail = this.appendLinearSegment(
            lTail,
            'straight',
            'straight',
            rng,
            getBiomeForDistance,
            mode,
            coinBonusChance,
            missingRelicLookup,
            true
          );
          rTail = this.appendLinearSegment(
            rTail,
            'straight',
            'straight',
            rng,
            getBiomeForDistance,
            mode,
            coinBonusChance,
            missingRelicLookup,
            false
          );
        }

        this.spineTailId = forkSeg.id;
        this.lastSegmentWasTurn = true;
        ahead += 3;
        createdCount += 1;
        break;
      }

      let exitBranch: 'straight' | 'left' | 'right' = 'straight';
      if (tail.type === 'turn_left') exitBranch = 'left';
      else if (tail.type === 'turn_right') exitBranch = 'right';

      const nextSeg = this.appendLinearSegment(
        tail,
        segType,
        exitBranch,
        rng,
        getBiomeForDistance,
        mode,
        coinBonusChance,
        missingRelicLookup,
        true
      );
      this.spineTailId = nextSeg.id;
      this.lastSegmentWasTurn =
        nextSeg.type === 'turn_left' || nextSeg.type === 'turn_right';
      ahead += 1;
      createdCount += 1;
    }
  }

  private appendLinearSegment(
    tail: TrackSegmentData,
    requestedSegType: SegmentType,
    exitBranch: 'straight' | 'left' | 'right',
    rng: SeededRandom,
    getBiomeForDistance: (dist: number) => BiomeId,
    mode: GameModeId,
    coinBonusChance: number,
    missingRelicLookup: (b: BiomeId) => { relicId: string; fragmentIndex: number } | null,
    advanceDistance: boolean
  ): TrackSegmentData {
    const biome = getBiomeForDistance(this.generatedDistance);
    const isTransition = biome !== tail.biome;
    const diff = this.difficulty.evaluate(this.generatedDistance, mode);
    const segType: SegmentType = isTransition ? 'straight' : requestedSegType;

    const exit = TrackMath.getExitOrigin(
      tail.origin,
      tail.direction,
      tail.length,
      TRACK_WIDTH,
      exitBranch
    );

    const length = isTransition ? 28 : segType === 'narrow' ? 22 : rng.int(24, 30);
    const relicHint =
      this.generatedDistance > 180 && rng.chance(0.08)
        ? missingRelicLookup(biome)
        : null;

    const nextSeg = this.createSegmentData(
      segType,
      biome,
      exit.origin,
      exit.direction,
      length,
      rng,
      mode,
      diff.baseSpeed,
      false,
      coinBonusChance,
      relicHint
    );
    if (isTransition) {
      nextSeg.isBiomeTransition = true;
      nextSeg.previousBiome = tail.biome;
      nextSeg.obstacles = nextSeg.obstacles.filter((o) => o.localZ >= 11.5);
    }

    tail.nextSegmentId = nextSeg.id;
    this.registerSegment(nextSeg);
    if (advanceDistance) {
      this.generatedDistance += length;
    }
    return nextSeg;
  }

  /**
   * Quando il giocatore imbocca uno dei due rami di un bivio,
   * consolida il ramo scelto nella spina principale e ricicla l'intero ramo scartato.
   */
  public resolveFork(forkSegmentId: number, branch: 'left' | 'right'): TrackSegmentData | null {
    const forkSeg = this.segments.get(forkSegmentId);
    if (!forkSeg || forkSeg.type !== 'fork_t') return null;

    const chosenId = branch === 'left' ? forkSeg.nextSegmentId : forkSeg.altNextSegmentId;
    const discardedId = branch === 'left' ? forkSeg.altNextSegmentId : forkSeg.nextSegmentId;

    let discardCursor = discardedId;
    let discardGuard = 0;
    while (discardCursor !== null && discardGuard < 20) {
      const nextDiscardId = this.segments.get(discardCursor)?.nextSegmentId ?? null;
      this.disposeSegmentById(discardCursor);
      discardCursor = nextDiscardId;
      discardGuard += 1;
    }

    forkSeg.nextSegmentId = chosenId;
    forkSeg.altNextSegmentId = null;

    if (chosenId !== null) {
      let tailCursor: number = chosenId;
      let tailGuard = 0;
      while (tailGuard < 20) {
        const segNode = this.segments.get(tailCursor);
        if (!segNode || segNode.nextSegmentId === null) break;
        tailCursor = segNode.nextSegmentId;
        tailGuard += 1;
      }
      this.spineTailId = tailCursor;
      return this.segments.get(chosenId) ?? null;
    }
    return null;
  }

  public recyclePassedSegments(activeSegmentId: number): void {
    // Rimuove tutti i segmenti con id strettamente inferiore a activeSegmentId - 2
    // (preservando i segmenti collegati)
    const threshold = activeSegmentId - 2;
    for (const [id] of this.segments.entries()) {
      if (id < threshold) {
        this.disposeSegmentById(id);
      }
    }
  }

  public updateCollectibleVisuals(timeSec: number, dt: number): void {
    for (const seg of this.rendered.values()) {
      for (const [coinId, mesh] of seg.coinMeshes.entries()) {
        const coinData = seg.data.coins.find((c) => c.id === coinId);
        if (!coinData || coinData.collected) {
          mesh.setEnabled(false);
          continue;
        }
        mesh.rotation.y += dt * 3.5;
        mesh.rotation.z = Math.sin(timeSec * 2.5 + coinData.localZ) * 0.18;
        mesh.position.y = coinData.localY + Math.sin(timeSec * 4 + coinData.localZ) * 0.1;
      }

      for (const [puId, mesh] of seg.powerUpMeshes.entries()) {
        const puData = seg.data.powerUps.find((p) => p.id === puId);
        if (!puData || puData.collected) {
          mesh.setEnabled(false);
          continue;
        }
        mesh.rotation.y += dt * 2.4;
        mesh.rotation.x += dt * 1.4;
        mesh.position.y = puData.localY + Math.sin(timeSec * 3.2) * 0.16;
      }

      for (const [rfId, mesh] of seg.relicMeshes.entries()) {
        const rfData = seg.data.relicFragments.find((r) => r.id === rfId);
        if (!rfData || rfData.collected) {
          mesh.setEnabled(false);
          continue;
        }
        mesh.rotation.y += dt * 2.8;
        mesh.position.y = rfData.localY + Math.sin(timeSec * 3.5) * 0.2;
      }
    }
  }

  private pickNextSegmentType(
    prev: TrackSegmentData,
    rng: SeededRandom,
    turnProb: number,
    forkProb: number
  ): SegmentType {
    // Impedisci due curve consecutive o il ritorno indietro (-Z)
    const canTurn =
      prev.type !== 'turn_left' && prev.type !== 'turn_right' && prev.type !== 'fork_t';

    if (canTurn && this.generatedDistance > 80) {
      if (prev.direction === 0) {
        if (rng.chance(forkProb)) return 'fork_t';
        if (rng.chance(turnProb)) return rng.chance(0.5) ? 'turn_left' : 'turn_right';
      } else if (prev.direction === 3 && rng.chance(turnProb * 1.45)) {
        // Da -X torna a +Z svoltando a destra
        return 'turn_right';
      } else if (prev.direction === 1 && rng.chance(turnProb * 1.45)) {
        // Da +X torna a +Z svoltando a sinistra
        return 'turn_left';
      }
    }

    const roll = rng.next();
    if (roll < 0.45) return 'straight';
    if (roll < 0.65) return 'bridge';
    if (roll < 0.8) return 'tunnel';
    if (roll < 0.92) return 'elevated';
    return 'narrow';
  }

  private createSegmentData(
    type: SegmentType,
    biome: BiomeId,
    origin: { x: number; y: number; z: number },
    direction: Direction,
    length: number,
    rng: SeededRandom,
    mode: GameModeId,
    expectedSpeed: number,
    isSafeStart: boolean,
    coinBonusChance: number,
    relicHint: { relicId: string; fragmentIndex: number } | null
  ): TrackSegmentData {
    const id = this.nextId++;
    const seg: TrackSegmentData = {
      id,
      type,
      biome,
      origin,
      direction,
      length,
      width: type === 'narrow' ? 2.6 : TRACK_WIDTH,
      elevation: origin.y,
      obstacles: [],
      coins: [],
      powerUps: [],
      relicFragments: [],
      nextSegmentId: null,
      altNextSegmentId: null,
      turnDir: type === 'turn_left' ? 'left' : type === 'turn_right' ? 'right' : undefined,
    };

    if (!isSafeStart) {
      this.populateObstacles(seg, rng, mode, expectedSpeed);
    }

    this.populateCollectibles(seg, rng, mode, isSafeStart, coinBonusChance, relicHint);
    return seg;
  }

  private populateObstacles(
    seg: TrackSegmentData,
    rng: SeededRandom,
    mode: GameModeId,
    expectedSpeed: number
  ): void {
    const diff = this.difficulty.evaluate(this.generatedDistance, mode);
    const biomeSigs = BIOMES[seg.biome].signatureObstacles;
    const generalPool: ObstacleType[] = [
      'fallen_log',
      'low_wall',
      'low_arch',
      'collapsed_pillar',
      'moving_barrier',
      'rotating_mechanism',
      'pressure_trap',
    ];

    if (seg.type === 'narrow') {
      seg.obstacles.push({
        id: `obs_${seg.id}_narrow`,
        type: 'narrow_path',
        lane: 0,
        localZ: seg.length * 0.45,
        widthLanes: 2,
        avoidMethod: 'LANE',
        height: 2.2,
        clearanceBottomY: 0,
      });
    } else {
      const slotCount = seg.length >= 26 ? 2 : 1;
      for (let i = 0; i < slotCount; i++) {
        if (!rng.chance(diff.obstacleDensity + 0.25)) continue;

        const z = 6.5 + i * 11.5 + rng.range(0, 1.2);
        const pool = rng.chance(0.62) ? biomeSigs : generalPool;
        let obsType = rng.pick(pool);

        // Nei tunnel evita fosse o massi giganti che coprono la visuale alta
        if (seg.type === 'tunnel' && (obsType === 'chasm_pit' || obsType === 'broken_bridge')) {
          obsType = 'low_arch';
        }
        if (seg.type === 'turn_left' || seg.type === 'turn_right' || seg.type === 'fork_t') {
          if (obsType === 'chasm_pit' || obsType === 'broken_bridge') {
            obsType = 'low_wall';
          }
        }

        const spec = OBSTACLE_SPECS[obsType];
        const lane: Lane =
          spec.widthLanes === 3 ? 0 : rng.pick([-1, 0, 1] as const);

        seg.obstacles.push({
          id: `obs_${seg.id}_${i}`,
          type: obsType,
          lane,
          localZ: z,
          widthLanes: spec.widthLanes,
          avoidMethod: spec.avoidMethod,
          height: spec.height,
          clearanceBottomY: obsType === 'low_arch' ? 1.35 : 0,
          dynamicPhase: rng.range(0, Math.PI * 2),
          dynamicSpeed: rng.range(1.6, 2.5),
        });
      }
    }

    SolvabilityValidator.validateAndAdjust(
      seg,
      expectedSpeed,
      this.lastSegmentWasTurn,
      this.lastObstacleExitGap
    );

    if (seg.obstacles.length > 0) {
      const lastZ = Math.max(...seg.obstacles.map((o) => o.localZ));
      this.lastObstacleExitGap = seg.length - lastZ;
    } else {
      this.lastObstacleExitGap += seg.length;
    }
  }

  private populateCollectibles(
    seg: TrackSegmentData,
    rng: SeededRandom,
    mode: GameModeId,
    isSafeStart: boolean,
    coinBonusChance: number,
    relicHint: { relicId: string; fragmentIndex: number } | null
  ): void {
    const coinMultiplier = mode === 'coin_rush' ? 2.2 : 1;
    const lane: Lane = seg.type === 'narrow' ? 0 : rng.pick([-1, 0, 1] as const);

    const startZ = isSafeStart ? 10 : 4;
    const endZ =
      seg.type === 'turn_left' || seg.type === 'turn_right' || seg.type === 'fork_t'
        ? seg.length - 8
        : seg.length - 3;

    const count = Math.max(3, Math.floor(((endZ - startZ) / 2.8) * coinMultiplier));
    const step = (endZ - startZ) / count;

    for (let i = 0; i < count; i++) {
      const z = startZ + i * step;
      // Se c'è un ostacolo saltabile vicino, crea un arco di monete sopra di esso!
      const obsNear = seg.obstacles.find((o) => Math.abs(o.localZ - z) < 1.8);
      const localY = obsNear && obsNear.avoidMethod === 'JUMP' ? 1.85 : 0.75;
      const coinLane: Lane = obsNear && obsNear.avoidMethod === 'LANE' ? ((lane === 0 ? 1 : 0) as Lane) : lane;
      const value = rng.chance(coinBonusChance) ? 2 : 1;

      seg.coins.push({
        id: `c_${seg.id}_${i}`,
        lane: coinLane,
        localZ: z,
        localY,
        collected: false,
        value,
      });
    }

    // Power-up spawn (disabilitati in Sfida Pura; niente Shield/Turbo in Sopravvivenza)
    if (!isSafeStart && mode !== 'no_powerups' && rng.chance(0.28)) {
      const available =
        mode === 'survival'
          ? ALL_POWERUPS.filter((p) => p !== 'shield' && p !== 'turbo')
          : ALL_POWERUPS;
      const puType = rng.pick(available);
      const puLane: Lane = seg.type === 'narrow' ? 0 : rng.pick([-1, 0, 1] as const);

      seg.powerUps.push({
        id: `pu_${seg.id}`,
        type: puType,
        lane: puLane,
        localZ: seg.length * 0.5,
        localY: 1.05,
        collected: false,
      });
    }

    // Frammento Reliquia se mancante in questo bioma
    if (relicHint) {
      seg.relicFragments.push({
        id: `rel_${seg.id}`,
        relicId: relicHint.relicId,
        fragmentIndex: relicHint.fragmentIndex,
        lane: 0,
        localZ: seg.length * 0.65,
        localY: 1.2,
        collected: false,
      });
    }
  }

  private registerSegment(seg: TrackSegmentData): void {
    this.segments.set(seg.id, seg);

    if (!this.scene || !this.envManager || !this.obstacleSystem) return;

    const root = new TransformNode(`seg_root_${seg.id}`, this.scene);
    root.position.set(seg.origin.x, seg.origin.y, seg.origin.z);
    root.rotation.y = TrackMath.getYaw(seg.direction);

    this.envManager.buildSegmentEnvironment(seg, root);
    const obstacles = this.obstacleSystem.buildObstaclesForSegment(seg, root);

    const coinMeshes = new Map<string, TransformNode>();
    for (const c of seg.coins) {
      let coinNode: TransformNode | null = null;
      if (this.modelLoader?.isReady('relic_coin')) {
        coinNode = this.modelLoader.instantiate('relic_coin', c.id, root);
      }
      if (coinNode) {
        const s = c.value > 1 ? 1.25 : 1.0;
        coinNode.scaling.setAll(s);
        coinNode.position.set(TrackMath.laneToOffset(c.lane), c.localY, c.localZ);
      } else {
        const coinMesh = MeshBuilder.CreateCylinder(
          c.id,
          { height: 0.12, diameter: c.value > 1 ? 0.84 : 0.66, tessellation: 24 },
          this.scene
        );
        coinMesh.rotation.x = Math.PI / 2;
        coinMesh.bakeCurrentTransformIntoVertices();
        coinMesh.position.set(TrackMath.laneToOffset(c.lane), c.localY, c.localZ);
        coinMesh.material = this.coinMat;
        coinMesh.isPickable = false;
        coinMesh.parent = root;
        coinNode = coinMesh;
      }
      coinMeshes.set(c.id, coinNode);
    }

    const powerUpMeshes = new Map<string, TransformNode>();
    for (const pu of seg.powerUps) {
      const puMat = this.powerUpMats.get(pu.type) ?? this.coinMat;
      let puNode: TransformNode | null = null;
      if (this.modelLoader?.isReady('powerup_core')) {
        puNode = this.modelLoader.instantiate('powerup_core', pu.id, root);
      }
      if (puNode) {
        puNode.scaling.setAll(1.15);
        puNode.position.set(TrackMath.laneToOffset(pu.lane), pu.localY, pu.localZ);
      } else {
        const puMesh = MeshBuilder.CreateSphere(
          pu.id,
          { diameter: 0.72, segments: 18 },
          this.scene
        );
        puMesh.position.set(TrackMath.laneToOffset(pu.lane), pu.localY, pu.localZ);
        puMesh.material = puMat;
        puMesh.isPickable = false;
        puMesh.parent = root;
        puNode = puMesh;
      }

      const puRing = MeshBuilder.CreateTorus(
        `${pu.id}_ring`,
        { diameter: 1.05, thickness: 0.08, tessellation: 24 },
        this.scene
      );
      puRing.rotation.x = Math.PI / 4;
      puRing.material = puMat;
      puRing.isPickable = false;
      puRing.parent = puNode;

      powerUpMeshes.set(pu.id, puNode);
    }

    const relicMeshes = new Map<string, Mesh>();
    for (const rf of seg.relicFragments) {
      const rfMesh = MeshBuilder.CreateSphere(
        rf.id,
        { diameter: 0.84, segments: 20 },
        this.scene
      );
      rfMesh.position.set(TrackMath.laneToOffset(rf.lane), rf.localY, rf.localZ);
      rfMesh.material = this.relicMat;
      rfMesh.isPickable = false;
      rfMesh.parent = root;

      const ringA = MeshBuilder.CreateTorus(
        `${rf.id}_r1`,
        { diameter: 1.15, thickness: 0.065, tessellation: 24 },
        this.scene
      );
      ringA.rotation.x = Math.PI / 3;
      ringA.material = this.coinMat;
      ringA.isPickable = false;
      ringA.parent = rfMesh;

      const ringB = MeshBuilder.CreateTorus(
        `${rf.id}_r2`,
        { diameter: 1.15, thickness: 0.065, tessellation: 24 },
        this.scene
      );
      ringB.rotation.z = Math.PI / 3;
      ringB.material = this.relicMat;
      ringB.isPickable = false;
      ringB.parent = rfMesh;

      relicMeshes.set(rf.id, rfMesh);
    }

    this.rendered.set(seg.id, {
      data: seg,
      root,
      obstacles,
      coinMeshes,
      powerUpMeshes,
      relicMeshes,
    });
  }

  private disposeSegmentById(id: number): void {
    this.segments.delete(id);
    const ren = this.rendered.get(id);
    if (ren) {
      ren.root.dispose(false, false);
      this.rendered.delete(id);
      this.pooledCount += 1;
    }
  }

  public getCoinWorldPosition(seg: TrackSegmentData, coin: CoinPlacement): Vector3 {
    const w = TrackMath.localToWorld(
      seg.origin,
      seg.direction,
      coin.localZ,
      TrackMath.laneToOffset(coin.lane),
      coin.localY
    );
    return new Vector3(w.x, w.y, w.z);
  }

  public clearAll(): void {
    for (const ren of this.rendered.values()) {
      ren.root.dispose(false, false);
    }
    this.rendered.clear();
    this.segments.clear();
    this.spineTailId = null;
  }

  public dispose(): void {
    this.clearAll();
    this.coinTex?.dispose();
    this.coinMat?.dispose();
    this.relicMat?.dispose();
    for (const m of this.powerUpMats.values()) {
      m.dispose();
    }
    this.powerUpMats.clear();
  }
}

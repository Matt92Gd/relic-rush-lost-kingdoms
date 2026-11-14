import { beforeEach, describe, expect, it } from 'vitest';
import { Color3, NullEngine, Scene, TransformNode, Vector3, VertexBuffer } from '@babylonjs/core';
import { SeededRandom } from '../core/SeededRandom';
import { eventBus } from '../core/EventBus';
import { GameStateManager, type RunSummaryResult } from '../core/GameStateManager';
import { BIOME_ORDER, BIOMES } from '../data/gameCatalog';
import { TrackMath } from '../world/TrackMath';
import { SolvabilityValidator } from '../world/SolvabilityValidator';
import { ProceduralWorldGenerator } from '../world/ProceduralWorldGenerator';
import { ObstacleSystem } from '../world/ObstacleSystem';
import { EnvironmentManager } from '../world/EnvironmentManager';
import { PlayerController } from '../entities/PlayerController';
import { PowerUpSystem } from '../systems/PowerUpSystem';
import {
  SaveManager,
  STORAGE_KEY,
  ACTIVE_RUN_KEY,
  createDefaultSaveData,
  migrateAndValidateSave,
} from '../systems/SaveManager';
import type { BiomeId, Lane, ObstaclePlacement, ObstacleType, TrackSegmentData } from '../types/game.types';

describe('RELIC RUSH: LOST KINGDOMS — Test Suite Completa', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('SeededRandom è perfettamente deterministico per lo stesso seed', () => {
    const a = new SeededRandom('DAILY-2026-11-14');
    const b = new SeededRandom('DAILY-2026-11-14');
    const seqA = Array.from({ length: 15 }, () => a.next());
    const seqB = Array.from({ length: 15 }, () => b.next());
    expect(seqA).toEqual(seqB);

    const daily = SeededRandom.getDailySeed(new Date(Date.UTC(2026, 10, 14)));
    expect(daily).toBe('DAILY-2026-11-14');
  });

  it('TrackMath calcola allineamenti bordo-bordo per curve e bivi a 90°', () => {
    const straightExit = TrackMath.getExitOrigin({ x: 0, y: 0, z: 0 }, 0, 24, 6, 'straight');
    expect(straightExit.origin).toEqual({ x: 0, y: 0, z: 24 });
    expect(straightExit.direction).toBe(0);

    const rightExit = TrackMath.getExitOrigin({ x: 0, y: 0, z: 0 }, 0, 24, 6, 'right');
    expect(rightExit.origin).toEqual({ x: 3, y: 0, z: 21 });
    expect(rightExit.direction).toBe(1);

    const leftExit = TrackMath.getExitOrigin({ x: 0, y: 0, z: 0 }, 0, 24, 6, 'left');
    expect(leftExit.origin).toEqual({ x: -3, y: 0, z: 21 });
    expect(leftExit.direction).toBe(3);
  });

  it('SolvabilityValidator rimuove configurazioni impossibili e preserva percorsi validi', () => {
    const seg: TrackSegmentData = {
      id: 1,
      type: 'turn_right',
      biome: 'jungle',
      origin: { x: 0, y: 0, z: 0 },
      direction: 0,
      length: 26,
      width: 6,
      elevation: 0,
      obstacles: [
        // 3 pilastri simultanei in tutte e 3 le corsie -> impossibile!
        { id: 'o1', type: 'collapsed_pillar', lane: -1, localZ: 10, widthLanes: 1, avoidMethod: 'LANE', height: 2.8, clearanceBottomY: 0 },
        { id: 'o2', type: 'collapsed_pillar', lane: 0, localZ: 10.5, widthLanes: 1, avoidMethod: 'LANE', height: 2.8, clearanceBottomY: 0 },
        { id: 'o3', type: 'collapsed_pillar', lane: 1, localZ: 11, widthLanes: 1, avoidMethod: 'LANE', height: 2.8, clearanceBottomY: 0 },
        // Ostacolo nella zona di curva finale -> va rimosso!
        { id: 'o4', type: 'low_wall', lane: 0, localZ: 22, widthLanes: 2, avoidMethod: 'JUMP', height: 1.15, clearanceBottomY: 0 },
      ],
      coins: [],
      powerUps: [],
      relicFragments: [],
      nextSegmentId: null,
      altNextSegmentId: null,
    };

    const report = SolvabilityValidator.validateAndAdjust(seg, 24, false);
    expect(report.valid).toBe(true);
    expect(report.removedCount).toBeGreaterThanOrEqual(2);
    expect(seg.obstacles.some((o) => o.localZ > seg.length - 10)).toBe(false);
    expect(SolvabilityValidator.isSegmentSolvable(seg, 24)).toBe(true);
  });

  it('ProceduralWorldGenerator genera 120 segmenti validi e superabili con bivi e riciclo', () => {
    const gen = new ProceduralWorldGenerator(null, null, null);
    const rng = new SeededRandom('WORLD-TEST-SEED');
    let cur = gen.reset(rng, 'jungle', 'endless', 0.1, () => null);

    let visited = 0;
    while (visited < 120) {
      expect(SolvabilityValidator.isSegmentSolvable(cur, 28)).toBe(true);
      if (cur.type === 'fork_t') {
        cur = gen.resolveFork(cur.id, visited % 2 === 0 ? 'left' : 'right')!;
      } else if (cur.nextSegmentId !== null) {
        cur = gen.getSegment(cur.nextSegmentId)!;
      }
      expect(cur).toBeDefined();
      gen.ensureAhead(cur.id, rng, () => 'volcano', 'endless', 0.1, () => null, 10);
      gen.recyclePassedSegments(cur.id);
      visited += 1;
    }

    expect(gen.getActiveSegmentCount()).toBeLessThan(25);
  });

  it('PlayerController gestisce corsie, salto, doppio salto, scivolata, input buffer e svolte 90°', () => {
    const player = new PlayerController();
    const seg1: TrackSegmentData = {
      id: 1,
      type: 'turn_right',
      biome: 'jungle',
      origin: { x: 0, y: 0, z: 0 },
      direction: 0,
      length: 24,
      width: 6,
      elevation: 0,
      obstacles: [],
      coins: [],
      powerUps: [],
      relicFragments: [],
      nextSegmentId: 2,
      altNextSegmentId: null,
      turnDir: 'right',
    };
    const seg2: TrackSegmentData = {
      id: 2,
      type: 'straight',
      biome: 'jungle',
      origin: { x: 3, y: 0, z: 21 },
      direction: 1,
      length: 26,
      width: 6,
      elevation: 0,
      obstacles: [],
      coins: [],
      powerUps: [],
      relicFragments: [],
      nextSegmentId: null,
      altNextSegmentId: null,
    };
    const lookup = (id: number) => (id === 1 ? seg1 : id === 2 ? seg2 : undefined);
    player.reset(seg1);

    // Cambio corsia
    player.queueInput('left', 100);
    player.step(0.05, 16, false, lookup, () => null, {}, 100);
    expect(player.currentLane).toBe(-1);

    // Salto e doppio salto
    player.queueInput('jump', 200);
    player.step(0.05, 16, true, lookup, () => null, {}, 200);
    expect(player.isGrounded).toBe(false);
    expect(player.y).toBeGreaterThan(0);

    player.queueInput('jump', 260);
    player.step(0.05, 16, true, lookup, () => null, {}, 260);
    expect(player.doubleJumpUsed).toBe(true);

    // Scivolata (fast-fall e poi slide a terra)
    player.queueInput('slide', 320);
    player.step(0.05, 16, true, lookup, () => null, {}, 320);
    expect(player.isSliding).toBe(true);

    // Svolta a 90° in curva
    player.localZ = 18.5;
    let turned = false;
    player.queueInput('right', 400);
    player.step(
      0.05,
      16,
      true,
      lookup,
      () => null,
      { onTurnExecuted: () => { turned = true; } },
      400
    );
    expect(turned).toBe(true);
    expect(player.currentSegment.id).toBe(2);
  });

  it('ObstacleSystem.evaluateCollision distingue salto, scivolata, inciampo e impatto letale', () => {
    const lowWall: ObstaclePlacement = {
      id: 'w1',
      type: 'low_wall',
      lane: 0,
      localZ: 10,
      widthLanes: 1,
      avoidMethod: 'JUMP',
      height: 1.15,
      clearanceBottomY: 0,
    };
    expect(
      ObstacleSystem.evaluateCollision(lowWall, {
        playerLane: 0,
        playerY: 0,
        playerLocalZ: 10,
        isSliding: false,
      }).lethal
    ).toBe(true);
    expect(
      ObstacleSystem.evaluateCollision(lowWall, {
        playerLane: 0,
        playerY: 1.3,
        playerLocalZ: 10,
        isSliding: false,
      }).hit
    ).toBe(false);

    const lowArch: ObstaclePlacement = {
      id: 'a1',
      type: 'low_arch',
      lane: 0,
      localZ: 12,
      widthLanes: 3,
      avoidMethod: 'SLIDE',
      height: 1.45,
      clearanceBottomY: 1.35,
    };
    expect(
      ObstacleSystem.evaluateCollision(lowArch, {
        playerLane: 0,
        playerY: 0,
        playerLocalZ: 12,
        isSliding: false,
      }).hit
    ).toBe(true);
    expect(
      ObstacleSystem.evaluateCollision(lowArch, {
        playerLane: 0,
        playerY: 0,
        playerLocalZ: 12,
        isSliding: true,
      }).hit
    ).toBe(false);

    const log: ObstaclePlacement = {
      id: 'l1',
      type: 'fallen_log',
      lane: 1,
      localZ: 14,
      widthLanes: 1,
      avoidMethod: 'JUMP',
      height: 0.9,
      clearanceBottomY: 0,
    };
    const logOutcome = ObstacleSystem.evaluateCollision(log, {
      playerLane: 1,
      playerY: 0,
      playerLocalZ: 14,
      isSliding: false,
    });
    expect(logOutcome.hit).toBe(true);
    expect(logOutcome.lethal).toBe(false); // Inciampo recuperabile
  });

  it('PowerUpSystem gestisce attivazione, durate, scudo e moltiplicatori', () => {
    const save = createDefaultSaveData();
    save.upgrades.starting_shield = 2;
    save.upgrades.powerup_duration = 1;

    const pu = new PowerUpSystem();
    pu.reset(save);
    // Scudo iniziale automatico al liv.2+
    expect(pu.isActive('shield')).toBe(true);
    expect(pu.consumeShield()).toBe(true);
    expect(pu.isActive('shield')).toBe(false);

    pu.activate('multiplier', save, false);
    pu.activate('coin_bonus', save, false);
    pu.activate('double_jump', save, false);
    expect(pu.getScoreMultiplierFactor()).toBe(2);
    expect(pu.getCoinValueMultiplier()).toBe(3);
    expect(pu.hasDoubleJump()).toBe(true);

    pu.update(5);
    expect(pu.isActive('multiplier')).toBe(true);
  });

  it('SaveManager gestisce migrazione v1->v2, dati corrotti, export/import e partite interrotte', () => {
    const migrated = migrateAndValidateSave({
      version: 1,
      coins: 450,
      gems: 9,
      level: 4,
      unlockedBiomes: ['volcano'],
      stats: { bestScore: -99, totalRuns: 'corrupted' },
    });
    expect(migrated.version).toBe(2);
    expect(migrated.crystals).toBe(9);
    expect(migrated.unlockedBiomes).toContain('jungle');
    expect(migrated.unlockedBiomes).toContain('volcano');
    expect(migrated.stats.bestScore).toBe(0);

    // Salvataggio corrotto in localStorage
    window.localStorage.setItem(STORAGE_KEY, '{INVALID_JSON!!!');
    window.localStorage.setItem(ACTIVE_RUN_KEY, '1');
    const sm = new SaveManager();
    expect(sm.getData().version).toBe(2);

    sm.getData().coins = 777;
    sm.save();
    const exported = sm.exportSave();
    sm.resetSave();
    expect(sm.getData().coins).toBe(0);
    expect(sm.importSave(exported)).toBe(true);
    expect(sm.getData().coins).toBe(777);
  });

  it('GameStateManager esegue il ciclo completo di partita, economia, missioni, reliquie e achievement', () => {
    const gsm = new GameStateManager();
    gsm.economy.addCoins(500);
    expect(gsm.economy.purchaseUpgrade('magnet_duration')).toBe(true);
    expect(gsm.economy.getUpgradeLevel('magnet_duration')).toBe(1);

    const daily1 = gsm.economy.claimDailyReward('2026-11-14');
    const daily2 = gsm.economy.claimDailyReward('2026-11-14');
    expect(daily1).not.toBeNull();
    expect(daily2).toBeNull(); // Nessuna duplicazione nello stesso giorno!

    gsm.startNewRun('TEST-RUN-SEED');
    expect(gsm.getState()).toBe('TUTORIAL');

    gsm.pause();
    expect(gsm.getState()).toBe('PAUSED');
    gsm.resume();
    expect(gsm.getState()).toBe('TUTORIAL');

    // Simula corsa intensa
    for (let i = 0; i < 60; i++) {
      gsm.stepRun(0.5, 'jungle', 20, 0.25);
    }
    gsm.registerCoinCollected(5);
    gsm.registerJump();
    gsm.registerSlide();
    gsm.registerRelicFragmentCollected('relic_jungle', 0);
    gsm.registerRelicFragmentCollected('relic_jungle', 1);
    gsm.registerRelicFragmentCollected('relic_jungle', 2);
    expect(gsm.relics.isRelicCompleted('relic_jungle')).toBe(true);

    const summary = gsm.finishRun('Test completato');
    expect(gsm.getState()).toBe('GAME_OVER');
    expect(summary.telemetry.distance).toBeGreaterThanOrEqual(500);
    expect(summary.unlockedAchievements.some((a) => a.id === 'dist_250')).toBe(true);
    expect(summary.unlockedAchievements.some((a) => a.id === 'relic_first')).toBe(true);

    // Riscossione missione completata senza duplicazione
    const claimable = gsm.saveManager.getData().missions.find((m) => m.completed && !m.claimed);
    if (claimable) {
      expect(gsm.missions.claimMission(claimable.id)).toBe(true);
      expect(gsm.missions.claimMission(claimable.id)).toBe(false);
    }
  });

  it('finishRun popola getLastSummary prima di emettere GAME_OVER e returnToMenu riporta allo stato MENU', () => {
    const gsm = new GameStateManager();
    gsm.startNewRun('GAMEOVER-FLOW-SEED');

    let observedSummaryOnEvent: RunSummaryResult | null = null;
    const unsub = eventBus.on('state:changed', ({ state }) => {
      if (state === 'GAME_OVER') {
        observedSummaryOnEvent = gsm.getLastSummary();
      }
    });

    gsm.finishRun('Impatto fatale di test!');
    unsub();

    expect(observedSummaryOnEvent).not.toBeNull();
    const captured = observedSummaryOnEvent as RunSummaryResult | null;
    expect(captured?.telemetry.deathReason).toBe('Impatto fatale di test!');

    gsm.returnToMenu();
    expect(gsm.getState()).toBe('MENU');
  });

  it('GameStateManager gestisce coinStreak, registerNearMiss e gli eventi popup juice:popup', () => {
    const gsm = new GameStateManager();
    gsm.startNewRun('JUICE-TEST-SEED');

    const popups: Array<{ text: string; subtext?: string }> = [];
    const unsub = eventBus.on('juice:popup', (payload) => {
      popups.push({ text: payload.text, subtext: payload.subtext });
    });

    for (let i = 0; i < 10; i++) {
      gsm.registerCoinCollected(1);
    }
    expect(gsm.getTelemetry().coinStreak).toBe(10);
    expect(popups.some((p) => p.text === 'SERIE MONETE x10!')).toBe(true);

    const scoreBeforeNearMiss = gsm.getTelemetry().score;
    gsm.registerNearMiss();
    unsub();

    expect(gsm.getTelemetry().nearMisses).toBe(1);
    expect(gsm.getTelemetry().score).toBeGreaterThan(scoreBeforeNearMiss);
    expect(popups.some((p) => p.text === 'SFIORATO!')).toBe(true);
  });

  it('Svolta a 90° in volo aggiorna la fisica verticale, limita smoothLane e lascia liberi gli ultimi 12.5m', () => {
    const seg1: TrackSegmentData = {
      id: 1,
      type: 'turn_right',
      biome: 'jungle',
      origin: { x: 0, y: 0, z: 0 },
      direction: 0,
      length: 24,
      width: 6,
      elevation: 0,
      obstacles: [
        {
          id: 'late_obs',
          type: 'low_wall',
          lane: 0,
          localZ: 12.2, // Dentro gli ultimi 12.5m (length - 12.5 = 11.5) -> va rimosso
          widthLanes: 2,
          avoidMethod: 'JUMP',
          height: 1.15,
          clearanceBottomY: 0,
        },
      ],
      coins: [],
      powerUps: [],
      relicFragments: [],
      nextSegmentId: 2,
      altNextSegmentId: null,
      turnDir: 'right',
    };
    const seg2: TrackSegmentData = {
      id: 2,
      type: 'straight',
      biome: 'jungle',
      origin: { x: 3, y: 0, z: 21 },
      direction: 1,
      length: 26,
      width: 6,
      elevation: 0,
      obstacles: [],
      coins: [],
      powerUps: [],
      relicFragments: [],
      nextSegmentId: null,
      altNextSegmentId: null,
    };

    const report = SolvabilityValidator.validateAndAdjust(seg1, 20, false);
    expect(report.valid).toBe(true);
    expect(seg1.obstacles.length).toBe(0);

    const player = new PlayerController();
    const lookup = (id: number) => (id === 1 ? seg1 : id === 2 ? seg2 : undefined);
    player.reset(seg1);
    player.currentLane = 1;
    player.smoothLane = 1;
    player.localZ = 17.5;

    player.queueInput('jump', 100);
    player.step(0.05, 16, true, lookup, () => null, {}, 100);
    expect(player.isGrounded).toBe(false);
    const vyBeforeTurn = player.vy;

    let turned = false;
    player.queueInput('right', 150);
    player.step(
      0.05,
      16,
      true,
      lookup,
      () => null,
      { onTurnExecuted: () => { turned = true; } },
      150
    );

    expect(turned).toBe(true);
    expect(player.currentSegment.id).toBe(2);
    expect(player.vy).toBeLessThan(vyBeforeTurn);
    expect(Math.abs(player.smoothLane)).toBeLessThanOrEqual(1);
  });

  it('Tutti gli ostacoli statici e in movimento restano dentro i confini della carreggiata (|x| <= 2.95m, niente erba)', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const obsSys = new ObstacleSystem(scene);

    try {
      const specs: Array<{ type: ObstacleType; widthLanes: number; lanes: Lane[] }> = [
        { type: 'fallen_log', widthLanes: 1, lanes: [-1, 0, 1] },
        { type: 'low_wall', widthLanes: 2, lanes: [-1, 0, 1] },
        { type: 'low_arch', widthLanes: 3, lanes: [0] },
        { type: 'chasm_pit', widthLanes: 3, lanes: [0] },
        { type: 'broken_bridge', widthLanes: 3, lanes: [0] },
        { type: 'collapsed_pillar', widthLanes: 1, lanes: [-1, 0, 1] },
        { type: 'rolling_boulder', widthLanes: 1, lanes: [-1, 0, 1] },
        { type: 'swinging_blade', widthLanes: 1, lanes: [-1, 0, 1] },
        { type: 'pressure_trap', widthLanes: 1, lanes: [-1, 0, 1] },
        { type: 'fire_jet', widthLanes: 1, lanes: [-1, 0, 1] },
        { type: 'crumbling_tile', widthLanes: 1, lanes: [-1, 0, 1] },
        { type: 'volcanic_rock', widthLanes: 1, lanes: [-1, 0, 1] },
        { type: 'moving_barrier', widthLanes: 1, lanes: [-1, 0, 1] },
        { type: 'rotating_mechanism', widthLanes: 2, lanes: [-1, 0, 1] },
        { type: 'narrow_path', widthLanes: 2, lanes: [0] },
      ];

      const obstacles: ObstaclePlacement[] = [];
      let idx = 0;
      for (const spec of specs) {
        for (const lane of spec.lanes) {
          obstacles.push({
            id: `bound_${spec.type}_${lane}_${idx++}`,
            type: spec.type,
            lane,
            localZ: 10,
            widthLanes: spec.widthLanes,
            avoidMethod: 'LANE',
            height: 1.5,
            clearanceBottomY: 0,
            dynamicPhase: 0,
          });
        }
      }

      const seg: TrackSegmentData = {
        id: 99,
        type: 'straight',
        biome: 'jungle',
        origin: { x: 0, y: 0, z: 0 },
        direction: 0,
        length: 30,
        width: 6,
        elevation: 0,
        obstacles,
        coins: [],
        powerUps: [],
        relicFragments: [],
        nextSegmentId: null,
        altNextSegmentId: null,
      };

      const root = new TransformNode('test_seg_root', scene);
      const instances = obsSys.buildObstaclesForSegment(seg, root);
      const playerNear = new Vector3(0, 0, 10);

      const localV = new Vector3();
      const worldV = new Vector3();

      for (let t = 0; t <= 2.5; t += 0.2) {
        obsSys.updateAnimations(instances, t, 0.08, playerNear);
        root.computeWorldMatrix(true);

        for (const inst of instances) {
          inst.node.computeWorldMatrix(true);
          for (const mesh of inst.node.getChildMeshes()) {
            mesh.computeWorldMatrix(true);
            const pos = mesh.getVerticesData(VertexBuffer.PositionKind);
            if (!pos || pos.length === 0) continue;

            const worldMat = mesh.getWorldMatrix();
            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            for (let i = 0; i < pos.length; i += 3) {
              localV.set(pos[i], pos[i + 1], pos[i + 2]);
              Vector3.TransformCoordinatesToRef(localV, worldMat, worldV);
              if (worldV.x < minX) minX = worldV.x;
              if (worldV.x > maxX) maxX = worldV.x;
              if (worldV.y < minY) minY = worldV.y;
            }

            expect(
              Math.abs(minX),
              `${mesh.name} at t=${t.toFixed(2)} minX=${minX.toFixed(3)}`
            ).toBeLessThanOrEqual(2.95);
            expect(
              Math.abs(maxX),
              `${mesh.name} at t=${t.toFixed(2)} maxX=${maxX.toFixed(3)}`
            ).toBeLessThanOrEqual(2.95);
            expect(
              minY,
              `${mesh.name} at t=${t.toFixed(2)} minY=${minY.toFixed(3)}`
            ).toBeGreaterThanOrEqual(-0.05);
          }
        }
      }
      root.dispose();
    } finally {
      obsSys.dispose();
      scene.dispose();
      engine.dispose();
    }
  });

  it('Tutti i 5 biomi sono sbloccati, costruiscono scenografie e eseguono transizione atmosferica fluida', () => {
    const defSave = createDefaultSaveData();
    const migratedSave = migrateAndValidateSave({ unlockedBiomes: ['jungle'] });
    for (const biome of BIOME_ORDER) {
      expect(defSave.unlockedBiomes).toContain(biome);
      expect(migratedSave.unlockedBiomes).toContain(biome);
    }

    const engine = new NullEngine();
    const scene = new Scene(engine);
    const env = new EnvironmentManager(scene);
    try {
      for (let i = 0; i < BIOME_ORDER.length; i++) {
        const biome: BiomeId = BIOME_ORDER[i];
        const seg: TrackSegmentData = {
          id: 200 + i,
          type: 'straight',
          biome,
          origin: { x: 0, y: 0, z: i * 28 },
          direction: 0,
          length: 28,
          width: 6,
          elevation: 0,
          obstacles: [],
          coins: [],
          powerUps: [],
          relicFragments: [],
          nextSegmentId: null,
          altNextSegmentId: null,
          isBiomeTransition: biome === 'sky',
          previousBiome: 'jungle',
        };
        const root = new TransformNode(`env_test_${biome}`, scene);
        env.buildSegmentEnvironment(seg, root);
        expect(root.getChildMeshes().length).toBeGreaterThan(0);
        root.dispose();
      }

      env.applyBiomeAtmosphere('jungle', true);
      const jungleFogB = scene.fogColor.b;
      const skyTarget = Color3.FromHexString(BIOMES.sky.fogColor);

      env.applyBiomeAtmosphere('sky', false);
      env.update(1.0, new Vector3(0, 0, 10), 0);
      expect(scene.fogDensity).toBeGreaterThan(0.006);
      expect(scene.fogColor.b).toBeGreaterThan(jungleFogB);
      expect(scene.fogColor.b).toBeLessThan(skyTarget.b);

      env.update(1.6, new Vector3(0, 0, 30), 0);
      expect(scene.fogColor.b).toBeCloseTo(skyTarget.b, 2);
      expect(scene.fogDensity).toBeCloseTo(0.0055, 3);
    } finally {
      env.dispose();
      scene.dispose();
      engine.dispose();
    }
  });

  it('Rianimazione con Cristalli scala 1 -> 2 -> 4, attiva lo scudo e ripristina la partita senza duplicare totalRuns', () => {
    const gsm = new GameStateManager();
    const data = gsm.saveManager.getData();
    data.settings.tutorialCompleted = true;
    gsm.saveManager.save();

    gsm.startNewRun('REVIVE-TEST');
    expect(gsm.getState()).toBe('PLAYING');
    gsm.stepRun(1.0, 'jungle', 18, 0.35);

    gsm.finishRun('Impatto di test 1');
    expect(gsm.getState()).toBe('GAME_OVER');
    expect(gsm.getReviveCost()).toBe(1);
    data.crystals = 5;
    expect(gsm.canRevive()).toBe(true);

    expect(gsm.reviveRun()).toBe(true);
    expect(gsm.getState()).toBe('PLAYING');
    expect(data.crystals).toBe(4);
    expect(gsm.powerUps.isActive('shield')).toBe(true);
    expect(gsm.getReviveCost()).toBe(2);

    gsm.stepRun(1.0, 'jungle', 20, 0.35);
    gsm.finishRun('Impatto di test 2');
    expect(gsm.getState()).toBe('GAME_OVER');
    data.crystals = 4;
    expect(gsm.canRevive()).toBe(true);

    expect(gsm.reviveRun()).toBe(true);
    expect(data.crystals).toBe(2);
    expect(gsm.powerUps.isActive('shield')).toBe(true);
    expect(gsm.getReviveCost()).toBe(4);

    gsm.finishRun('Impatto di test 3');
    expect(gsm.getState()).toBe('GAME_OVER');
    data.crystals = 2;
    expect(gsm.canRevive()).toBe(false);
    expect(gsm.reviveRun()).toBe(false);
    expect(data.crystals).toBe(2);
    expect(data.stats.totalRuns).toBe(1);
  });
});

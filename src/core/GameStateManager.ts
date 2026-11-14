import { BIOMES } from '../data/gameCatalog';
import { eventBus } from './EventBus';
import { SeededRandom } from './SeededRandom';
import { SaveManager } from '../systems/SaveManager';
import { EconomySystem } from '../systems/EconomySystem';
import { ProgressionSystem, type XpGainResult } from '../systems/ProgressionSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { RelicSystem } from '../systems/RelicSystem';
import { MissionSystem } from '../systems/MissionSystem';
import { AchievementSystem } from '../systems/AchievementSystem';
import { PowerUpSystem } from '../systems/PowerUpSystem';
import { DynamicDifficultySystem } from '../systems/DynamicDifficultySystem';
import { DynamicEventSystem } from '../systems/DynamicEventSystem';
import { TutorialSystem } from '../systems/TutorialSystem';
import type {
  AchievementDefinition,
  BiomeId,
  GameModeId,
  GameState,
  LocalRecordEntry,
  MissionProgress,
  PowerUpType,
  RunTelemetry,
} from '../types/game.types';

export interface RunSummaryResult {
  telemetry: RunTelemetry;
  xpResult: XpGainResult;
  completedMissions: MissionProgress[];
  unlockedAchievements: AchievementDefinition[];
}

export class GameStateManager {
  public readonly saveManager: SaveManager;
  public readonly economy: EconomySystem;
  public readonly progression: ProgressionSystem;
  public readonly inventory: InventorySystem;
  public readonly relics: RelicSystem;
  public readonly missions: MissionSystem;
  public readonly achievements: AchievementSystem;
  public readonly powerUps: PowerUpSystem;
  public readonly difficulty: DynamicDifficultySystem;
  public readonly dynamicEvents: DynamicEventSystem;
  public readonly tutorial: TutorialSystem;

  private state: GameState = 'MENU';
  private telemetry: RunTelemetry;
  private biomeDistancesThisRun: Record<BiomeId, number> = {
    jungle: 0,
    volcano: 0,
    sky: 0,
    desert: 0,
    shadow: 0,
  };
  private currentCleanStretch = 0;
  private bestCleanStretch = 0;
  private coinStreak = 0;
  private lastCoinAtMs = 0;
  private lastSummary: RunSummaryResult | null = null;
  private runRng: SeededRandom = new SeededRandom('INIT');
  private reviveCount = 0;
  private committedCoins = 0;
  private committedDistance = 0;
  private committedJumps = 0;
  private committedSlides = 0;
  private committedDodged = 0;
  private committedPowerUps = 0;
  private committedEvents = 0;
  private committedElapsed = 0;
  private committedXpBase = 0;
  private committedRunCounted = false;
  private committedBiomeDist: Record<BiomeId, number> = {
    jungle: 0,
    volcano: 0,
    sky: 0,
    desert: 0,
    shadow: 0,
  };

  constructor() {
    this.saveManager = new SaveManager();
    this.economy = new EconomySystem(this.saveManager);
    this.progression = new ProgressionSystem(this.saveManager);
    this.inventory = new InventorySystem(this.saveManager);
    this.relics = new RelicSystem(this.saveManager);
    this.missions = new MissionSystem(this.saveManager, this.progression);
    this.achievements = new AchievementSystem(this.saveManager);
    this.powerUps = new PowerUpSystem();
    this.difficulty = new DynamicDifficultySystem();
    this.dynamicEvents = new DynamicEventSystem();
    this.tutorial = new TutorialSystem();

    this.telemetry = this.createEmptyTelemetry('endless', 'rotating', 'jungle', 'INIT');
  }

  public getState(): GameState {
    return this.state;
  }

  public getTelemetry(): RunTelemetry {
    return { ...this.telemetry };
  }

  public getLastSummary(): RunSummaryResult | null {
    return this.lastSummary;
  }

  public getRunRng(): SeededRandom {
    return this.runRng;
  }

  public setState(next: GameState): void {
    if (this.state === next) return;
    const prev = this.state;
    this.state = next;
    eventBus.emit('state:changed', { state: next, previous: prev });
  }

  public startNewRun(overrideSeed?: string): RunTelemetry {
    const data = this.saveManager.getData();
    const mode = data.selectedMode;
    const selectedBiome = data.selectedBiome;
    const startBiome: BiomeId =
      selectedBiome === 'rotating' ? 'jungle' : selectedBiome;

    const seed =
      mode === 'daily_seed'
        ? SeededRandom.getDailySeed()
        : overrideSeed ?? `RUN-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    this.runRng = new SeededRandom(seed);
    this.biomeDistancesThisRun = { jungle: 0, volcano: 0, sky: 0, desert: 0, shadow: 0 };
    this.currentCleanStretch = 0;
    this.bestCleanStretch = 0;
    this.coinStreak = 0;
    this.lastCoinAtMs = 0;
    this.lastSummary = null;
    this.reviveCount = 0;
    this.committedCoins = 0;
    this.committedDistance = 0;
    this.committedJumps = 0;
    this.committedSlides = 0;
    this.committedDodged = 0;
    this.committedPowerUps = 0;
    this.committedEvents = 0;
    this.committedElapsed = 0;
    this.committedXpBase = 0;
    this.committedRunCounted = false;
    this.committedBiomeDist = { jungle: 0, volcano: 0, sky: 0, desert: 0, shadow: 0 };

    this.telemetry = this.createEmptyTelemetry(mode, selectedBiome, startBiome, seed);
    this.powerUps.reset(data);
    this.dynamicEvents.reset();

    const shouldShowTutorial = !data.settings.tutorialCompleted && mode === 'endless';
    this.tutorial.start(shouldShowTutorial);
    this.setState(shouldShowTutorial ? 'TUTORIAL' : 'PLAYING');
    this.saveManager.markRunStarted();
    eventBus.emit('telemetry:updated', { ...this.telemetry });
    return this.telemetry;
  }

  public pause(): void {
    if (this.state === 'PLAYING' || this.state === 'TUTORIAL') {
      this.setState('PAUSED');
    }
  }

  public resume(): void {
    if (this.state === 'PAUSED') {
      this.setState(this.tutorial.isActive() ? 'TUTORIAL' : 'PLAYING');
    }
  }

  public returnToMenu(): void {
    this.tutorial.stop();
    this.saveManager.markRunFinishedCleanly();
    this.setState('MENU');
  }

  public getReviveCost(): number {
    return Math.pow(2, this.reviveCount);
  }

  public canRevive(): boolean {
    if (this.state !== 'GAME_OVER') return false;
    if (
      this.telemetry.mode === 'time_attack' &&
      (this.telemetry.timeRemainingSeconds ?? 0) <= 0
    ) {
      return false;
    }
    return this.saveManager.getData().crystals >= this.getReviveCost();
  }

  public reviveRun(): boolean {
    if (!this.canRevive()) return false;
    const cost = this.getReviveCost();
    if (!this.economy.spendCrystals(cost)) return false;

    this.reviveCount += 1;
    this.lastSummary = null;
    this.telemetry.deathReason = '';

    const data = this.saveManager.getData();
    this.powerUps.activate(
      'shield',
      data,
      this.relics.isRelicCompleted('relic_volcano')
    );
    this.saveManager.markRunStarted();
    this.setState('PLAYING');
    eventBus.emit('telemetry:updated', { ...this.telemetry });
    return true;
  }

  public getEffectiveMultiplier(): number {
    const data = this.saveManager.getData();
    const basePerm = 1 + (data.upgrades.score_multiplier ?? 0);
    const desertRelicBonus = this.relics.isRelicCompleted('relic_desert') ? 1 : 0;
    const modeBonus = this.telemetry.mode === 'hyper_speed' ? 1.5 : 1.0;
    const eventBonus =
      this.dynamicEvents.getCurrentEvent()?.type === 'intense_pursuit' ? 2 : 1;
    const powerUpFactor = this.powerUps.getScoreMultiplierFactor();
    return Number(
      ((basePerm + desertRelicBonus) * modeBonus * eventBonus * powerUpFactor).toFixed(1)
    );
  }

  public setUpcomingTurn(turn: 'left' | 'right' | 'fork' | null): void {
    this.telemetry.upcomingTurn = turn;
  }

  public consumeOverdrive(): boolean {
    if (this.state !== 'PLAYING' && this.state !== 'TUTORIAL') return false;
    if ((this.telemetry.overdriveCharge ?? 0) < 100) return false;

    this.telemetry.overdriveCharge = 0;
    const data = this.saveManager.getData();
    const volcanoRelic = this.relics.isRelicCompleted('relic_volcano');
    this.powerUps.activate('turbo', data, volcanoRelic, 4.5);
    this.powerUps.activate('magnet', data, volcanoRelic, 4.5);
    this.telemetry.multiplier = this.getEffectiveMultiplier();
    const bonus = Math.round(300 * this.telemetry.multiplier);
    this.telemetry.score += bonus;

    eventBus.emit('juice:popup', {
      id: performance.now() + Math.random(),
      text: "⚡ IMPULSO DELL'ECLISSI!",
      subtext: `+${bonus} PT • TURBO + MAGNETE`,
      color: '#38bdf8',
    });
    eventBus.emit('telemetry:updated', { ...this.telemetry });
    return true;
  }

  private addOverdriveCharge(delta: number): void {
    this.telemetry.overdriveCharge = Math.min(
      100,
      (this.telemetry.overdriveCharge ?? 0) + delta
    );
  }

  public stepRun(dt: number, currentBiome: BiomeId, speed: number, enemyThreat: number): boolean {
    if (this.state !== 'PLAYING' && this.state !== 'TUTORIAL') return false;

    const prevDist = this.telemetry.distance;
    const deltaDist = speed * dt;
    this.telemetry.distance += deltaDist;
    this.telemetry.elapsedSeconds += dt;
    this.telemetry.speed = speed;
    this.telemetry.enemyThreat = enemyThreat;
    this.telemetry.currentBiome = currentBiome;
    this.biomeDistancesThisRun[currentBiome] += deltaDist;

    if (!this.telemetry.biomesVisited.includes(currentBiome)) {
      this.telemetry.biomesVisited.push(currentBiome);
    }

    this.currentCleanStretch += deltaDist;
    if (this.currentCleanStretch > this.bestCleanStretch) {
      this.bestCleanStretch = this.currentCleanStretch;
    }

    this.powerUps.update(dt);
    this.telemetry.multiplier = this.getEffectiveMultiplier();
    this.telemetry.score += deltaDist * 10 * this.telemetry.multiplier;

    const prevMilestone = Math.floor(prevDist / 100);
    const nextMilestone = Math.floor(this.telemetry.distance / 100);
    if (nextMilestone > prevMilestone && nextMilestone > 0) {
      const milestoneBonus = Math.round(200 * this.telemetry.multiplier);
      this.telemetry.score += milestoneBonus;
      eventBus.emit('juice:popup', {
        id: performance.now() + Math.random(),
        text: `🏆 TRAGUARDO ${nextMilestone * 100}m!`,
        subtext: `+${milestoneBonus} PT`,
        color: '#fde047',
      });
    }

    if (this.tutorial.isActive()) {
      this.tutorial.update(dt, () => {
        const d = this.saveManager.getData();
        d.settings.tutorialCompleted = true;
        this.saveManager.save();
        if (this.state === 'TUTORIAL') {
          this.setState('PLAYING');
        }
      });
    } else {
      this.dynamicEvents.update(dt, this.telemetry.distance, currentBiome, this.runRng, () => {
        this.telemetry.eventsSurvived += 1;
        this.telemetry.score += 500;
      });
    }

    // Gestione Time Attack
    if (this.telemetry.timeRemainingSeconds !== null) {
      this.telemetry.timeRemainingSeconds = Math.max(0, this.telemetry.timeRemainingSeconds - dt);
      if (this.telemetry.timeRemainingSeconds <= 0) {
        this.finishRun('Tempo Scaduto!');
        return true;
      }
    }

    eventBus.emit('telemetry:updated', { ...this.telemetry });
    return false;
  }

  public registerCoinCollected(baseValue: number): void {
    const powerMult = this.powerUps.getCoinValueMultiplier();
    const earned = baseValue * powerMult;
    const now = performance.now();
    if (now - this.lastCoinAtMs < 1400) {
      this.coinStreak += 1;
    } else {
      this.coinStreak = 1;
    }
    this.lastCoinAtMs = now;
    this.telemetry.coinStreak = this.coinStreak;
    this.telemetry.coins += earned;
    this.telemetry.score += earned * 25 * this.telemetry.multiplier;
    this.addOverdriveCharge(this.coinStreak >= 5 ? 6 : 4);
    eventBus.emit('audio:sfx', {
      sfx: 'coin',
      pitch: this.coinStreak,
    });
    if (this.coinStreak > 0 && this.coinStreak % 10 === 0) {
      const streakBonus = 100 * this.telemetry.multiplier;
      this.telemetry.score += streakBonus;
      eventBus.emit('juice:popup', {
        id: now + Math.random(),
        text: `SERIE MONETE x${this.coinStreak}!`,
        subtext: `+${Math.round(streakBonus)} PT`,
        color: '#facc15',
      });
    }
  }

  public registerNearMiss(): void {
    this.telemetry.nearMisses = (this.telemetry.nearMisses ?? 0) + 1;
    const bonus = Math.round(150 * this.telemetry.multiplier);
    this.telemetry.score += bonus;
    this.addOverdriveCharge(18);
    eventBus.emit('audio:sfx', { sfx: 'near_miss' });
    eventBus.emit('juice:popup', {
      id: performance.now() + Math.random(),
      text: 'SFIORATO!',
      subtext: `+${bonus} PT`,
      color: '#38bdf8',
    });
  }

  public registerPowerUpCollected(type: PowerUpType): void {
    const data = this.saveManager.getData();
    const volcanoRelic = this.relics.isRelicCompleted('relic_volcano');
    this.powerUps.activate(type, data, volcanoRelic);
    this.telemetry.powerUpsUsed += 1;
    if (!this.telemetry.distinctPowerUpsUsed.includes(type)) {
      this.telemetry.distinctPowerUpsUsed.push(type);
    }
    if (this.tutorial.isActive()) {
      this.tutorial.notifyAction('powerup', () => {
        data.settings.tutorialCompleted = true;
        this.saveManager.save();
        if (this.state === 'TUTORIAL') this.setState('PLAYING');
      });
    }
  }

  public registerRelicFragmentCollected(relicId: string, fragmentIndex: number): void {
    const res = this.relics.collectFragment(relicId, fragmentIndex);
    if (res.newlyFound) {
      this.telemetry.relicFragmentsFound += 1;
      this.telemetry.crystalsEarned += res.relicCompletedNow ? 5 : 1;
      if (!res.relicCompletedNow) {
        this.economy.addCrystals(1);
      }
    }
  }

  public registerJump(): void {
    this.telemetry.jumps += 1;
    if (this.tutorial.isActive()) {
      this.tutorial.notifyAction('jump', () => {
        const d = this.saveManager.getData();
        d.settings.tutorialCompleted = true;
        this.saveManager.save();
        if (this.state === 'TUTORIAL') this.setState('PLAYING');
      });
    }
  }

  public registerSlide(): void {
    this.telemetry.slides += 1;
    if (this.tutorial.isActive()) {
      this.tutorial.notifyAction('slide', () => {
        const d = this.saveManager.getData();
        d.settings.tutorialCompleted = true;
        this.saveManager.save();
        if (this.state === 'TUTORIAL') this.setState('PLAYING');
      });
    }
  }

  public registerLaneChange(): void {
    if (this.tutorial.isActive()) {
      this.tutorial.notifyAction('lane', () => {
        const d = this.saveManager.getData();
        d.settings.tutorialCompleted = true;
        this.saveManager.save();
        if (this.state === 'TUTORIAL') this.setState('PLAYING');
      });
    }
  }

  public registerTurn(): void {
    this.telemetry.turnsMade += 1;
    if (this.tutorial.isActive()) {
      this.tutorial.notifyAction('turn', () => {
        const d = this.saveManager.getData();
        d.settings.tutorialCompleted = true;
        this.saveManager.save();
        if (this.state === 'TUTORIAL') this.setState('PLAYING');
      });
    }
  }

  public registerObstacleDodged(): void {
    this.telemetry.obstaclesDodged += 1;
    this.addOverdriveCharge(3);
  }

  public registerStumble(): void {
    this.telemetry.stumbles += 1;
    this.currentCleanStretch = 0;
  }

  public finishRun(deathReason: string): RunSummaryResult {
    if (this.state === 'GAME_OVER' && this.lastSummary) {
      return this.lastSummary;
    }

    this.tutorial.stop();
    this.telemetry.deathReason = deathReason;
    this.telemetry.distance = Math.floor(this.telemetry.distance);
    this.telemetry.score = Math.floor(this.telemetry.score);

    const data = this.saveManager.getData();
    const jadeRelic = this.relics.isRelicCompleted('relic_jungle');
    const astrolabeRelic = this.relics.isRelicCompleted('relic_sky');

    const newlyCollectedCoins = Math.max(0, this.telemetry.coins - this.committedCoins);
    const finalCoins =
      this.committedCoins +
      (jadeRelic ? Math.round(newlyCollectedCoins * 1.1) : newlyCollectedCoins);
    const deltaCoins = Math.max(0, finalCoins - this.committedCoins);
    this.telemetry.coins = finalCoins;
    this.committedCoins = finalCoins;

    // Aggiorna record personali e statistiche cumulative
    if (this.telemetry.score > data.stats.bestScore) {
      data.stats.bestScore = this.telemetry.score;
      this.telemetry.isNewRecord = true;
    }
    if (this.telemetry.distance > data.stats.bestDistance) {
      data.stats.bestDistance = this.telemetry.distance;
      this.telemetry.isNewRecord = true;
      // Bonus record distanza
      data.crystals += 1;
      this.telemetry.crystalsEarned += 1;
    }

    const modeBest = data.stats.bestByMode[this.telemetry.mode];
    if (modeBest) {
      modeBest.score = Math.max(modeBest.score, this.telemetry.score);
      modeBest.distance = Math.max(modeBest.distance, this.telemetry.distance);
    }

    const deltaDist = Math.max(0, this.telemetry.distance - this.committedDistance);
    const deltaJumps = Math.max(0, this.telemetry.jumps - this.committedJumps);
    const deltaSlides = Math.max(0, this.telemetry.slides - this.committedSlides);
    const deltaDodged = Math.max(0, this.telemetry.obstaclesDodged - this.committedDodged);
    const deltaPowerUps = Math.max(0, this.telemetry.powerUpsUsed - this.committedPowerUps);
    const deltaEvents = Math.max(0, this.telemetry.eventsSurvived - this.committedEvents);
    const deltaElapsed = Math.max(0, this.telemetry.elapsedSeconds - this.committedElapsed);

    data.coins += deltaCoins;
    data.stats.totalRuns += this.committedRunCounted ? 0 : 1;
    data.stats.totalDistance += deltaDist;
    data.stats.totalCoinsCollected += deltaCoins;
    data.stats.totalJumps += deltaJumps;
    data.stats.totalSlides += deltaSlides;
    data.stats.totalObstaclesDodged += deltaDodged;
    data.stats.totalPowerUpsUsed += deltaPowerUps;
    data.stats.totalEventsSurvived += deltaEvents;
    data.stats.totalPlayTimeSeconds += deltaElapsed;

    this.committedDistance = this.telemetry.distance;
    this.committedJumps = this.telemetry.jumps;
    this.committedSlides = this.telemetry.slides;
    this.committedDodged = this.telemetry.obstaclesDodged;
    this.committedPowerUps = this.telemetry.powerUpsUsed;
    this.committedEvents = this.telemetry.eventsSurvived;
    this.committedElapsed = this.telemetry.elapsedSeconds;
    this.committedRunCounted = true;

    for (const b of Object.keys(this.biomeDistancesThisRun) as BiomeId[]) {
      const targetBiomeDist = Math.floor(this.biomeDistancesThisRun[b]);
      const deltaBiomeDist = Math.max(0, targetBiomeDist - this.committedBiomeDist[b]);
      data.stats.biomeDistance[b] += deltaBiomeDist;
      this.committedBiomeDist[b] = targetBiomeDist;
    }

    const recordEntry: LocalRecordEntry = {
      id: `rec_${Date.now()}`,
      dateIso: new Date().toISOString(),
      mode: this.telemetry.mode,
      biome: this.telemetry.selectedBiome,
      score: this.telemetry.score,
      distance: this.telemetry.distance,
      coins: finalCoins,
      seed: this.telemetry.seed,
      characterId: data.selectedCharacter,
    };

    data.localLeaderboard = [recordEntry, ...data.localLeaderboard]
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    if (this.telemetry.mode === 'daily_seed') {
      const key = this.telemetry.seed;
      const existing = data.dailyLeaderboard[key] ?? [];
      data.dailyLeaderboard[key] = [recordEntry, ...existing]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    }

    this.saveManager.markRunFinishedCleanly();

    // XP, Missioni e Achievement
    const baseXp = Math.round(
      this.telemetry.distance * 0.35 +
        this.telemetry.coins * 0.8 +
        this.telemetry.obstaclesDodged * 2
    );
    const deltaXpBase = Math.max(0, baseXp - this.committedXpBase);
    this.committedXpBase = Math.max(this.committedXpBase, baseXp);
    const xpResult = this.progression.addXp(deltaXpBase, astrolabeRelic);

    const completedMissions = this.missions.recordRunProgress(
      this.telemetry,
      this.biomeDistancesThisRun,
      this.bestCleanStretch
    );

    const unlockedAchievements = this.achievements.evaluate(
      this.telemetry,
      this.bestCleanStretch
    );

    this.telemetry.crystalsEarned +=
      xpResult.rewardCrystals +
      unlockedAchievements.reduce((acc, a) => acc + a.rewardCrystals, 0);

    const summary: RunSummaryResult = {
      telemetry: { ...this.telemetry },
      xpResult,
      completedMissions,
      unlockedAchievements,
    };
    this.lastSummary = summary;
    this.saveManager.save();
    this.setState('GAME_OVER');
    eventBus.emit('telemetry:updated', { ...this.telemetry });
    return summary;
  }

  public getNextBiomeTransition(distance: number): BiomeId | null {
    if (this.telemetry.selectedBiome !== 'rotating') return null;
    const unlocked = this.saveManager.getData().unlockedBiomes;
    if (unlocked.length <= 1) return null;
    const index = Math.floor(distance / 750) % unlocked.length;
    return unlocked[index] ?? 'jungle';
  }

  public getBiomeName(biome: BiomeId): string {
    return BIOMES[biome].name;
  }

  private createEmptyTelemetry(
    mode: GameModeId,
    selectedBiome: BiomeId | 'rotating',
    currentBiome: BiomeId,
    seed: string
  ): RunTelemetry {
    return {
      mode,
      selectedBiome,
      currentBiome,
      seed,
      distance: 0,
      score: 0,
      coins: 0,
      crystalsEarned: 0,
      multiplier: 1,
      speed: 14.5,
      jumps: 0,
      slides: 0,
      obstaclesDodged: 0,
      turnsMade: 0,
      powerUpsUsed: 0,
      distinctPowerUpsUsed: [],
      stumbles: 0,
      eventsSurvived: 0,
      relicFragmentsFound: 0,
      elapsedSeconds: 0,
      timeRemainingSeconds: mode === 'time_attack' ? 90 : null,
      enemyThreat: 0.35,
      biomesVisited: [currentBiome],
      deathReason: '',
      isNewRecord: false,
      nearMisses: 0,
      coinStreak: 0,
      overdriveCharge: 0,
      upcomingTurn: null,
    };
  }
}

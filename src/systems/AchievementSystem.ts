import { ACHIEVEMENTS, RELICS, UPGRADES } from '../data/gameCatalog';
import { eventBus } from '../core/EventBus';
import type { AchievementDefinition, RunTelemetry } from '../types/game.types';
import type { SaveManager } from './SaveManager';

export class AchievementSystem {
  constructor(private readonly saveManager: SaveManager) {}

  public evaluate(
    telemetry?: RunTelemetry,
    cleanDistanceInRun: number = 0
  ): AchievementDefinition[] {
    const data = this.saveManager.getData();
    const unlockedNow: AchievementDefinition[] = [];

    const maxUpgradeLevel = Math.max(
      0,
      ...UPGRADES.map((u) => data.upgrades[u.id] ?? 0)
    );
    const completedRelics = RELICS.filter((r) => {
      const p = data.relicProgress[r.id];
      return p && p[0] && p[1] && p[2];
    }).length;
    const dailyRunsCount = Object.values(data.dailyLeaderboard).reduce(
      (acc, list) => acc + list.length,
      0
    );

    for (const ach of ACHIEVEMENTS) {
      if (data.unlockedAchievements.includes(ach.id)) continue;

      let value = 0;
      switch (ach.metric) {
        case 'run_distance':
          value = telemetry ? telemetry.distance : data.stats.bestDistance;
          break;
        case 'total_distance':
          value = data.stats.totalDistance;
          break;
        case 'run_score':
          value = telemetry ? telemetry.score : data.stats.bestScore;
          break;
        case 'run_coins':
          value = telemetry ? telemetry.coins : 0;
          break;
        case 'total_coins':
          value = data.stats.totalCoinsCollected;
          break;
        case 'total_jumps':
          value = data.stats.totalJumps;
          break;
        case 'total_slides':
          value = data.stats.totalSlides;
          break;
        case 'total_dodged':
          value = data.stats.totalObstaclesDodged;
          break;
        case 'no_stumble_distance':
          value = cleanDistanceInRun;
          break;
        case 'run_turns':
          value = telemetry ? telemetry.turnsMade : 0;
          break;
        case 'player_level':
          value = data.level;
          break;
        case 'max_upgrade_level':
          value = maxUpgradeLevel;
          break;
        case 'biomes_unlocked':
          value = data.unlockedBiomes.length;
          break;
        case 'relics_completed':
          value = completedRelics;
          break;
        case 'run_distinct_powerups':
          value = telemetry ? telemetry.distinctPowerUpsUsed.length : 0;
          break;
        case 'total_events':
          value = data.stats.totalEventsSurvived;
          break;
        case 'characters_unlocked':
          value = data.unlockedCharacters.length;
          break;
        case 'daily_runs':
          value = dailyRunsCount + (telemetry?.mode === 'daily_seed' ? 1 : 0);
          break;
      }

      if (value >= ach.target) {
        data.unlockedAchievements.push(ach.id);
        data.crystals += ach.rewardCrystals;
        unlockedNow.push(ach);
        eventBus.emit('achievement:unlocked', ach);
        eventBus.emit('audio:sfx', { sfx: 'achievement' });
      }
    }

    if (unlockedNow.length > 0) {
      this.saveManager.save();
    }

    return unlockedNow;
  }
}

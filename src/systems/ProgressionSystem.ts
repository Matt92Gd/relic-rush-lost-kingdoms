import { BIOMES, BIOME_ORDER, getXpRequiredForLevel } from '../data/gameCatalog';
import { eventBus } from '../core/EventBus';
import type { BiomeId } from '../types/game.types';
import type { SaveManager } from './SaveManager';

export interface XpGainResult {
  xpAdded: number;
  levelsGained: number;
  newLevel: number;
  rewardCoins: number;
  rewardCrystals: number;
  newlyUnlockedBiomes: BiomeId[];
}

export class ProgressionSystem {
  constructor(private readonly saveManager: SaveManager) {}

  public getXpForNextLevel(level: number = this.saveManager.getData().level): number {
    return getXpRequiredForLevel(level);
  }

  public addXp(baseXp: number, relicAstrolabeCompleted: boolean = false): XpGainResult {
    const data = this.saveManager.getData();
    const xpUpgradeLevel = data.upgrades.xp_boost ?? 0;
    const multiplier = 1 + xpUpgradeLevel * 0.15 + (relicAstrolabeCompleted ? 0.15 : 0);
    const xpAdded = Math.max(0, Math.round(baseXp * multiplier));

    data.xp += xpAdded;
    let levelsGained = 0;
    let rewardCoins = 0;
    let rewardCrystals = 0;
    const newlyUnlockedBiomes: BiomeId[] = [];

    while (data.level < 50) {
      const req = getXpRequiredForLevel(data.level);
      if (data.xp < req) break;
      data.xp -= req;
      data.level += 1;
      levelsGained += 1;

      const coinsForLvl = 100 + data.level * 35;
      const crystalsForLvl = data.level % 2 === 0 ? 2 : 1;
      data.coins += coinsForLvl;
      data.crystals += crystalsForLvl;
      rewardCoins += coinsForLvl;
      rewardCrystals += crystalsForLvl;

      // Sblocco automatico dei biomi al raggiungimento del livello richiesto
      for (const biomeId of BIOME_ORDER) {
        const cfg = BIOMES[biomeId];
        if (data.level >= cfg.unlockLevel && !data.unlockedBiomes.includes(biomeId)) {
          data.unlockedBiomes.push(biomeId);
          newlyUnlockedBiomes.push(biomeId);
        }
      }

      eventBus.emit('level:up', {
        newLevel: data.level,
        rewardCoins: coinsForLvl,
        rewardCrystals: crystalsForLvl,
      });
      eventBus.emit('audio:sfx', { sfx: 'level_up' });
    }

    this.saveManager.save();
    return {
      xpAdded,
      levelsGained,
      newLevel: data.level,
      rewardCoins,
      rewardCrystals,
      newlyUnlockedBiomes,
    };
  }

  public unlockBiome(biome: BiomeId): boolean {
    const data = this.saveManager.getData();
    if (data.unlockedBiomes.includes(biome)) return false;
    data.unlockedBiomes.push(biome);
    this.saveManager.save();
    eventBus.emit('toast:message', {
      title: `Nuovo Regno Sbloccato!`,
      subtitle: BIOMES[biome].name,
      kind: 'reward',
    });
    return true;
  }

  public selectBiome(selection: BiomeId | 'rotating'): boolean {
    const data = this.saveManager.getData();
    if (selection !== 'rotating' && !data.unlockedBiomes.includes(selection)) {
      return false;
    }
    data.selectedBiome = selection;
    this.saveManager.save();
    return true;
  }
}

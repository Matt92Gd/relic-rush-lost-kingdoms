import { DAILY_REWARDS, UPGRADES, getUpgradeCost } from '../data/gameCatalog';
import { eventBus } from '../core/EventBus';
import type { UpgradeId } from '../types/game.types';
import type { SaveManager } from './SaveManager';

export class EconomySystem {
  constructor(private readonly saveManager: SaveManager) {}

  public addCoins(amount: number): void {
    if (amount <= 0) return;
    const data = this.saveManager.getData();
    data.coins += Math.floor(amount);
    this.saveManager.save();
  }

  public addCrystals(amount: number): void {
    if (amount <= 0) return;
    const data = this.saveManager.getData();
    data.crystals += Math.floor(amount);
    this.saveManager.save();
  }

  public spendCoins(amount: number): boolean {
    const data = this.saveManager.getData();
    if (amount < 0 || data.coins < amount) return false;
    data.coins -= Math.floor(amount);
    this.saveManager.save();
    return true;
  }

  public spendCrystals(amount: number): boolean {
    const data = this.saveManager.getData();
    if (amount < 0 || data.crystals < amount) return false;
    data.crystals -= Math.floor(amount);
    this.saveManager.save();
    return true;
  }

  public getUpgradeLevel(id: UpgradeId): number {
    return this.saveManager.getData().upgrades[id] ?? 0;
  }

  public getNextUpgradeCost(id: UpgradeId): number | null {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return null;
    const current = this.getUpgradeLevel(id);
    if (current >= def.maxLevel) return null;
    return getUpgradeCost(def, current);
  }

  public purchaseUpgrade(id: UpgradeId): boolean {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    const data = this.saveManager.getData();
    const current = data.upgrades[id] ?? 0;
    if (current >= def.maxLevel) return false;

    const cost = getUpgradeCost(def, current);
    if (data.coins < cost) return false;

    data.coins -= cost;
    data.upgrades[id] = current + 1;
    this.saveManager.save();
    eventBus.emit('audio:sfx', { sfx: 'powerup' });
    eventBus.emit('toast:message', {
      title: `${def.name} Livello ${current + 1}`,
      subtitle: def.effectPerLevelLabel,
      kind: 'reward',
    });
    return true;
  }

  /**
   * Ricompensa giornaliera non punitiva: avanza un passo ogni giorno solare in cui viene riscossa,
   * senza mai azzerare la progressione in caso di assenza.
   */
  public canClaimDailyReward(todayKey: string = new Date().toISOString().slice(0, 10)): boolean {
    const data = this.saveManager.getData();
    return data.lastDailyRewardDate !== todayKey;
  }

  public claimDailyReward(
    todayKey: string = new Date().toISOString().slice(0, 10)
  ): { coins: number; crystals: number; day: number } | null {
    const data = this.saveManager.getData();
    if (data.lastDailyRewardDate === todayKey) return null;

    const dayIndex = data.dailyRewardDay % DAILY_REWARDS.length;
    const reward = DAILY_REWARDS[dayIndex];

    data.coins += reward.coins;
    data.crystals += reward.crystals;
    data.lastDailyRewardDate = todayKey;
    data.dailyRewardDay = (dayIndex + 1) % DAILY_REWARDS.length;

    this.saveManager.save();
    eventBus.emit('audio:sfx', { sfx: 'achievement' });
    eventBus.emit('toast:message', {
      title: `Ricompensa Giorno ${reward.day}`,
      subtitle: reward.label,
      kind: 'reward',
    });

    return { coins: reward.coins, crystals: reward.crystals, day: reward.day };
  }
}

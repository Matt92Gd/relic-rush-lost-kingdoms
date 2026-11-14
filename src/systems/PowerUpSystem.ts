import { POWERUP_INFO } from '../data/gameCatalog';
import { eventBus } from '../core/EventBus';
import type { ActivePowerUpState, PowerUpType, SaveData } from '../types/game.types';

export class PowerUpSystem {
  private active: Map<PowerUpType, ActivePowerUpState> = new Map();

  public reset(saveData: SaveData): void {
    this.active.clear();
    // Se Egida Antica è al livello 2+, parte con uno Scudo iniziale
    const shieldLevel = saveData.upgrades.starting_shield ?? 0;
    if (shieldLevel >= 2) {
      const duration = 12 + (shieldLevel - 1) * 3;
      this.active.set('shield', {
        type: 'shield',
        remainingSeconds: duration,
        totalDurationSeconds: duration,
      });
    }
    this.emitUpdate();
  }

  public activate(
    type: PowerUpType,
    saveData: SaveData,
    volcanoRelicCompleted: boolean,
    overrideDuration?: number
  ): void {
    const info = POWERUP_INFO[type];
    const generalDurationBonus = 1 + (saveData.upgrades.powerup_duration ?? 0) * 0.12;
    let duration = overrideDuration ?? info.baseDuration * generalDurationBonus;

    if (overrideDuration === undefined) {
      if (type === 'magnet') {
        duration += (saveData.upgrades.magnet_duration ?? 0) * 2;
      } else if (type === 'shield') {
        duration += (saveData.upgrades.starting_shield ?? 0) * 3;
      }

      if ((type === 'turbo' || type === 'shield') && volcanoRelicCompleted) {
        duration *= 1.15;
      }
    }

    this.active.set(type, {
      type,
      remainingSeconds: duration,
      totalDurationSeconds: duration,
    });

    eventBus.emit('powerup:activated', { type, duration });
    eventBus.emit('audio:sfx', { sfx: 'powerup' });
    this.emitUpdate();
  }

  public update(dt: number): void {
    if (this.active.size === 0) return;
    let changed = false;
    for (const [type, state] of this.active.entries()) {
      state.remainingSeconds -= dt;
      if (state.remainingSeconds <= 0) {
        this.active.delete(type);
        changed = true;
      } else {
        changed = true;
      }
    }
    if (changed) {
      this.emitUpdate();
    }
  }

  public isActive(type: PowerUpType): boolean {
    return this.active.has(type);
  }

  public consumeShield(): boolean {
    if (!this.active.has('shield')) return false;
    this.active.delete('shield');
    eventBus.emit('audio:sfx', { sfx: 'shield_break' });
    this.emitUpdate();
    return true;
  }

  public getMagnetRadius(saveData: SaveData): number {
    if (!this.active.has('magnet')) return 1.15;
    const lvl = saveData.upgrades.magnet_duration ?? 0;
    return 7.5 + lvl * 1.5;
  }

  public getSpeedFactor(): number {
    if (this.active.has('turbo')) return 1.65;
    if (this.active.has('time_slow')) return 0.68;
    return 1.0;
  }

  public getScoreMultiplierFactor(): number {
    let factor = 1;
    if (this.active.has('multiplier')) factor *= 2;
    if (this.active.has('turbo')) factor *= 1.5;
    return factor;
  }

  public getCoinValueMultiplier(): number {
    return this.active.has('coin_bonus') ? 3 : 1;
  }

  public hasDoubleJump(): boolean {
    return this.active.has('double_jump');
  }

  public isInvulnerable(): boolean {
    return this.active.has('turbo');
  }

  public getActiveList(): ActivePowerUpState[] {
    return Array.from(this.active.values());
  }

  private emitUpdate(): void {
    eventBus.emit('powerups:updated', this.getActiveList());
  }
}

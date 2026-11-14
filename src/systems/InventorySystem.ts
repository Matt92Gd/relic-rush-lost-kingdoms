import { ACCESSORIES, CHARACTERS, TRAILS } from '../data/gameCatalog';
import { eventBus } from '../core/EventBus';
import type { AccessoryId, CelebrationStyle, CharacterId, TrailId } from '../types/game.types';
import type { SaveManager } from './SaveManager';

export class InventorySystem {
  constructor(private readonly saveManager: SaveManager) {}

  public unlockOrSelectCharacter(id: CharacterId): { success: boolean; reason?: string } {
    const data = this.saveManager.getData();
    const def = CHARACTERS.find((c) => c.id === id);
    if (!def) return { success: false, reason: 'Personaggio inesistente' };

    if (data.unlockedCharacters.includes(id)) {
      data.selectedCharacter = id;
      this.saveManager.save();
      eventBus.emit('audio:sfx', { sfx: 'ui_click' });
      return { success: true };
    }

    if (def.unlockType === 'coins') {
      if (data.coins < def.unlockCost) {
        return { success: false, reason: `Servono ${def.unlockCost} Monete` };
      }
      data.coins -= def.unlockCost;
    } else if (def.unlockType === 'crystals') {
      if (data.crystals < def.unlockCost) {
        return { success: false, reason: `Servono ${def.unlockCost} Cristalli` };
      }
      data.crystals -= def.unlockCost;
    } else if (def.unlockType === 'level') {
      if (data.level < def.unlockCost) {
        return { success: false, reason: `Richiede Livello ${def.unlockCost}` };
      }
    }

    data.unlockedCharacters.push(id);
    data.selectedCharacter = id;
    if (
      def.defaultAccessory !== 'none' &&
      !data.unlockedAccessories.includes(def.defaultAccessory)
    ) {
      data.unlockedAccessories.push(def.defaultAccessory);
    }
    if (def.defaultTrail !== 'none' && !data.unlockedTrails.includes(def.defaultTrail)) {
      data.unlockedTrails.push(def.defaultTrail);
    }

    this.saveManager.save();
    eventBus.emit('audio:sfx', { sfx: 'achievement' });
    eventBus.emit('toast:message', {
      title: `${def.name} Sbloccato!`,
      subtitle: def.title,
      kind: 'reward',
    });
    return { success: true };
  }

  public setCharacterColor(id: CharacterId, hexColor: string): void {
    const data = this.saveManager.getData();
    if (!/^#[0-9a-fA-F]{6}$/.test(hexColor)) return;
    data.characterCustomColors[id] = hexColor;
    this.saveManager.save();
  }

  public unlockOrSelectAccessory(id: AccessoryId): { success: boolean; reason?: string } {
    const data = this.saveManager.getData();
    const def = ACCESSORIES.find((a) => a.id === id);
    if (!def) return { success: false, reason: 'Accessorio non trovato' };

    if (!data.unlockedAccessories.includes(id)) {
      if (data.crystals < def.costCrystals) {
        return { success: false, reason: `Servono ${def.costCrystals} Cristalli` };
      }
      data.crystals -= def.costCrystals;
      data.unlockedAccessories.push(id);
      eventBus.emit('audio:sfx', { sfx: 'powerup' });
    } else {
      eventBus.emit('audio:sfx', { sfx: 'ui_click' });
    }

    data.selectedAccessory = id;
    this.saveManager.save();
    return { success: true };
  }

  public unlockOrSelectTrail(id: TrailId): { success: boolean; reason?: string } {
    const data = this.saveManager.getData();
    const def = TRAILS.find((t) => t.id === id);
    if (!def) return { success: false, reason: 'Scia non trovata' };

    if (!data.unlockedTrails.includes(id)) {
      if (data.coins < def.costCoins) {
        return { success: false, reason: `Servono ${def.costCoins} Monete` };
      }
      data.coins -= def.costCoins;
      data.unlockedTrails.push(id);
      eventBus.emit('audio:sfx', { sfx: 'powerup' });
    } else {
      eventBus.emit('audio:sfx', { sfx: 'ui_click' });
    }

    data.selectedTrail = id;
    this.saveManager.save();
    return { success: true };
  }

  public setCelebration(style: CelebrationStyle): void {
    const data = this.saveManager.getData();
    data.selectedCelebration = style;
    this.saveManager.save();
  }
}

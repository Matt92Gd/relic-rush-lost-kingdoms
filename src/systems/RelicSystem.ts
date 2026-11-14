import { RELICS } from '../data/gameCatalog';
import { eventBus } from '../core/EventBus';
import type { BiomeId } from '../types/game.types';
import type { SaveManager } from './SaveManager';

export class RelicSystem {
  constructor(private readonly saveManager: SaveManager) {}

  public isRelicCompleted(relicId: string): boolean {
    const prog = this.saveManager.getData().relicProgress[relicId];
    return Boolean(prog && prog[0] && prog[1] && prog[2]);
  }

  public getCompletedCount(): number {
    return RELICS.filter((r) => this.isRelicCompleted(r.id)).length;
  }

  public getMissingFragmentForBiome(
    biome: BiomeId
  ): { relicId: string; fragmentIndex: number } | null {
    const relic = RELICS.find((r) => r.biome === biome);
    if (!relic) return null;
    const prog = this.saveManager.getData().relicProgress[relic.id] ?? [false, false, false];
    const idx = prog.findIndex((found) => !found);
    if (idx === -1) return null;
    return { relicId: relic.id, fragmentIndex: idx };
  }

  public collectFragment(
    relicId: string,
    fragmentIndex: number
  ): { newlyFound: boolean; relicCompletedNow: boolean } {
    const data = this.saveManager.getData();
    if (!data.relicProgress[relicId]) {
      data.relicProgress[relicId] = [false, false, false];
    }
    const prog = data.relicProgress[relicId];
    if (fragmentIndex < 0 || fragmentIndex > 2) {
      return { newlyFound: false, relicCompletedNow: false };
    }

    if (prog[fragmentIndex]) {
      return { newlyFound: false, relicCompletedNow: false };
    }

    const wasCompleted = prog[0] && prog[1] && prog[2];
    prog[fragmentIndex] = true;
    const isNowCompleted = prog[0] && prog[1] && prog[2];
    const relicCompletedNow = !wasCompleted && isNowCompleted;

    if (relicCompletedNow) {
      data.crystals += 5;
      data.coins += 250;
      const relic = RELICS.find((r) => r.id === relicId);
      eventBus.emit('toast:message', {
        title: `Reliquia Completata: ${relic?.name ?? relicId}!`,
        subtitle: `${relic?.bonusDescription ?? ''} (+5 Cristalli, +250 Monete)`,
        kind: 'reward',
      });
      eventBus.emit('audio:sfx', { sfx: 'achievement' });
    } else {
      const relic = RELICS.find((r) => r.id === relicId);
      eventBus.emit('toast:message', {
        title: `Frammento Reliquia Trovato!`,
        subtitle: relic ? `${relic.name}: ${relic.fragmentNames[fragmentIndex]}` : relicId,
        kind: 'reward',
      });
      eventBus.emit('audio:sfx', { sfx: 'relic' });
    }

    this.saveManager.save();
    eventBus.emit('relic:fragment', {
      relicId,
      fragmentIndex,
      completed: isNowCompleted,
    });

    return { newlyFound: true, relicCompletedNow };
  }
}

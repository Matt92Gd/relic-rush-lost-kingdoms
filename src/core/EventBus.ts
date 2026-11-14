import type {
  ActiveDynamicEvent,
  ActivePowerUpState,
  AchievementDefinition,
  BiomeId,
  GameState,
  PerformanceMetrics,
  PowerUpType,
  RunTelemetry,
  SaveData,
  TutorialStep,
} from '../types/game.types';

export interface GameEvents {
  'state:changed': { state: GameState; previous: GameState };
  'save:updated': SaveData;
  'telemetry:updated': RunTelemetry;
  'powerups:updated': ActivePowerUpState[];
  'powerup:activated': { type: PowerUpType; duration: number };
  'event:updated': ActiveDynamicEvent | null;
  'event:started': ActiveDynamicEvent;
  'biome:changed': { biome: BiomeId; previousBiome?: BiomeId };
  'achievement:unlocked': AchievementDefinition;
  'mission:completed': { title: string; rewardCoins: number; rewardCrystals: number };
  'level:up': { newLevel: number; rewardCoins: number; rewardCrystals: number };
  'relic:fragment': { relicId: string; fragmentIndex: number; completed: boolean };
  'tutorial:step': TutorialStep | null;
  'performance:updated': PerformanceMetrics;
  'toast:message': { title: string; subtitle?: string; kind: 'info' | 'reward' | 'warning' };
  'juice:popup': { id: number; text: string; subtext?: string; color: string };
  'audio:sfx': {
    sfx:
      | 'footstep'
      | 'jump'
      | 'double_jump'
      | 'slide'
      | 'turn'
      | 'coin'
      | 'crystal'
      | 'relic'
      | 'powerup'
      | 'shield_break'
      | 'near_miss'
      | 'stumble'
      | 'crash'
      | 'enemy_roar'
      | 'achievement'
      | 'level_up'
      | 'ui_click'
      | 'event_warning';
    pitch?: number;
  };
}

type Listener<T> = (payload: T) => void;

class TypedEventBus {
  private listeners: Map<keyof GameEvents, Set<Listener<unknown>>> = new Map();

  public on<K extends keyof GameEvents>(event: K, listener: Listener<GameEvents[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<unknown>);
    return () => {
      set?.delete(listener as Listener<unknown>);
    };
  }

  public emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      (listener as Listener<GameEvents[K]>)(payload);
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new TypedEventBus();

import type {
  AccessoryId,
  BiomeId,
  CharacterId,
  GameModeId,
  QualityPreset,
  SaveData,
  TrailId,
  UpgradeId,
} from '../types/game.types';
import { BIOME_ORDER, CHARACTERS, RELICS, UPGRADES } from '../data/gameCatalog';
import { eventBus } from '../core/EventBus';

export const CURRENT_SAVE_VERSION = 2;
export const STORAGE_KEY = 'relic_rush_save_v2';
export const ACTIVE_RUN_KEY = 'relic_rush_active_run_flag';
const IDB_NAME = 'RelicRushDB';
const IDB_STORE = 'saves';

const VALID_MODES: GameModeId[] = [
  'endless',
  'time_attack',
  'survival',
  'no_powerups',
  'hyper_speed',
  'coin_rush',
  'daily_seed',
];

const VALID_PRESETS: QualityPreset[] = ['low', 'medium', 'high', 'ultra'];

export function createDefaultSaveData(): SaveData {
  const characterCustomColors = {} as Record<CharacterId, string>;
  for (const c of CHARACTERS) {
    characterCustomColors[c.id] = c.baseColor;
  }

  const upgrades = {} as Record<UpgradeId, number>;
  for (const u of UPGRADES) {
    upgrades[u.id] = 0;
  }

  const relicProgress: Record<string, [boolean, boolean, boolean]> = {};
  for (const r of RELICS) {
    relicProgress[r.id] = [false, false, false];
  }

  const biomeDistance = {} as Record<BiomeId, number>;
  for (const b of BIOME_ORDER) {
    biomeDistance[b] = 0;
  }

  const bestByMode = {} as Record<GameModeId, { score: number; distance: number }>;
  for (const m of VALID_MODES) {
    bestByMode[m] = { score: 0, distance: 0 };
  }

  return {
    version: CURRENT_SAVE_VERSION,
    playerName: 'Esploratore',
    coins: 0,
    crystals: 3,
    xp: 0,
    level: 1,
    unlockedBiomes: [...BIOME_ORDER],
    selectedBiome: 'rotating',
    selectedMode: 'endless',
    unlockedCharacters: ['leo'],
    selectedCharacter: 'leo',
    characterCustomColors,
    unlockedAccessories: ['none', 'explorer_hat'],
    selectedAccessory: 'explorer_hat',
    unlockedTrails: ['none', 'gold_dust'],
    selectedTrail: 'gold_dust',
    selectedCelebration: 'victory_fist',
    upgrades,
    relicProgress,
    missions: [],
    dailyMissionDate: '',
    weeklyMissionKey: '',
    permanentMissionStep: 0,
    unlockedAchievements: [],
    dailyRewardDay: 0,
    lastDailyRewardDate: '',
    interruptedRunNotice: false,
    stats: {
      totalRuns: 0,
      totalDistance: 0,
      bestDistance: 0,
      bestScore: 0,
      totalCoinsCollected: 0,
      totalJumps: 0,
      totalSlides: 0,
      totalObstaclesDodged: 0,
      totalPowerUpsUsed: 0,
      totalEventsSurvived: 0,
      totalPlayTimeSeconds: 0,
      biomeDistance,
      bestByMode,
    },
    localLeaderboard: [],
    dailyLeaderboard: {},
    settings: {
      masterVolume: 0.75,
      musicVolume: 0.55,
      sfxVolume: 0.85,
      muted: false,
      qualityPreset: 'high',
      tiltControlsEnabled: false,
      showDebugPanel: false,
      tutorialCompleted: false,
    },
  };
}

function safeNonNegNumber(val: unknown, fallback: number): number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0 ? val : fallback;
}

function safeClamp(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, val));
}

/**
 * Migra salvataggi da versioni precedenti (es. v1) alla v2 e ripara eventuali campi corrotti.
 */
export function migrateAndValidateSave(raw: unknown): SaveData {
  const def = createDefaultSaveData();
  if (!raw || typeof raw !== 'object') {
    return def;
  }

  const src = raw as Record<string, unknown>;
  const data = createDefaultSaveData();

  // Migrazione v1 -> v2 (in v1 crystals poteva chiamarsi gems e level poteva essere omesso)
  const rawVersion = typeof src.version === 'number' ? src.version : 1;
  const legacyGems = rawVersion < 2 && typeof src.gems === 'number' ? src.gems : undefined;

  data.version = CURRENT_SAVE_VERSION;
  data.playerName =
    typeof src.playerName === 'string' && src.playerName.trim().length > 0
      ? src.playerName.trim().slice(0, 24)
      : def.playerName;

  data.coins = Math.floor(safeNonNegNumber(src.coins, def.coins));
  data.crystals = Math.floor(safeNonNegNumber(src.crystals ?? legacyGems, def.crystals));
  data.xp = Math.floor(safeNonNegNumber(src.xp, def.xp));
  data.level = Math.max(1, Math.min(50, Math.floor(safeNonNegNumber(src.level, def.level))));

  data.unlockedBiomes = [...BIOME_ORDER];
  if (Array.isArray(src.unlockedBiomes)) {
    const valid = src.unlockedBiomes.filter((b): b is BiomeId =>
      BIOME_ORDER.includes(b as BiomeId)
    );
    data.unlockedBiomes = Array.from(new Set<BiomeId>([...BIOME_ORDER, ...valid]));
  }

  if (
    src.selectedBiome === 'rotating' ||
    (typeof src.selectedBiome === 'string' &&
      data.unlockedBiomes.includes(src.selectedBiome as BiomeId))
  ) {
    data.selectedBiome = src.selectedBiome as BiomeId | 'rotating';
  }

  if (typeof src.selectedMode === 'string' && VALID_MODES.includes(src.selectedMode as GameModeId)) {
    data.selectedMode = src.selectedMode as GameModeId;
  }

  const validCharIds = CHARACTERS.map((c) => c.id);
  if (Array.isArray(src.unlockedCharacters)) {
    const valid = src.unlockedCharacters.filter((c): c is CharacterId =>
      validCharIds.includes(c as CharacterId)
    );
    data.unlockedCharacters = Array.from(new Set<CharacterId>(['leo', ...valid]));
  }

  if (
    typeof src.selectedCharacter === 'string' &&
    data.unlockedCharacters.includes(src.selectedCharacter as CharacterId)
  ) {
    data.selectedCharacter = src.selectedCharacter as CharacterId;
  }

  if (src.characterCustomColors && typeof src.characterCustomColors === 'object') {
    const cc = src.characterCustomColors as Record<string, unknown>;
    for (const c of CHARACTERS) {
      if (typeof cc[c.id] === 'string' && /^#[0-9a-fA-F]{6}$/.test(cc[c.id] as string)) {
        data.characterCustomColors[c.id] = cc[c.id] as string;
      }
    }
  }

  const validAcc: AccessoryId[] = [
    'none',
    'explorer_hat',
    'sun_crown',
    'shadow_hood',
    'ancient_helm',
    'celestial_tiara',
  ];
  if (Array.isArray(src.unlockedAccessories)) {
    const list = src.unlockedAccessories.filter((a): a is AccessoryId =>
      validAcc.includes(a as AccessoryId)
    );
    data.unlockedAccessories = Array.from(new Set<AccessoryId>(['none', 'explorer_hat', ...list]));
  }
  if (
    typeof src.selectedAccessory === 'string' &&
    data.unlockedAccessories.includes(src.selectedAccessory as AccessoryId)
  ) {
    data.selectedAccessory = src.selectedAccessory as AccessoryId;
  }

  const validTrails: TrailId[] = [
    'none',
    'gold_dust',
    'magma_sparks',
    'aether_ribbon',
    'shadow_flame',
  ];
  if (Array.isArray(src.unlockedTrails)) {
    const list = src.unlockedTrails.filter((t): t is TrailId =>
      validTrails.includes(t as TrailId)
    );
    data.unlockedTrails = Array.from(new Set<TrailId>(['none', 'gold_dust', ...list]));
  }
  if (
    typeof src.selectedTrail === 'string' &&
    data.unlockedTrails.includes(src.selectedTrail as TrailId)
  ) {
    data.selectedTrail = src.selectedTrail as TrailId;
  }

  if (
    src.selectedCelebration === 'victory_fist' ||
    src.selectedCelebration === 'spin_leap' ||
    src.selectedCelebration === 'rune_salute'
  ) {
    data.selectedCelebration = src.selectedCelebration;
  }

  if (src.upgrades && typeof src.upgrades === 'object') {
    const up = src.upgrades as Record<string, unknown>;
    for (const defU of UPGRADES) {
      data.upgrades[defU.id] = Math.floor(safeClamp(up[defU.id], 0, defU.maxLevel, 0));
    }
  }

  if (src.relicProgress && typeof src.relicProgress === 'object') {
    const rp = src.relicProgress as Record<string, unknown>;
    for (const r of RELICS) {
      const arr = rp[r.id];
      if (Array.isArray(arr) && arr.length === 3) {
        data.relicProgress[r.id] = [Boolean(arr[0]), Boolean(arr[1]), Boolean(arr[2])];
      }
    }
  }

  if (Array.isArray(src.missions)) {
    data.missions = src.missions.filter(
      (m): m is SaveData['missions'][number] =>
        Boolean(m) &&
        typeof m === 'object' &&
        typeof (m as { id?: unknown }).id === 'string' &&
        typeof (m as { target?: unknown }).target === 'number'
    );
  }

  data.dailyMissionDate = typeof src.dailyMissionDate === 'string' ? src.dailyMissionDate : '';
  data.weeklyMissionKey = typeof src.weeklyMissionKey === 'string' ? src.weeklyMissionKey : '';
  data.permanentMissionStep = Math.floor(safeNonNegNumber(src.permanentMissionStep, 0));

  if (Array.isArray(src.unlockedAchievements)) {
    data.unlockedAchievements = Array.from(
      new Set(src.unlockedAchievements.filter((id): id is string => typeof id === 'string'))
    );
  }

  data.dailyRewardDay = Math.floor(safeClamp(src.dailyRewardDay, 0, 6, 0));
  data.lastDailyRewardDate =
    typeof src.lastDailyRewardDate === 'string' ? src.lastDailyRewardDate : '';

  if (src.stats && typeof src.stats === 'object') {
    const st = src.stats as Record<string, unknown>;
    data.stats.totalRuns = Math.floor(safeNonNegNumber(st.totalRuns, 0));
    data.stats.totalDistance = Math.floor(safeNonNegNumber(st.totalDistance, 0));
    data.stats.bestDistance = Math.floor(safeNonNegNumber(st.bestDistance, 0));
    data.stats.bestScore = Math.floor(safeNonNegNumber(st.bestScore, 0));
    data.stats.totalCoinsCollected = Math.floor(safeNonNegNumber(st.totalCoinsCollected, 0));
    data.stats.totalJumps = Math.floor(safeNonNegNumber(st.totalJumps, 0));
    data.stats.totalSlides = Math.floor(safeNonNegNumber(st.totalSlides, 0));
    data.stats.totalObstaclesDodged = Math.floor(safeNonNegNumber(st.totalObstaclesDodged, 0));
    data.stats.totalPowerUpsUsed = Math.floor(safeNonNegNumber(st.totalPowerUpsUsed, 0));
    data.stats.totalEventsSurvived = Math.floor(safeNonNegNumber(st.totalEventsSurvived, 0));
    data.stats.totalPlayTimeSeconds = safeNonNegNumber(st.totalPlayTimeSeconds, 0);

    if (st.biomeDistance && typeof st.biomeDistance === 'object') {
      const bd = st.biomeDistance as Record<string, unknown>;
      for (const b of BIOME_ORDER) {
        data.stats.biomeDistance[b] = Math.floor(safeNonNegNumber(bd[b], 0));
      }
    }

    if (st.bestByMode && typeof st.bestByMode === 'object') {
      const bm = st.bestByMode as Record<string, unknown>;
      for (const m of VALID_MODES) {
        const entry = bm[m] as Record<string, unknown> | undefined;
        if (entry && typeof entry === 'object') {
          data.stats.bestByMode[m] = {
            score: Math.floor(safeNonNegNumber(entry.score, 0)),
            distance: Math.floor(safeNonNegNumber(entry.distance, 0)),
          };
        }
      }
    }
  }

  if (Array.isArray(src.localLeaderboard)) {
    data.localLeaderboard = src.localLeaderboard
      .filter(
        (e): e is SaveData['localLeaderboard'][number] =>
          Boolean(e) && typeof e === 'object' && typeof (e as { score?: unknown }).score === 'number'
      )
      .slice(0, 20);
  }

  if (src.dailyLeaderboard && typeof src.dailyLeaderboard === 'object') {
    const dl = src.dailyLeaderboard as Record<string, unknown>;
    for (const [k, v] of Object.entries(dl)) {
      if (Array.isArray(v)) {
        data.dailyLeaderboard[k] = v
          .filter(
            (e): e is SaveData['localLeaderboard'][number] =>
              Boolean(e) &&
              typeof e === 'object' &&
              typeof (e as { score?: unknown }).score === 'number'
          )
          .slice(0, 10);
      }
    }
  }

  if (src.settings && typeof src.settings === 'object') {
    const s = src.settings as Record<string, unknown>;
    data.settings.masterVolume = safeClamp(s.masterVolume, 0, 1, def.settings.masterVolume);
    data.settings.musicVolume = safeClamp(s.musicVolume, 0, 1, def.settings.musicVolume);
    data.settings.sfxVolume = safeClamp(s.sfxVolume, 0, 1, def.settings.sfxVolume);
    data.settings.muted = Boolean(s.muted);
    data.settings.qualityPreset = VALID_PRESETS.includes(s.qualityPreset as QualityPreset)
      ? (s.qualityPreset as QualityPreset)
      : def.settings.qualityPreset;
    data.settings.tiltControlsEnabled = Boolean(s.tiltControlsEnabled);
    data.settings.showDebugPanel = Boolean(s.showDebugPanel);
    data.settings.tutorialCompleted = Boolean(s.tutorialCompleted);
  }

  return data;
}

export class SaveManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  public getData(): SaveData {
    return this.data;
  }

  public load(): SaveData {
    try {
      const rawJson = window.localStorage.getItem(STORAGE_KEY);
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        const migrated = migrateAndValidateSave(parsed);

        // Gestione di eventuale partita interrotta bruscamente
        if (window.localStorage.getItem(ACTIVE_RUN_KEY) === '1') {
          migrated.interruptedRunNotice = true;
          window.localStorage.removeItem(ACTIVE_RUN_KEY);
        }
        return migrated;
      }
    } catch {
      // Fallback sicuro in caso di JSON corrotto in localStorage
      const fresh = createDefaultSaveData();
      this.persistLocal(fresh);
      return fresh;
    }

    const fresh = createDefaultSaveData();
    this.persistLocal(fresh);
    return fresh;
  }

  public save(mutated?: SaveData): void {
    if (mutated) {
      this.data = mutated;
    }
    this.persistLocal(this.data);
    void this.persistIndexedDb(this.data);
    eventBus.emit('save:updated', this.cloneSave());
  }

  public markRunStarted(): void {
    try {
      window.localStorage.setItem(ACTIVE_RUN_KEY, '1');
    } catch {
      // ignore storage quota errors
    }
  }

  public markRunFinishedCleanly(): void {
    try {
      window.localStorage.removeItem(ACTIVE_RUN_KEY);
      this.data.interruptedRunNotice = false;
    } catch {
      // ignore
    }
  }

  public dismissInterruptedNotice(): void {
    this.data.interruptedRunNotice = false;
    this.save();
  }

  public exportSave(): string {
    return JSON.stringify(this.data, null, 2);
  }

  public importSave(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== 'object') {
        return false;
      }
      const validated = migrateAndValidateSave(parsed);
      this.data = validated;
      this.save();
      return true;
    } catch {
      return false;
    }
  }

  public resetSave(): SaveData {
    this.data = createDefaultSaveData();
    try {
      window.localStorage.removeItem(ACTIVE_RUN_KEY);
    } catch {
      // ignore
    }
    this.save();
    return this.data;
  }

  public cloneSave(): SaveData {
    return JSON.parse(JSON.stringify(this.data)) as SaveData;
  }

  private persistLocal(data: SaveData): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Fallback silenzioso in ambienti ristretti
    }
  }

  private async persistIndexedDb(data: SaveData): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;
    try {
      const request = window.indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(data, 'primary');
        } catch {
          // ignore
        } finally {
          db.close();
        }
      };
    } catch {
      // IndexedDB non disponibile
    }
  }
}

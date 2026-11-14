export type BiomeId = 'jungle' | 'volcano' | 'sky' | 'desert' | 'shadow';

export type GameModeId =
  | 'endless'
  | 'time_attack'
  | 'survival'
  | 'no_powerups'
  | 'hyper_speed'
  | 'coin_rush'
  | 'daily_seed';

export type ObstacleType =
  | 'fallen_log'
  | 'low_wall'
  | 'low_arch'
  | 'chasm_pit'
  | 'broken_bridge'
  | 'collapsed_pillar'
  | 'rolling_boulder'
  | 'swinging_blade'
  | 'pressure_trap'
  | 'fire_jet'
  | 'crumbling_tile'
  | 'volcanic_rock'
  | 'moving_barrier'
  | 'rotating_mechanism'
  | 'narrow_path';

export type PowerUpType =
  | 'magnet'
  | 'shield'
  | 'turbo'
  | 'multiplier'
  | 'double_jump'
  | 'time_slow'
  | 'coin_bonus';

export type DynamicEventType =
  | 'collapsing_bridge'
  | 'avalanche'
  | 'volcanic_eruption'
  | 'sudden_tempest'
  | 'ruined_temple_escape'
  | 'intense_pursuit';

export type SegmentType =
  | 'straight'
  | 'bridge'
  | 'tunnel'
  | 'elevated'
  | 'narrow'
  | 'turn_left'
  | 'turn_right'
  | 'fork_t';

export type Direction = 0 | 1 | 2 | 3; // 0: +Z, 1: +X, 2: -Z, 3: -X
export type Lane = -1 | 0 | 1;

export type GameState = 'MENU' | 'TUTORIAL' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra';

export type UpgradeId =
  | 'magnet_duration'
  | 'starting_shield'
  | 'coin_value'
  | 'score_multiplier'
  | 'xp_boost'
  | 'powerup_duration';

export type CharacterId = 'leo' | 'maya' | 'kaelen' | 'nyx' | 'talos' | 'aethel';

export type TrailId = 'none' | 'gold_dust' | 'magma_sparks' | 'aether_ribbon' | 'shadow_flame';

export type AccessoryId =
  | 'none'
  | 'explorer_hat'
  | 'sun_crown'
  | 'shadow_hood'
  | 'ancient_helm'
  | 'celestial_tiara';

export type CelebrationStyle = 'victory_fist' | 'spin_leap' | 'rune_salute';

export type PlayerAnimState =
  | 'IDLE'
  | 'RUN'
  | 'JUMP'
  | 'DOUBLE_JUMP'
  | 'FALL'
  | 'LAND'
  | 'SLIDE'
  | 'LANE_LEFT'
  | 'LANE_RIGHT'
  | 'STUMBLE'
  | 'CRASH'
  | 'CELEBRATE';

export type ObstacleAvoidMethod = 'LANE' | 'JUMP' | 'SLIDE' | 'TIMED';

export interface ObstaclePlacement {
  id: string;
  type: ObstacleType;
  lane: Lane;
  localZ: number;
  widthLanes: number; // 1 = single lane, 2 = two lanes, 3 = full width
  avoidMethod: ObstacleAvoidMethod;
  height: number; // bounding top Y
  clearanceBottomY: number; // for low_arch / slideable obstacles
  dynamicPhase?: number;
  dynamicSpeed?: number;
  triggered?: boolean;
  destroyed?: boolean;
}

export interface CoinPlacement {
  id: string;
  lane: Lane;
  localZ: number;
  localY: number;
  collected: boolean;
  value: number;
}

export interface PowerUpPlacement {
  id: string;
  type: PowerUpType;
  lane: Lane;
  localZ: number;
  localY: number;
  collected: boolean;
}

export interface RelicFragmentPlacement {
  id: string;
  relicId: string;
  fragmentIndex: number; // 0, 1, 2
  lane: Lane;
  localZ: number;
  localY: number;
  collected: boolean;
}

export interface TrackSegmentData {
  id: number;
  type: SegmentType;
  biome: BiomeId;
  origin: { x: number; y: number; z: number };
  direction: Direction;
  length: number;
  width: number;
  elevation: number;
  obstacles: ObstaclePlacement[];
  coins: CoinPlacement[];
  powerUps: PowerUpPlacement[];
  relicFragments: RelicFragmentPlacement[];
  nextSegmentId: number | null;
  altNextSegmentId: number | null; // Right branch in fork_t (nextSegmentId = left branch)
  turnDir?: 'left' | 'right';
  isBiomeTransition?: boolean;
  previousBiome?: BiomeId;
}

export interface ActivePowerUpState {
  type: PowerUpType;
  remainingSeconds: number;
  totalDurationSeconds: number;
}

export interface ActiveDynamicEvent {
  type: DynamicEventType;
  title: string;
  description: string;
  remainingSeconds: number;
  totalDurationSeconds: number;
  warningSeconds: number;
  bonusAwarded: boolean;
}

export interface MissionProgress {
  id: string;
  category: 'daily' | 'weekly' | 'permanent' | 'realm';
  biome?: BiomeId;
  title: string;
  description: string;
  metric: MissionMetric;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardCrystals: number;
  completed: boolean;
  claimed: boolean;
}

export type MissionMetric =
  | 'distance'
  | 'coins'
  | 'jumps'
  | 'slides'
  | 'obstacles_dodged'
  | 'powerups_used'
  | 'turns_made'
  | 'runs_completed'
  | 'score_single_run'
  | 'no_stumble_distance'
  | 'relic_fragments'
  | 'events_survived'
  | 'biome_distance';

export interface AchievementDefinition {
  id: string;
  category:
    | 'distance'
    | 'score'
    | 'coins'
    | 'skill'
    | 'progression'
    | 'exploration'
    | 'special';
  title: string;
  description: string;
  rewardCrystals: number;
  metric: string;
  target: number;
}

export interface RelicDefinition {
  id: string;
  biome: BiomeId;
  name: string;
  lore: string;
  bonusDescription: string;
  accentColor: string;
  fragmentNames: [string, string, string];
}

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  title: string;
  lore: string;
  unlockType: 'free' | 'coins' | 'crystals' | 'level' | 'relic';
  unlockCost: number;
  unlockRequirementLabel: string;
  baseColor: string;
  secondaryColor: string;
  accentColor: string;
  defaultAccessory: AccessoryId;
  defaultTrail: TrailId;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  maxLevel: number;
  baseCostCoins: number;
  costMultiplier: number;
  effectPerLevelLabel: string;
}

export interface BiomeConfig {
  id: BiomeId;
  name: string;
  subtitle: string;
  description: string;
  unlockLevel: number;
  primaryColor: string;
  secondaryColor: string;
  fogColor: string;
  skyTopColor: string;
  skyHorizonColor: string;
  accentHex: string;
  hazardColor: string;
  signatureObstacles: ObstacleType[];
}

export interface RunTelemetry {
  mode: GameModeId;
  selectedBiome: BiomeId | 'rotating';
  currentBiome: BiomeId;
  seed: string;
  distance: number;
  score: number;
  coins: number;
  crystalsEarned: number;
  multiplier: number;
  speed: number;
  jumps: number;
  slides: number;
  obstaclesDodged: number;
  turnsMade: number;
  powerUpsUsed: number;
  distinctPowerUpsUsed: PowerUpType[];
  stumbles: number;
  eventsSurvived: number;
  relicFragmentsFound: number;
  elapsedSeconds: number;
  timeRemainingSeconds: number | null;
  enemyThreat: number; // 0..1
  biomesVisited: BiomeId[];
  deathReason: string;
  isNewRecord: boolean;
  nearMisses?: number;
  coinStreak?: number;
  overdriveCharge?: number;
  upcomingTurn?: 'left' | 'right' | 'fork' | null;
}

export interface LocalRecordEntry {
  id: string;
  dateIso: string;
  mode: GameModeId;
  biome: BiomeId | 'rotating';
  score: number;
  distance: number;
  coins: number;
  seed: string;
  characterId: CharacterId;
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  qualityPreset: QualityPreset;
  tiltControlsEnabled: boolean;
  showDebugPanel: boolean;
  tutorialCompleted: boolean;
}

export interface SaveData {
  version: number;
  playerName: string;
  coins: number;
  crystals: number;
  xp: number;
  level: number;
  unlockedBiomes: BiomeId[];
  selectedBiome: BiomeId | 'rotating';
  selectedMode: GameModeId;
  unlockedCharacters: CharacterId[];
  selectedCharacter: CharacterId;
  characterCustomColors: Record<CharacterId, string>;
  unlockedAccessories: AccessoryId[];
  selectedAccessory: AccessoryId;
  unlockedTrails: TrailId[];
  selectedTrail: TrailId;
  selectedCelebration: CelebrationStyle;
  upgrades: Record<UpgradeId, number>;
  relicProgress: Record<string, [boolean, boolean, boolean]>;
  missions: MissionProgress[];
  dailyMissionDate: string;
  weeklyMissionKey: string;
  permanentMissionStep: number;
  unlockedAchievements: string[];
  dailyRewardDay: number; // 0..6
  lastDailyRewardDate: string;
  interruptedRunNotice: boolean;
  stats: {
    totalRuns: number;
    totalDistance: number;
    bestDistance: number;
    bestScore: number;
    totalCoinsCollected: number;
    totalJumps: number;
    totalSlides: number;
    totalObstaclesDodged: number;
    totalPowerUpsUsed: number;
    totalEventsSurvived: number;
    totalPlayTimeSeconds: number;
    biomeDistance: Record<BiomeId, number>;
    bestByMode: Record<GameModeId, { score: number; distance: number }>;
  };
  localLeaderboard: LocalRecordEntry[];
  dailyLeaderboard: Record<string, LocalRecordEntry[]>;
  settings: GameSettings;
}

export interface PerformanceMetrics {
  fps: number;
  frameTimeMs: number;
  activeSegments: number;
  pooledSegments: number;
  activeMeshes: number;
  renderScale: number;
  qualityPreset: QualityPreset;
}

export interface TutorialStep {
  id: string;
  title: string;
  instructionDesktop: string;
  instructionMobile: string;
  requiredAction: 'lane' | 'jump' | 'slide' | 'turn' | 'powerup';
}

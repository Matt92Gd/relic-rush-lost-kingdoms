import type {
  AccessoryId,
  AchievementDefinition,
  BiomeConfig,
  BiomeId,
  CharacterDefinition,
  GameModeId,
  PowerUpType,
  RelicDefinition,
  TrailId,
  UpgradeDefinition,
} from '../types/game.types';

export const BIOME_ORDER: BiomeId[] = ['jungle', 'volcano', 'sky', 'desert', 'shadow'];

export const BIOMES: Record<BiomeId, BiomeConfig> = {
  jungle: {
    id: 'jungle',
    name: 'Tempio della Giungla',
    subtitle: 'Rovine di Smeraldo',
    description:
      'Antichi corridoi di pietra coperti di muschio, radici giganti, cascate e ponti sospesi nella foresta.',
    unlockLevel: 1,
    primaryColor: '#486a47',
    secondaryColor: '#7a684b',
    fogColor: '#1b3529',
    skyTopColor: '#133a3a',
    skyHorizonColor: '#5fa87c',
    accentHex: '#34d399',
    hazardColor: '#ef4444',
    signatureObstacles: ['fallen_log', 'low_arch', 'broken_bridge', 'chasm_pit', 'swinging_blade'],
  },
  volcano: {
    id: 'volcano',
    name: 'Regno Vulcanico',
    subtitle: 'Fornace di Ossidiana',
    description:
      'Santuari spaccati sospesi su fiumi di magma, lapilli incandescenti, getti di fuoco e lastre instabili.',
    unlockLevel: 3,
    primaryColor: '#352a2b',
    secondaryColor: '#543528',
    fogColor: '#36130b',
    skyTopColor: '#210906',
    skyHorizonColor: '#b93815',
    accentHex: '#f97316',
    hazardColor: '#fb923c',
    signatureObstacles: ['fire_jet', 'volcanic_rock', 'crumbling_tile', 'chasm_pit', 'rolling_boulder'],
  },
  sky: {
    id: 'sky',
    name: 'Città Celeste',
    subtitle: 'Bastioni tra le Nuvole',
    description:
      'Marmo luminoso e oro antico sospesi ad alta quota, cristalli d’etere, archi eterei e meccanismi celesti.',
    unlockLevel: 6,
    primaryColor: '#d9dee7',
    secondaryColor: '#c9a24b',
    fogColor: '#7eb7d8',
    skyTopColor: '#1d4f8a',
    skyHorizonColor: '#bae6fd',
    accentHex: '#38bdf8',
    hazardColor: '#0284c7',
    signatureObstacles: ['rotating_mechanism', 'moving_barrier', 'narrow_path', 'broken_bridge', 'low_arch'],
  },
  desert: {
    id: 'desert',
    name: 'Deserto Perduto',
    subtitle: 'Cittadella delle Dune',
    description:
      'Piramidi sepolte, arenaria dorata, trappole a pressione e antichi massi di guardia tra tempeste di sabbia.',
    unlockLevel: 9,
    primaryColor: '#c59958',
    secondaryColor: '#8d6435',
    fogColor: '#9c713c',
    skyTopColor: '#3c5a80',
    skyHorizonColor: '#f3c178',
    accentHex: '#f59e0b',
    hazardColor: '#dc2626',
    signatureObstacles: ['rolling_boulder', 'pressure_trap', 'collapsed_pillar', 'low_wall', 'moving_barrier'],
  },
  shadow: {
    id: 'shadow',
    name: 'Regno delle Ombre',
    subtitle: 'Abisso dell’Eclissi',
    description:
      'Atmosfera notturna, rovine ossidiana e cristalli bioluminescenti dove il potere di Malakor è più intenso.',
    unlockLevel: 12,
    primaryColor: '#221c33',
    secondaryColor: '#3e2d5c',
    fogColor: '#120a21',
    skyTopColor: '#070312',
    skyHorizonColor: '#3b1c69',
    accentHex: '#c084fc',
    hazardColor: '#e879f9',
    signatureObstacles: ['swinging_blade', 'rotating_mechanism', 'moving_barrier', 'fire_jet', 'narrow_path'],
  },
};

export interface GameModeMeta {
  id: GameModeId;
  name: string;
  subtitle: string;
  description: string;
  badgeColor: string;
}

export const GAME_MODES: GameModeMeta[] = [
  {
    id: 'endless',
    name: 'Corsa Infinita',
    subtitle: 'Avventura Classica',
    description: 'Fuggi senza limiti con difficoltà crescente, eventi dinamici e transizioni tra regni.',
    badgeColor: '#d4a843',
  },
  {
    id: 'daily_seed',
    name: 'Percorso Giornaliero',
    subtitle: 'Seed Condivisibile',
    description: 'Tracciato identico per tutti nella giornata odierna con classifica locale dedicata.',
    badgeColor: '#38bdf8',
  },
  {
    id: 'time_attack',
    name: 'Corsa a Tempo',
    subtitle: '90 Secondi',
    description: 'Accumula il punteggio più alto possibile prima dello scadere dei 90 secondi.',
    badgeColor: '#f97316',
  },
  {
    id: 'survival',
    name: 'Sopravvivenza',
    subtitle: 'Alta Tensione',
    description: 'Nessuno Scudo e nessun Turbo sul percorso. Resisti più a lungo possibile.',
    badgeColor: '#ef4444',
  },
  {
    id: 'no_powerups',
    name: 'Sfida Pura',
    subtitle: 'Zero Power-Up',
    description: 'Tutti i potenziamenti disattivati: contano solo riflessi e lettura del percorso.',
    badgeColor: '#a855f7',
  },
  {
    id: 'hyper_speed',
    name: 'Alta Velocità',
    subtitle: 'Ritmo Estremo +45%',
    description: 'Inizia subito a velocità elevata con moltiplicatore punti potenziato.',
    badgeColor: '#ec4899',
  },
  {
    id: 'coin_rush',
    name: 'Pioggia d’Oro',
    subtitle: '3x Monete',
    description: 'Percorsi ricchi di scie dorate ideali per accumulare valuta per il negozio.',
    badgeColor: '#eab308',
  },
];

export const POWERUP_INFO: Record<
  PowerUpType,
  { name: string; description: string; baseDuration: number; color: string }
> = {
  magnet: {
    name: 'Magnete',
    description: 'Attira automaticamente tutte le monete vicine.',
    baseDuration: 10,
    color: '#38bdf8',
  },
  shield: {
    name: 'Scudo Runico',
    description: 'Assorbe una collisione distruggendo l’ostacolo e respingendo il nemico.',
    baseDuration: 18,
    color: '#34d399',
  },
  turbo: {
    name: 'Turbo Etereo',
    description: 'Scatto fulmineo con invulnerabilità temporanea e punteggio accelerato.',
    baseDuration: 5.5,
    color: '#f97316',
  },
  multiplier: {
    name: 'Moltiplicatore 2x',
    description: 'Raddoppia tutti i punti guadagnati durante la sua durata.',
    baseDuration: 12,
    color: '#c084fc',
  },
  double_jump: {
    name: 'Doppio Salto',
    description: 'Permette un secondo salto in volo per superare trappole consecutive.',
    baseDuration: 14,
    color: '#facc15',
  },
  time_slow: {
    name: 'Clessidra',
    description: 'Rallenta il flusso temporale del tracciato facilitando le reazioni.',
    baseDuration: 8,
    color: '#2dd4bf',
  },
  coin_bonus: {
    name: 'Oro Regale',
    description: 'Triplica il valore di ogni moneta raccolta.',
    baseDuration: 11,
    color: '#fbbf24',
  },
};

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: 'magnet_duration',
    name: 'Campo Magnetico',
    description: 'Estende durata (+2s/liv) e raggio d’attrazione del Magnete.',
    maxLevel: 5,
    baseCostCoins: 150,
    costMultiplier: 1.75,
    effectPerLevelLabel: '+2s durata, +1.5m raggio',
  },
  {
    id: 'starting_shield',
    name: 'Egida Antica',
    description: 'Potenzia la durata dello Scudo e attiva uno Scudo iniziale dal livello 2.',
    maxLevel: 5,
    baseCostCoins: 220,
    costMultiplier: 1.85,
    effectPerLevelLabel: 'Scudo iniziale al Liv.2+, +3s durata',
  },
  {
    id: 'coin_value',
    name: 'Fiuto del Tesoriere',
    description: 'Aumenta la probabilità di generare monete doppie e triple durante la corsa.',
    maxLevel: 5,
    baseCostCoins: 200,
    costMultiplier: 1.8,
    effectPerLevelLabel: '+15% probabilità monete bonus',
  },
  {
    id: 'score_multiplier',
    name: 'Maestria Esploratore',
    description: 'Incrementa permanentemente il moltiplicatore base di tutti i punti.',
    maxLevel: 5,
    baseCostCoins: 250,
    costMultiplier: 1.9,
    effectPerLevelLabel: '+1x moltiplicatore permanente',
  },
  {
    id: 'xp_boost',
    name: 'Sapienza Perduta',
    description: 'Aumenta l’esperienza ottenuta alla fine di ogni partita.',
    maxLevel: 5,
    baseCostCoins: 180,
    costMultiplier: 1.75,
    effectPerLevelLabel: '+15% XP per livello',
  },
  {
    id: 'powerup_duration',
    name: 'Risonanza Eterea',
    description: 'Estende la durata di tutti i power-up raccolti sul tracciato.',
    maxLevel: 5,
    baseCostCoins: 210,
    costMultiplier: 1.8,
    effectPerLevelLabel: '+12% durata power-up',
  },
];

export const CHARACTERS: CharacterDefinition[] = [
  {
    id: 'leo',
    name: 'Leo Vance',
    title: 'Esploratore Audace',
    lore: 'Cacciatore di reliquie agile e testardo, ha sottratto l’Idolo dell’Eclissi dalle rovine.',
    unlockType: 'free',
    unlockCost: 0,
    unlockRequirementLabel: 'Disponibile subito',
    baseColor: '#2c5f8a',
    secondaryColor: '#c89b3c',
    accentColor: '#38bdf8',
    defaultAccessory: 'explorer_hat',
    defaultTrail: 'gold_dust',
  },
  {
    id: 'maya',
    name: 'Maya Lin',
    title: 'Archeologa dei Segreti',
    lore: 'Decifratrice di glifi antichi, padroneggia le rovine della giungla con agilità acrobatica.',
    unlockType: 'coins',
    unlockCost: 500,
    unlockRequirementLabel: '500 Monete',
    baseColor: '#1f7a63',
    secondaryColor: '#e2b857',
    accentColor: '#34d399',
    defaultAccessory: 'none',
    defaultTrail: 'gold_dust',
  },
  {
    id: 'kaelen',
    name: 'Kaelen',
    title: 'Guardiano Solare',
    lore: 'Campione delle fornaci vulcaniche forgiato nel bronzo sacro e nella cenere.',
    unlockType: 'coins',
    unlockCost: 1200,
    unlockRequirementLabel: '1.200 Monete',
    baseColor: '#9f2a1d',
    secondaryColor: '#f59e0b',
    accentColor: '#fb923c',
    defaultAccessory: 'sun_crown',
    defaultTrail: 'magma_sparks',
  },
  {
    id: 'nyx',
    name: 'Nyx',
    title: 'Viandante delle Ombre',
    lore: 'Silenziosa tessitrice di crepuscolo, sfida Malakor nelle profondità dell’Eclissi.',
    unlockType: 'crystals',
    unlockCost: 15,
    unlockRequirementLabel: '15 Cristalli',
    baseColor: '#3b2563',
    secondaryColor: '#a855f7',
    accentColor: '#e879f9',
    defaultAccessory: 'shadow_hood',
    defaultTrail: 'shadow_flame',
  },
  {
    id: 'talos',
    name: 'Talos-VII',
    title: 'Automa Antico',
    lore: 'Costrutto meccanico alimentato a energia runica, risvegliato dopo millenni di sonno.',
    unlockType: 'crystals',
    unlockCost: 25,
    unlockRequirementLabel: '25 Cristalli',
    baseColor: '#8f6b32',
    secondaryColor: '#38bdf8',
    accentColor: '#22d3ee',
    defaultAccessory: 'ancient_helm',
    defaultTrail: 'aether_ribbon',
  },
  {
    id: 'aethel',
    name: 'Aethel',
    title: 'Sovrana Celeste',
    lore: 'Ultima custode della Città tra le Nuvole, avvolta nella luce pura dei cieli antichi.',
    unlockType: 'level',
    unlockCost: 10,
    unlockRequirementLabel: 'Livello 10 Giocatore',
    baseColor: '#e2e8f0',
    secondaryColor: '#eab308',
    accentColor: '#7dd3fc',
    defaultAccessory: 'celestial_tiara',
    defaultTrail: 'aether_ribbon',
  },
];

export const ACCESSORIES: {
  id: AccessoryId;
  name: string;
  costCrystals: number;
  description: string;
}[] = [
  { id: 'none', name: 'Nessuno', costCrystals: 0, description: 'Aspetto classico senza copricapo.' },
  { id: 'explorer_hat', name: 'Cappello Avventuriero', costCrystals: 0, description: 'Iconico cappello da esplorazione.' },
  { id: 'sun_crown', name: 'Corona Solare', costCrystals: 5, description: 'Raggi dorati forgiati nel fuoco.' },
  { id: 'shadow_hood', name: 'Cappuccio Eclissi', costCrystals: 6, description: 'Velo oscuro con rune violacee.' },
  { id: 'ancient_helm', name: 'Elmo del Costrutto', costCrystals: 8, description: 'Visiera antica con nucleo ciano.' },
  { id: 'celestial_tiara', name: 'Diadema Celeste', costCrystals: 10, description: 'Corona alata della Città Celeste.' },
];

export const TRAILS: {
  id: TrailId;
  name: string;
  costCoins: number;
  colorHex: string;
  description: string;
}[] = [
  { id: 'none', name: 'Nessuna Scia', costCoins: 0, colorHex: '#94a3b8', description: 'Corsa pulita senza particelle.' },
  { id: 'gold_dust', name: 'Polvere d’Oro', costCoins: 0, colorHex: '#fbbf24', description: 'Scia dorata classica.' },
  { id: 'magma_sparks', name: 'Scintille Magmatiche', costCoins: 450, colorHex: '#f97316', description: 'Braci ardenti ad ogni passo.' },
  { id: 'aether_ribbon', name: 'Nastro d’Etere', costCoins: 650, colorHex: '#38bdf8', description: 'Flusso luminoso celeste.' },
  { id: 'shadow_flame', name: 'Fiamma d’Ombra', costCoins: 900, colorHex: '#c084fc', description: 'Aura arcana viola intenso.' },
];

export const RELICS: RelicDefinition[] = [
  {
    id: 'relic_jungle',
    biome: 'jungle',
    name: 'Idolo di Giada',
    lore: 'Scolpito dai sacerdoti della foresta eterna, attira l’oro antico.',
    bonusDescription: '+10% Monete raccolte a fine corsa',
    accentColor: '#34d399',
    fragmentNames: ['Occhio di Smeraldo', 'Cuore della Radice', 'Sigillo del Tempio'],
  },
  {
    id: 'relic_volcano',
    biome: 'volcano',
    name: 'Cuore di Ossidiania',
    lore: 'Pietra fusa che pulsa di fuoco primordiale.',
    bonusDescription: '+15% Durata Turbo e Scudo',
    accentColor: '#f97316',
    fragmentNames: ['Scheggia Lavica', 'Nucleo Ardente', 'Anello della Forgia'],
  },
  {
    id: 'relic_sky',
    biome: 'sky',
    name: 'Astrolabio d’Etere',
    lore: 'Strumento stellare dei naviganti celesti.',
    bonusDescription: '+15% XP guadagnata a fine corsa',
    accentColor: '#38bdf8',
    fragmentNames: ['Lente dei Venti', 'Anello Solare', 'Ago d’Argento'],
  },
  {
    id: 'relic_desert',
    biome: 'desert',
    name: 'Scettro delle Sabbie',
    lore: 'Simbolo di comando dei re sepolti sotto le dune.',
    bonusDescription: '+1x Moltiplicatore punti bonus',
    accentColor: '#f59e0b',
    fragmentNames: ['Scarabeo d’Oro', 'Asta di Bronzo', 'Gemma del Miraggio'],
  },
  {
    id: 'relic_shadow',
    biome: 'shadow',
    name: 'Corona dell’Eclissi',
    lore: 'L’artefatto gemello di quello custodito da Malakor.',
    bonusDescription: 'Riduce del 15% l’aggressività iniziale del nemico',
    accentColor: '#c084fc',
    fragmentNames: ['Punta Lunare', 'Frammento d’Abisso', 'Runa Silente'],
  },
];

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Distanza (5)
  { id: 'dist_250', category: 'distance', title: 'Primi Passi', description: 'Corri 250m in una sola partita.', rewardCrystals: 2, metric: 'run_distance', target: 250 },
  { id: 'dist_1000', category: 'distance', title: 'Maratoneta delle Rovine', description: 'Raggiungi 1.000m in una partita.', rewardCrystals: 4, metric: 'run_distance', target: 1000 },
  { id: 'dist_2500', category: 'distance', title: 'Orizzonte Lontano', description: 'Raggiungi 2.500m in una partita.', rewardCrystals: 6, metric: 'run_distance', target: 2500 },
  { id: 'dist_5000', category: 'distance', title: 'Leggenda Senza Fine', description: 'Raggiungi 5.000m in una partita.', rewardCrystals: 10, metric: 'run_distance', target: 5000 },
  { id: 'total_dist_20k', category: 'distance', title: 'Giramondo Perduto', description: 'Percorri 20.000m cumulativi.', rewardCrystals: 8, metric: 'total_distance', target: 20000 },

  // Punteggio (5)
  { id: 'score_5k', category: 'score', title: 'Esploratore Promettente', description: 'Ottieni 5.000 punti in una partita.', rewardCrystals: 2, metric: 'run_score', target: 5000 },
  { id: 'score_25k', category: 'score', title: 'Cacciatore di Gloria', description: 'Ottieni 25.000 punti in una partita.', rewardCrystals: 4, metric: 'run_score', target: 25000 },
  { id: 'score_75k', category: 'score', title: 'Eroe dei Regni', description: 'Ottieni 75.000 punti in una partita.', rewardCrystals: 6, metric: 'run_score', target: 75000 },
  { id: 'score_150k', category: 'score', title: 'Mito Vivente', description: 'Ottieni 150.000 punti in una partita.', rewardCrystals: 10, metric: 'run_score', target: 150000 },
  { id: 'score_300k', category: 'score', title: 'Oltre l’Eclissi', description: 'Ottieni 300.000 punti in una partita.', rewardCrystals: 15, metric: 'run_score', target: 300000 },

  // Monete (4)
  { id: 'coins_run_100', category: 'coins', title: 'Borsa Piena', description: 'Raccogli 100 monete in una corsa.', rewardCrystals: 2, metric: 'run_coins', target: 100 },
  { id: 'coins_run_350', category: 'coins', title: 'Febbre dell’Oro', description: 'Raccogli 350 monete in una corsa.', rewardCrystals: 5, metric: 'run_coins', target: 350 },
  { id: 'coins_tot_2500', category: 'coins', title: 'Mercante delle Rovine', description: 'Raccogli 2.500 monete totali.', rewardCrystals: 5, metric: 'total_coins', target: 2500 },
  { id: 'coins_tot_10000', category: 'coins', title: 'Tesoriere Reale', description: 'Raccogli 10.000 monete totali.', rewardCrystals: 10, metric: 'total_coins', target: 10000 },

  // Abilità (6)
  { id: 'jumps_50', category: 'skill', title: 'Acrobata', description: 'Esegui 50 salti totali.', rewardCrystals: 2, metric: 'total_jumps', target: 50 },
  { id: 'slides_50', category: 'skill', title: 'Ombra Radente', description: 'Esegui 50 scivolate totali.', rewardCrystals: 2, metric: 'total_slides', target: 50 },
  { id: 'dodge_100', category: 'skill', title: 'Riflessi d’Acciaio', description: 'Evita 100 ostacoli in carriera.', rewardCrystals: 4, metric: 'total_dodged', target: 100 },
  { id: 'dodge_1000', category: 'skill', title: 'Intoccabile', description: 'Evita 1.000 ostacoli in carriera.', rewardCrystals: 8, metric: 'total_dodged', target: 1000 },
  { id: 'clean_750', category: 'skill', title: 'Corsa Perfetta', description: 'Corri 750m senza inciampare.', rewardCrystals: 6, metric: 'no_stumble_distance', target: 750 },
  { id: 'turns_run_10', category: 'skill', title: 'Maestro dei Labirinti', description: 'Affronta 10 curve in una sola corsa.', rewardCrystals: 3, metric: 'run_turns', target: 10 },

  // Progressione (4)
  { id: 'level_3', category: 'progression', title: 'Apprendista', description: 'Raggiungi il Livello 3.', rewardCrystals: 3, metric: 'player_level', target: 3 },
  { id: 'level_8', category: 'progression', title: 'Veterano', description: 'Raggiungi il Livello 8.', rewardCrystals: 6, metric: 'player_level', target: 8 },
  { id: 'level_15', category: 'progression', title: 'Gran Maestro', description: 'Raggiungi il Livello 15.', rewardCrystals: 12, metric: 'player_level', target: 15 },
  { id: 'upgrade_max', category: 'progression', title: 'Potenza Massima', description: 'Porta un potenziamento al Livello 5.', rewardCrystals: 8, metric: 'max_upgrade_level', target: 5 },

  // Esplorazione (4)
  { id: 'biomes_3', category: 'exploration', title: 'Viaggiatore dei Regni', description: 'Visita 3 biomi diversi.', rewardCrystals: 4, metric: 'biomes_unlocked', target: 3 },
  { id: 'biomes_5', category: 'exploration', title: 'Conquistatore', description: 'Sblocca tutti e 5 i biomi.', rewardCrystals: 10, metric: 'biomes_unlocked', target: 5 },
  { id: 'relic_first', category: 'exploration', title: 'Custode di Reliquie', description: 'Completa la tua prima Reliquia Antica.', rewardCrystals: 7, metric: 'relics_completed', target: 1 },
  { id: 'relic_all', category: 'exploration', title: 'Archeologo Supremo', description: 'Completa tutte e 5 le Reliquie.', rewardCrystals: 20, metric: 'relics_completed', target: 5 },

  // Sfide Speciali (4)
  { id: 'powerups_4_run', category: 'special', title: 'Arsenale Etereo', description: 'Attiva 4 power-up diversi in una sola corsa.', rewardCrystals: 4, metric: 'run_distinct_powerups', target: 4 },
  { id: 'events_5', category: 'special', title: 'Superstite del Cataclisma', description: 'Sopravvivi a 5 Eventi Dinamici.', rewardCrystals: 6, metric: 'total_events', target: 5 },
  { id: 'chars_3', category: 'special', title: 'Compagnia di Ventura', description: 'Sblocca almeno 3 personaggi.', rewardCrystals: 6, metric: 'characters_unlocked', target: 3 },
  { id: 'daily_runner', category: 'special', title: 'Sfida del Giorno', description: 'Completa una partita in Percorso Giornaliero.', rewardCrystals: 4, metric: 'daily_runs', target: 1 },
];

export const DAILY_REWARDS = [
  { day: 1, label: '100 Monete', coins: 100, crystals: 0 },
  { day: 2, label: '2 Cristalli', coins: 0, crystals: 2 },
  { day: 3, label: '200 Monete', coins: 200, crystals: 0 },
  { day: 4, label: '3 Cristalli', coins: 0, crystals: 3 },
  { day: 5, label: '350 Monete', coins: 350, crystals: 0 },
  { day: 6, label: '5 Cristalli', coins: 0, crystals: 5 },
  { day: 7, label: '600 Monete + 6 Cristalli', coins: 600, crystals: 6 },
];

export function getUpgradeCost(def: UpgradeDefinition, currentLevel: number): number {
  return Math.round(def.baseCostCoins * Math.pow(def.costMultiplier, currentLevel));
}

export function getXpRequiredForLevel(level: number): number {
  return Math.round(250 * Math.pow(level, 1.35));
}

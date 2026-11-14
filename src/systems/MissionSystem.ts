import { BIOMES } from '../data/gameCatalog';
import { SeededRandom } from '../core/SeededRandom';
import { eventBus } from '../core/EventBus';
import type { BiomeId, MissionMetric, MissionProgress, RunTelemetry } from '../types/game.types';
import type { SaveManager } from './SaveManager';
import type { ProgressionSystem } from './ProgressionSystem';

interface MissionTemplate {
  title: string;
  description: string;
  metric: MissionMetric;
  target: number;
  rewardCoins: number;
  rewardCrystals: number;
}

const DAILY_POOL: MissionTemplate[] = [
  { title: 'Corsa Mattutina', description: 'Percorri 800m cumulativi.', metric: 'distance', target: 800, rewardCoins: 160, rewardCrystals: 1 },
  { title: 'Cacciatore di Monete', description: 'Raccogli 120 monete.', metric: 'coins', target: 120, rewardCoins: 180, rewardCrystals: 1 },
  { title: 'Salto Felino', description: 'Esegui 25 salti in corsa.', metric: 'jumps', target: 25, rewardCoins: 140, rewardCrystals: 1 },
  { title: 'Scivolata Rapida', description: 'Esegui 18 scivolate.', metric: 'slides', target: 18, rewardCoins: 140, rewardCrystals: 1 },
  { title: 'Schivata Maestra', description: 'Evita 35 ostacoli.', metric: 'obstacles_dodged', target: 35, rewardCoins: 175, rewardCrystals: 1 },
  { title: 'Collezionista Etereo', description: 'Attiva 4 power-up.', metric: 'powerups_used', target: 4, rewardCoins: 165, rewardCrystals: 2 },
  { title: 'Maestro delle Curve', description: 'Supera 8 curve a 90°.', metric: 'turns_made', target: 8, rewardCoins: 150, rewardCrystals: 1 },
];

const WEEKLY_POOL: MissionTemplate[] = [
  { title: 'Spedizione Settimanale', description: 'Percorri 6.000m totali.', metric: 'distance', target: 6000, rewardCoins: 550, rewardCrystals: 5 },
  { title: 'Forziere del Re', description: 'Raccogli 900 monete.', metric: 'coins', target: 900, rewardCoins: 600, rewardCrystals: 4 },
  { title: 'Intrepido', description: 'Evita 250 ostacoli.', metric: 'obstacles_dodged', target: 250, rewardCoins: 500, rewardCrystals: 5 },
  { title: 'Sopravvissuto al Caos', description: 'Supera 4 Eventi Dinamici.', metric: 'events_survived', target: 4, rewardCoins: 650, rewardCrystals: 6 },
  { title: 'Veterano dell’Arena', description: 'Completa 8 partite.', metric: 'runs_completed', target: 8, rewardCoins: 480, rewardCrystals: 4 },
];

const PERMANENT_CHAIN: MissionTemplate[] = [
  { title: 'Battesimo dell’Esploratore', description: 'Corri 500m totali.', metric: 'distance', target: 500, rewardCoins: 150, rewardCrystals: 2 },
  { title: 'Oro Antico', description: 'Raccogli 250 monete totali.', metric: 'coins', target: 250, rewardCoins: 200, rewardCrystals: 2 },
  { title: 'Punteggio Rivelatore', description: 'Supera 15.000 punti in una partita.', metric: 'score_single_run', target: 15000, rewardCoins: 300, rewardCrystals: 3 },
  { title: 'Corsa Pulita', description: 'Corri 600m in una partita senza inciampare.', metric: 'no_stumble_distance', target: 600, rewardCoins: 350, rewardCrystals: 4 },
  { title: 'Cacciatore di Reliquie', description: 'Trova 3 Frammenti di Reliquia.', metric: 'relic_fragments', target: 3, rewardCoins: 450, rewardCrystals: 5 },
  { title: 'Dominatore delle Rovine', description: 'Evita 500 ostacoli.', metric: 'obstacles_dodged', target: 500, rewardCoins: 600, rewardCrystals: 6 },
];

const REALM_CHALLENGES: Array<MissionTemplate & { id: string; biome: BiomeId; unlocksBiome?: BiomeId }> = [
  // Jungle (3)
  { id: 'realm_jungle_1', biome: 'jungle', title: 'Sentiero della Giungla I', description: 'Percorri 600m nel Tempio della Giungla.', metric: 'biome_distance', target: 600, rewardCoins: 200, rewardCrystals: 2, unlocksBiome: 'volcano' },
  { id: 'realm_jungle_2', biome: 'jungle', title: 'Sentiero della Giungla II', description: 'Percorri 2.000m nel Tempio della Giungla.', metric: 'biome_distance', target: 2000, rewardCoins: 350, rewardCrystals: 3 },
  { id: 'realm_jungle_3', biome: 'jungle', title: 'Custode di Giada', description: 'Percorri 5.000m nel Tempio della Giungla.', metric: 'biome_distance', target: 5000, rewardCoins: 600, rewardCrystals: 5 },
  // Volcano (3)
  { id: 'realm_volcano_1', biome: 'volcano', title: 'Cuore della Forgia I', description: 'Percorri 700m nel Regno Vulcanico.', metric: 'biome_distance', target: 700, rewardCoins: 240, rewardCrystals: 2, unlocksBiome: 'sky' },
  { id: 'realm_volcano_2', biome: 'volcano', title: 'Cuore della Forgia II', description: 'Percorri 2.200m nel Regno Vulcanico.', metric: 'biome_distance', target: 2200, rewardCoins: 400, rewardCrystals: 4 },
  { id: 'realm_volcano_3', biome: 'volcano', title: 'Signore della Lava', description: 'Percorri 5.500m nel Regno Vulcanico.', metric: 'biome_distance', target: 5500, rewardCoins: 700, rewardCrystals: 6 },
  // Sky (3)
  { id: 'realm_sky_1', biome: 'sky', title: 'Venti Celesti I', description: 'Percorri 800m nella Città Celeste.', metric: 'biome_distance', target: 800, rewardCoins: 280, rewardCrystals: 3, unlocksBiome: 'desert' },
  { id: 'realm_sky_2', biome: 'sky', title: 'Venti Celesti II', description: 'Percorri 2.500m nella Città Celeste.', metric: 'biome_distance', target: 2500, rewardCoins: 450, rewardCrystals: 4 },
  { id: 'realm_sky_3', biome: 'sky', title: 'Guardiano d’Etere', description: 'Percorri 6.000m nella Città Celeste.', metric: 'biome_distance', target: 6000, rewardCoins: 750, rewardCrystals: 7 },
  // Desert (3)
  { id: 'realm_desert_1', biome: 'desert', title: 'Sabbie del Tempo I', description: 'Percorri 900m nel Deserto Perduto.', metric: 'biome_distance', target: 900, rewardCoins: 320, rewardCrystals: 3, unlocksBiome: 'shadow' },
  { id: 'realm_desert_2', biome: 'desert', title: 'Sabbie del Tempo II', description: 'Percorri 2.800m nel Deserto Perduto.', metric: 'biome_distance', target: 2800, rewardCoins: 500, rewardCrystals: 5 },
  { id: 'realm_desert_3', biome: 'desert', title: 'Sovrano delle Dune', description: 'Percorri 6.500m nel Deserto Perduto.', metric: 'biome_distance', target: 6500, rewardCoins: 800, rewardCrystals: 7 },
  // Shadow (3)
  { id: 'realm_shadow_1', biome: 'shadow', title: 'Eclissi Profonda I', description: 'Percorri 1.000m nel Regno delle Ombre.', metric: 'biome_distance', target: 1000, rewardCoins: 400, rewardCrystals: 4 },
  { id: 'realm_shadow_2', biome: 'shadow', title: 'Eclissi Profonda II', description: 'Percorri 3.000m nel Regno delle Ombre.', metric: 'biome_distance', target: 3000, rewardCoins: 650, rewardCrystals: 6 },
  { id: 'realm_shadow_3', biome: 'shadow', title: 'Domatore d’Ombre', description: 'Percorri 7.500m nel Regno delle Ombre.', metric: 'biome_distance', target: 7500, rewardCoins: 1000, rewardCrystals: 10 },
];

export class MissionSystem {
  constructor(
    private readonly saveManager: SaveManager,
    private readonly progression?: ProgressionSystem
  ) {
    this.ensureMissionsInitialized();
  }

  public static getTodayKey(date: Date = new Date()): string {
    return date.toISOString().slice(0, 10);
  }

  public static getWeekKey(date: Date = new Date()): string {
    const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
    const week = Math.ceil((days + startOfYear.getUTCDay() + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  public ensureMissionsInitialized(now: Date = new Date()): void {
    const data = this.saveManager.getData();
    const today = MissionSystem.getTodayKey(now);
    const weekKey = MissionSystem.getWeekKey(now);
    let dirty = false;

    if (data.dailyMissionDate !== today || !data.missions.some((m) => m.category === 'daily')) {
      data.missions = data.missions.filter((m) => m.category !== 'daily');
      const rng = new SeededRandom(`DAILY-MISSIONS-${today}`);
      const indices = this.pickUniqueIndices(DAILY_POOL.length, 3, rng);
      indices.forEach((idx, i) => {
        const tpl = DAILY_POOL[idx];
        data.missions.push({
          id: `daily_${today}_${i}`,
          category: 'daily',
          title: tpl.title,
          description: tpl.description,
          metric: tpl.metric,
          target: tpl.target,
          progress: 0,
          rewardCoins: tpl.rewardCoins,
          rewardCrystals: tpl.rewardCrystals,
          completed: false,
          claimed: false,
        });
      });
      data.dailyMissionDate = today;
      dirty = true;
    }

    if (data.weeklyMissionKey !== weekKey || !data.missions.some((m) => m.category === 'weekly')) {
      data.missions = data.missions.filter((m) => m.category !== 'weekly');
      const rng = new SeededRandom(`WEEKLY-MISSIONS-${weekKey}`);
      const indices = this.pickUniqueIndices(WEEKLY_POOL.length, 3, rng);
      indices.forEach((idx, i) => {
        const tpl = WEEKLY_POOL[idx];
        data.missions.push({
          id: `weekly_${weekKey}_${i}`,
          category: 'weekly',
          title: tpl.title,
          description: tpl.description,
          metric: tpl.metric,
          target: tpl.target,
          progress: 0,
          rewardCoins: tpl.rewardCoins,
          rewardCrystals: tpl.rewardCrystals,
          completed: false,
          claimed: false,
        });
      });
      data.weeklyMissionKey = weekKey;
      dirty = true;
    }

    if (!data.missions.some((m) => m.category === 'permanent')) {
      data.missions.push(this.createPermanentMission(data.permanentMissionStep));
      dirty = true;
    }

    for (const rc of REALM_CHALLENGES) {
      if (!data.missions.some((m) => m.id === rc.id)) {
        data.missions.push({
          id: rc.id,
          category: 'realm',
          biome: rc.biome,
          title: rc.title,
          description: rc.description,
          metric: rc.metric,
          target: rc.target,
          progress: Math.floor(data.stats.biomeDistance[rc.biome] ?? 0),
          rewardCoins: rc.rewardCoins,
          rewardCrystals: rc.rewardCrystals,
          completed: (data.stats.biomeDistance[rc.biome] ?? 0) >= rc.target,
          claimed: false,
        });
        dirty = true;
      }
    }

    if (dirty) {
      this.saveManager.save();
    }
  }

  private createPermanentMission(step: number): MissionProgress {
    const base = PERMANENT_CHAIN[step % PERMANENT_CHAIN.length];
    const loop = Math.floor(step / PERMANENT_CHAIN.length);
    const scale = 1 + loop * 1.5;
    return {
      id: `perm_${step}`,
      category: 'permanent',
      title: loop > 0 ? `${base.title} +${loop}` : base.title,
      description: base.description,
      metric: base.metric,
      target: Math.round(base.target * scale),
      progress: 0,
      rewardCoins: Math.round(base.rewardCoins * scale),
      rewardCrystals: base.rewardCrystals + loop * 2,
      completed: false,
      claimed: false,
    };
  }

  private pickUniqueIndices(length: number, count: number, rng: SeededRandom): number[] {
    const pool = Array.from({ length }, (_, i) => i);
    const chosen: number[] = [];
    while (chosen.length < count && pool.length > 0) {
      const pickIdx = rng.int(0, pool.length - 1);
      chosen.push(pool.splice(pickIdx, 1)[0]);
    }
    return chosen;
  }

  public recordRunProgress(
    telemetry: RunTelemetry,
    biomeDistancesThisRun: Record<BiomeId, number>,
    cleanDistanceBestInRun: number
  ): MissionProgress[] {
    const data = this.saveManager.getData();
    const newlyCompleted: MissionProgress[] = [];

    for (const m of data.missions) {
      if (m.completed) continue;

      switch (m.metric) {
        case 'distance':
          m.progress = Math.min(m.target, m.progress + Math.floor(telemetry.distance));
          break;
        case 'coins':
          m.progress = Math.min(m.target, m.progress + telemetry.coins);
          break;
        case 'jumps':
          m.progress = Math.min(m.target, m.progress + telemetry.jumps);
          break;
        case 'slides':
          m.progress = Math.min(m.target, m.progress + telemetry.slides);
          break;
        case 'obstacles_dodged':
          m.progress = Math.min(m.target, m.progress + telemetry.obstaclesDodged);
          break;
        case 'powerups_used':
          m.progress = Math.min(m.target, m.progress + telemetry.powerUpsUsed);
          break;
        case 'turns_made':
          m.progress = Math.min(m.target, m.progress + telemetry.turnsMade);
          break;
        case 'runs_completed':
          m.progress = Math.min(m.target, m.progress + 1);
          break;
        case 'score_single_run':
          m.progress = Math.max(m.progress, Math.floor(telemetry.score));
          break;
        case 'no_stumble_distance':
          m.progress = Math.max(m.progress, Math.floor(cleanDistanceBestInRun));
          break;
        case 'relic_fragments':
          m.progress = Math.min(m.target, m.progress + telemetry.relicFragmentsFound);
          break;
        case 'events_survived':
          m.progress = Math.min(m.target, m.progress + telemetry.eventsSurvived);
          break;
        case 'biome_distance':
          if (m.biome) {
            const add = Math.floor(biomeDistancesThisRun[m.biome] ?? 0);
            m.progress = Math.min(m.target, m.progress + add);
          }
          break;
      }

      if (m.progress >= m.target) {
        m.progress = m.target;
        m.completed = true;
        newlyCompleted.push({ ...m });

        eventBus.emit('mission:completed', {
          title: m.title,
          rewardCoins: m.rewardCoins,
          rewardCrystals: m.rewardCrystals,
        });

        // Se è una Sfida del Regno che sblocca il bioma successivo
        const realmDef = REALM_CHALLENGES.find((rc) => rc.id === m.id);
        if (realmDef?.unlocksBiome && this.progression) {
          this.progression.unlockBiome(realmDef.unlocksBiome);
        }
      }
    }

    if (newlyCompleted.length > 0) {
      eventBus.emit('toast:message', {
        title: `${newlyCompleted.length} Mission${newlyCompleted.length > 1 ? 'i Completate' : 'e Completata'}!`,
        subtitle: newlyCompleted.map((c) => c.title).join(', '),
        kind: 'reward',
      });
    }

    this.saveManager.save();
    return newlyCompleted;
  }

  public claimMission(missionId: string): boolean {
    const data = this.saveManager.getData();
    const mission = data.missions.find((m) => m.id === missionId);
    if (!mission || !mission.completed || mission.claimed) {
      return false;
    }

    mission.claimed = true;
    data.coins += mission.rewardCoins;
    data.crystals += mission.rewardCrystals;

    // Se è una missione permanente, genera subito il passo successivo
    if (mission.category === 'permanent') {
      data.permanentMissionStep += 1;
      data.missions = data.missions.filter((m) => m.id !== mission.id);
      data.missions.push(this.createPermanentMission(data.permanentMissionStep));
    }

    this.saveManager.save();
    eventBus.emit('audio:sfx', { sfx: 'achievement' });
    eventBus.emit('toast:message', {
      title: `Ricompensa Riscossa`,
      subtitle: `+${mission.rewardCoins} Monete, +${mission.rewardCrystals} Cristalli`,
      kind: 'reward',
    });

    const realmDef = REALM_CHALLENGES.find((rc) => rc.id === missionId);
    if (realmDef?.unlocksBiome && this.progression) {
      this.progression.unlockBiome(realmDef.unlocksBiome);
      eventBus.emit('toast:message', {
        title: `Regno Sbloccato!`,
        subtitle: `${BIOMES[realmDef.unlocksBiome].name} ora accessibile`,
        kind: 'reward',
      });
    }

    return true;
  }
}

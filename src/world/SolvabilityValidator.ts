import type { Lane, ObstaclePlacement, TrackSegmentData } from '../types/game.types';

export interface ValidationReport {
  valid: boolean;
  removedCount: number;
  reasons: string[];
}

export class SolvabilityValidator {
  public static getCoveredLanes(lane: Lane, widthLanes: number): Lane[] {
    if (widthLanes >= 3) return [-1, 0, 1];
    if (widthLanes === 2) {
      if (lane === -1) return [-1, 0];
      if (lane === 1) return [0, 1];
      return [-1, 0];
    }
    return [lane];
  }

  public static getMinGapZ(expectedSpeed: number): number {
    // Tempo minimo per completare un'azione (salto/scivolata/cambio corsia) + reazione umana (0.30s)
    return Math.max(8.0, expectedSpeed * 0.52);
  }

  /**
   * Verifica e ripara gli ostacoli di un segmento garantendo che il segmento sia sempre superabile.
   */
  public static validateAndAdjust(
    segment: TrackSegmentData,
    expectedSpeed: number,
    isAfterTurn: boolean,
    prevSegmentLastObstacleZFromExit: number = 999
  ): ValidationReport {
    const reasons: string[] = [];
    const minGapZ = SolvabilityValidator.getMinGapZ(expectedSpeed);
    const isTurn =
      segment.type === 'turn_left' || segment.type === 'turn_right' || segment.type === 'fork_t';

    const safeStartZ = isAfterTurn ? 8.0 : Math.max(2.0, minGapZ - prevSegmentLastObstacleZFromExit);
    const safeEndZ = isTurn ? segment.length - 12.5 : segment.length - 2.0;

    // Ordina per posizione longitudinale
    const sorted = [...segment.obstacles].sort((a, b) => a.localZ - b.localZ);
    const accepted: ObstaclePlacement[] = [];
    let removedCount = 0;

    for (const obs of sorted) {
      // 1. Verifica zone sicure di curva e ingresso segmento
      if (obs.localZ < safeStartZ || obs.localZ > safeEndZ) {
        removedCount += 1;
        reasons.push(`Removed ${obs.type} at z=${obs.localZ.toFixed(1)} outside safe bounds`);
        continue;
      }

      // 2. Nei tratti stretti la corsia 0 non può mai avere un ostacolo non-saltabile/non-scivolabile
      if (segment.type === 'narrow' && obs.avoidMethod === 'LANE') {
        const covered = SolvabilityValidator.getCoveredLanes(obs.lane, obs.widthLanes);
        if (covered.includes(0)) {
          removedCount += 1;
          reasons.push(`Removed unpassable ${obs.type} on narrow center lane`);
          continue;
        }
      }

      // 3. Controllo conflitti con ostacoli vicini nella stessa finestra (allineata con isSegmentSolvable)
      const conflictWindow = minGapZ * 0.72;
      const nearby = accepted.filter((a) => Math.abs(obs.localZ - a.localZ) < conflictWindow);
      if (nearby.length === 0) {
        accepted.push(obs);
        continue;
      }

      // Se esiste un ostacolo vicino che richiede già JUMP o SLIDE su più corsie, evita sovrapposizioni
      const hasMultiLaneActionNearby = nearby.some(
        (n) => (n.avoidMethod === 'JUMP' || n.avoidMethod === 'SLIDE') && n.widthLanes >= 2
      );
      if (hasMultiLaneActionNearby) {
        removedCount += 1;
        reasons.push(`Removed ${obs.type} too close to multi-lane action obstacle`);
        continue;
      }

      // Se l'ostacolo corrente blocca l'unica corsia libera in questa finestra di Z, scartalo
      const blockedLanes = new Set<Lane>();
      for (const n of nearby) {
        for (const l of SolvabilityValidator.getCoveredLanes(n.lane, n.widthLanes)) {
          blockedLanes.add(l);
        }
      }
      for (const l of SolvabilityValidator.getCoveredLanes(obs.lane, obs.widthLanes)) {
        blockedLanes.add(l);
      }

      const candidateLanes: Lane[] = segment.type === 'narrow' ? [0] : [-1, 0, 1];
      const hasCompletelyClearLane = candidateLanes.some((l) => !blockedLanes.has(l));

      // Se non rimane alcuna corsia libera, consentito SOLO se è un singolo ostacolo JUMP/SLIDE isolato
      if (!hasCompletelyClearLane) {
        removedCount += 1;
        reasons.push(`Removed ${obs.type} closing all escape lanes in gap`);
        continue;
      }

      accepted.push(obs);
    }

    segment.obstacles = accepted;
    return {
      valid: SolvabilityValidator.isSegmentSolvable(segment, expectedSpeed),
      removedCount,
      reasons,
    };
  }

  /**
   * Verifica booleana pura di superabilità per test e garanzie formali.
   */
  public static isSegmentSolvable(segment: TrackSegmentData, expectedSpeed: number): boolean {
    const minGapZ = SolvabilityValidator.getMinGapZ(expectedSpeed);
    const isTurn =
      segment.type === 'turn_left' || segment.type === 'turn_right' || segment.type === 'fork_t';

    for (const obs of segment.obstacles) {
      if (isTurn && obs.localZ > segment.length - 11.5) return false;
      if (segment.type === 'narrow' && obs.avoidMethod === 'LANE') {
        if (SolvabilityValidator.getCoveredLanes(obs.lane, obs.widthLanes).includes(0)) {
          return false;
        }
      }
    }

    const sorted = [...segment.obstacles].sort((a, b) => a.localZ - b.localZ);
    for (let i = 0; i < sorted.length; i++) {
      const windowObs = [sorted[i]];
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].localZ - sorted[i].localZ < minGapZ * 0.7) {
          windowObs.push(sorted[j]);
        }
      }

      if (windowObs.length > 1) {
        const blocked = new Set<Lane>();
        for (const w of windowObs) {
          for (const l of SolvabilityValidator.getCoveredLanes(w.lane, w.widthLanes)) {
            blocked.add(l);
          }
        }
        const lanes: Lane[] = segment.type === 'narrow' ? [0] : [-1, 0, 1];
        if (!lanes.some((l) => !blocked.has(l))) {
          return false;
        }
      }
    }

    return true;
  }
}

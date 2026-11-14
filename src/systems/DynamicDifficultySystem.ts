import type { GameModeId } from '../types/game.types';

export interface DifficultySnapshot {
  tier: number;
  baseSpeed: number; // m/s
  obstacleDensity: number; // 0..1
  comboProbability: number; // 0..1
  turnProbability: number; // 0..1
  movingTrapProbability: number; // 0..1
  forkProbability: number; // 0..1
}

export class DynamicDifficultySystem {
  public evaluate(distance: number, mode: GameModeId): DifficultySnapshot {
    // Progressione graduale e accessibile nei primi metri, impegnativa oltre i 1000m
    const progress = Math.min(1, distance / 3200);
    const tier = 1 + Math.floor(distance / 450);

    let startSpeed = 14.5;
    let maxSpeed = 33.5;

    if (mode === 'hyper_speed') {
      startSpeed = 21.0;
      maxSpeed = 38.0;
    } else if (mode === 'survival') {
      startSpeed = 16.5;
      maxSpeed = 36.0;
    }

    // Curva asintotica morbida
    const speedCurve = 1 - Math.exp(-distance / 1450);
    const baseSpeed = startSpeed + (maxSpeed - startSpeed) * speedCurve;

    const obstacleDensity = Math.min(
      0.88,
      0.28 + progress * 0.52 + (mode === 'survival' ? 0.1 : 0)
    );
    const comboProbability = Math.min(0.65, 0.08 + progress * 0.55);
    const turnProbability = Math.min(0.32, 0.16 + progress * 0.14);
    const movingTrapProbability = Math.min(0.55, 0.05 + progress * 0.45);
    const forkProbability = Math.min(0.16, 0.06 + progress * 0.08);

    return {
      tier,
      baseSpeed,
      obstacleDensity,
      comboProbability,
      turnProbability,
      movingTrapProbability,
      forkProbability,
    };
  }
}

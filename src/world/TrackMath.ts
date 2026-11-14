import type { Direction, Lane, TrackSegmentData } from '../types/game.types';

export const TRACK_WIDTH = 6.0;
export const LANE_WIDTH = 1.9;

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export class TrackMath {
  public static getForward(dir: Direction): Vec3Like {
    switch (dir) {
      case 0:
        return { x: 0, y: 0, z: 1 };
      case 1:
        return { x: 1, y: 0, z: 0 };
      case 2:
        return { x: 0, y: 0, z: -1 };
      case 3:
        return { x: -1, y: 0, z: 0 };
    }
  }

  public static getRight(dir: Direction): Vec3Like {
    switch (dir) {
      case 0:
        return { x: 1, y: 0, z: 0 };
      case 1:
        return { x: 0, y: 0, z: -1 };
      case 2:
        return { x: -1, y: 0, z: 0 };
      case 3:
        return { x: 0, y: 0, z: 1 };
    }
  }

  public static getYaw(dir: Direction): number {
    switch (dir) {
      case 0:
        return 0;
      case 1:
        return Math.PI / 2;
      case 2:
        return Math.PI;
      case 3:
        return -Math.PI / 2;
    }
  }

  public static turnLeft(dir: Direction): Direction {
    return ((dir + 3) % 4) as Direction;
  }

  public static turnRight(dir: Direction): Direction {
    return ((dir + 1) % 4) as Direction;
  }

  public static laneToOffset(lane: Lane | number): number {
    return lane * LANE_WIDTH;
  }

  public static localToWorld(
    origin: Vec3Like,
    direction: Direction,
    localZ: number,
    lateralOffset: number,
    localY: number = 0
  ): Vec3Like {
    const fwd = TrackMath.getForward(direction);
    const right = TrackMath.getRight(direction);
    return {
      x: origin.x + fwd.x * localZ + right.x * lateralOffset,
      y: origin.y + localY,
      z: origin.z + fwd.z * localZ + right.z * lateralOffset,
    };
  }

  public static worldToLocal(
    segment: Pick<TrackSegmentData, 'origin' | 'direction'>,
    worldPos: Vec3Like
  ): { localZ: number; lateralOffset: number; localY: number } {
    const fwd = TrackMath.getForward(segment.direction);
    const right = TrackMath.getRight(segment.direction);
    const dx = worldPos.x - segment.origin.x;
    const dy = worldPos.y - segment.origin.y;
    const dz = worldPos.z - segment.origin.z;
    return {
      localZ: dx * fwd.x + dz * fwd.z,
      lateralOffset: dx * right.x + dz * right.z,
      localY: dy,
    };
  }

  /**
   * Calcola origine di uscita per segmenti dritti o di svolta/bivio.
   */
  public static getExitOrigin(
    origin: Vec3Like,
    direction: Direction,
    length: number,
    width: number,
    branch: 'straight' | 'left' | 'right'
  ): { origin: Vec3Like; direction: Direction } {
    const fwd = TrackMath.getForward(direction);
    if (branch === 'straight') {
      return {
        origin: {
          x: origin.x + fwd.x * length,
          y: origin.y,
          z: origin.z + fwd.z * length,
        },
        direction,
      };
    }

    const junctionCenterDist = length - width / 2;
    const center: Vec3Like = {
      x: origin.x + fwd.x * junctionCenterDist,
      y: origin.y,
      z: origin.z + fwd.z * junctionCenterDist,
    };

    const nextDir = branch === 'left' ? TrackMath.turnLeft(direction) : TrackMath.turnRight(direction);
    const nextFwd = TrackMath.getForward(nextDir);
    return {
      origin: {
        x: center.x + nextFwd.x * (width / 2),
        y: center.y,
        z: center.z + nextFwd.z * (width / 2),
      },
      direction: nextDir,
    };
  }

  public static shortestAngleLerp(current: number, target: number, t: number): number {
    let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * t;
  }
}

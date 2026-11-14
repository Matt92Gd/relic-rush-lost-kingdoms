import { FreeCamera, Scene, Vector3 } from '@babylonjs/core';
import { TrackMath } from '../world/TrackMath';

export class CameraController {
  public readonly camera: FreeCamera;
  private currentPos = new Vector3(0, 4.2, -5.5);
  private currentTarget = new Vector3(0, 1.5, 8);
  private shakeTime = 0;
  private shakeIntensity = 0;
  private menuOrbitAngle = 0;
  private currentRoll = 0;
  private prevYaw = 0;
  private warpTime = 0;
  private warpDuration = 1.15;

  constructor(scene: Scene) {
    this.camera = new FreeCamera('mainCamera', this.currentPos.clone(), scene);
    this.camera.fov = 0.92;
    this.camera.minZ = 0.3;
    this.camera.maxZ = 600;
    this.camera.setTarget(this.currentTarget);
  }

  public triggerShake(intensity: number = 0.35, duration: number = 0.32): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  public triggerBiomeWarp(duration: number = 1.15): void {
    this.warpDuration = Math.max(0.2, duration);
    this.warpTime = this.warpDuration;
  }

  public updateMenu(dt: number, playerWorldPos: Vector3): void {
    this.menuOrbitAngle += dt * 0.35;
    // Inquadratura cinematografica dal basso-sinistra verso il protagonista (+Z):
    // lascia lo sfondo stabile e fermo mantenendo un impercettibile respiro verticale.
    const swayX = Math.sin(this.menuOrbitAngle) * 0.02;
    const breathY = Math.sin(this.menuOrbitAngle * 0.9) * 0.025;
    this.camera.position.set(
      playerWorldPos.x - 0.78 + swayX,
      playerWorldPos.y + 0.82 + breathY,
      playerWorldPos.z - 3.1
    );
    this.camera.setTarget(
      new Vector3(playerWorldPos.x + 0.22, playerWorldPos.y + 0.78, playerWorldPos.z + 8.0)
    );
    this.camera.rotation.z = 0;
    this.currentRoll = 0;
    this.camera.fov = 0.88;
  }

  public updateGameplay(
    dt: number,
    playerWorldPos: Vector3,
    playerYaw: number,
    isSliding: boolean,
    isTurbo: boolean,
    smoothLane: number = 0,
    forwardSpeed: number = 15
  ): void {
    const fwdX = Math.sin(playerYaw);
    const fwdZ = Math.cos(playerYaw);

    const rawDeltaYaw = playerYaw - this.prevYaw;
    const normDeltaYaw = Math.atan2(Math.sin(rawDeltaYaw), Math.cos(rawDeltaYaw));
    const yawVel = normDeltaYaw / Math.max(0.001, dt);
    this.prevYaw = playerYaw;

    const followDist = isTurbo ? 7.4 : 6.4;
    const followHeight = isSliding ? 2.85 : 3.95;

    const desiredPos = new Vector3(
      playerWorldPos.x - fwdX * followDist,
      playerWorldPos.y * 0.65 + followHeight,
      playerWorldPos.z - fwdZ * followDist
    );

    const desiredTarget = new Vector3(
      playerWorldPos.x + fwdX * 8.5,
      playerWorldPos.y * 0.6 + (isSliding ? 0.9 : 1.45),
      playerWorldPos.z + fwdZ * 8.5
    );

    const smoothPos = Math.min(1, dt * 11);
    const smoothTarget = Math.min(1, dt * 13);

    this.currentPos = Vector3.Lerp(this.currentPos, desiredPos, smoothPos);
    this.currentTarget = Vector3.Lerp(this.currentTarget, desiredTarget, smoothTarget);

    const finalPos = this.currentPos.clone();
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const factor = this.shakeTime > 0 ? this.shakeIntensity : 0;
      finalPos.x += (Math.random() - 0.5) * factor;
      finalPos.y += (Math.random() - 0.5) * factor;
    } else {
      this.shakeIntensity = 0;
    }

    this.camera.position.copyFrom(finalPos);
    this.camera.setTarget(this.currentTarget);

    const targetRoll = Math.max(-0.14, Math.min(0.14, -smoothLane * 0.032 - yawVel * 0.025));
    this.currentRoll += (targetRoll - this.currentRoll) * Math.min(1, dt * 10);
    this.camera.rotation.z = this.currentRoll;

    const speedNorm = Math.max(0, Math.min(1, (forwardSpeed - 14) / 14));
    let warpBoost = 0;
    if (this.warpTime > 0) {
      warpBoost = Math.sin((this.warpTime / this.warpDuration) * Math.PI) * 0.14;
      this.warpTime = Math.max(0, this.warpTime - dt);
    }
    const desiredFov = (isTurbo ? 1.15 : 0.91 + speedNorm * 0.13) + warpBoost;
    this.camera.fov += (desiredFov - this.camera.fov) * Math.min(1, dt * 7);
  }

  public snapToPlayer(playerWorldPos: Vector3, directionYaw: number): void {
    const fwdX = Math.sin(directionYaw);
    const fwdZ = Math.cos(directionYaw);
    this.currentPos.set(
      playerWorldPos.x - fwdX * 6.4,
      playerWorldPos.y + 3.95,
      playerWorldPos.z - fwdZ * 6.4
    );
    this.currentTarget.set(
      playerWorldPos.x + fwdX * 8.5,
      playerWorldPos.y + 1.45,
      playerWorldPos.z + fwdZ * 8.5
    );
    this.camera.position.copyFrom(this.currentPos);
    this.camera.setTarget(this.currentTarget);
    this.camera.rotation.z = 0;
    this.currentRoll = 0;
    this.prevYaw = directionYaw;
    void TrackMath.getYaw;
  }
}

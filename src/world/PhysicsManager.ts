import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';

interface DebrisPiece {
  mesh: Mesh;
  velocity: Vector3;
  rotSpeed: Vector3;
  life: number;
}

/**
 * Gestore fisico deterministico per detriti, esplosioni di ostacoli distrutti (Scudo/Turbo)
 * e crolli di lastre/ponti senza overhead superfluo sul motore fisico principale.
 */
export class PhysicsManager {
  private debris: DebrisPiece[] = [];
  private sharedMat: StandardMaterial | null = null;

  constructor(private readonly scene: Scene) {}

  public spawnSmashDebris(origin: Vector3, colorHex: string, count: number = 10): void {
    if (!this.sharedMat) {
      this.sharedMat = new StandardMaterial('debrisMat', this.scene);
      this.sharedMat.specularColor = new Color3(0.2, 0.2, 0.2);
    }
    this.sharedMat.diffuseColor = Color3.FromHexString(colorHex);

    for (let i = 0; i < count; i++) {
      const box = MeshBuilder.CreateBox(
        `debris_${Date.now()}_${i}`,
        { size: 0.25 + Math.random() * 0.25 },
        this.scene
      );
      box.position.copyFrom(origin);
      box.material = this.sharedMat;
      box.isPickable = false;

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 4 + Math.random() * 6;

      this.debris.push({
        mesh: box,
        velocity: new Vector3(
          Math.cos(angle) * speed,
          4 + Math.random() * 5,
          Math.sin(angle) * speed
        ),
        rotSpeed: new Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12
        ),
        life: 1.25,
      });
    }
  }

  public update(dt: number): void {
    const gravity = -24;
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      if (d.life <= 0) {
        d.mesh.dispose();
        this.debris.splice(i, 1);
        continue;
      }

      d.velocity.y += gravity * dt;
      d.mesh.position.addInPlace(d.velocity.scale(dt));
      d.mesh.rotation.addInPlace(d.rotSpeed.scale(dt));
      d.mesh.scaling.setAll(Math.max(0.05, d.life / 1.25));
    }
  }

  public clear(): void {
    for (const d of this.debris) {
      d.mesh.dispose();
    }
    this.debris = [];
  }
}

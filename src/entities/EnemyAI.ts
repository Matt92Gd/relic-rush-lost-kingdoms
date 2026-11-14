import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { eventBus } from '../core/EventBus';

/**
 * Malakor, Guardiano dell'Eclissi: Boss fantasy scolpito con corazza texturizzata
 * in ossidiana e rune di magma, profilo torso CreateLathe, corna ricurve e tentacoli CreateTube.
 * Posizionato in diagonale alle spalle dell'esploratore così da non ostruire mai la vista della pista.
 */
export class EnemyAI {
  public readonly root: TransformNode;
  private readonly armorTex: Texture;
  private readonly leftArm: TransformNode;
  private readonly rightArm: TransformNode;
  private readonly coreOrb: TransformNode;
  private readonly ringOuter: TransformNode;
  private readonly ringInner: TransformNode;
  private readonly tendrils: TransformNode[] = [];
  private readonly contactShadow: Mesh;
  private readonly contactShadowMat: StandardMaterial;
  private readonly contactShadowTex: DynamicTexture;

  private threatLevel = 0.38;
  private recoveryRate = 0.032;
  private animPhase = 0;
  private catchLunge = false;

  constructor(scene: Scene) {
    this.root = new TransformNode('malakor_root', scene);
    // Scala proporzionata (~2.1m di altezza totale) così è imponente senza fare muro davanti alla camera
    this.root.scaling.setAll(0.62);

    this.armorTex = new Texture('/assets/textures/malakor_armor.jpg', scene, false, true);
    this.armorTex.wrapU = Texture.WRAP_ADDRESSMODE;
    this.armorTex.wrapV = Texture.WRAP_ADDRESSMODE;
    this.armorTex.uScale = 1.8;
    this.armorTex.vScale = 1.8;

    const armorMat = new StandardMaterial('malakor_armor_mat', scene);
    armorMat.diffuseTexture = this.armorTex;
    armorMat.diffuseColor = new Color3(0.95, 0.88, 1.0);
    armorMat.emissiveColor = new Color3(0.14, 0.03, 0.22);
    armorMat.specularColor = new Color3(0.45, 0.28, 0.55);

    const goldMat = new StandardMaterial('malakor_gold_mat', scene);
    goldMat.diffuseColor = new Color3(0.84, 0.6, 0.22);
    goldMat.emissiveColor = new Color3(0.12, 0.06, 0.01);
    goldMat.specularColor = new Color3(0.75, 0.62, 0.3);

    const glowMat = new StandardMaterial('malakor_glow_mat', scene);
    glowMat.diffuseColor = new Color3(1.0, 0.28, 0.62);
    glowMat.emissiveColor = new Color3(0.9, 0.16, 0.52);
    glowMat.specularColor = new Color3(0.5, 0.5, 0.5);

    // Torso corazzato scolpito con CreateLathe (profilo a clessidra da demone/guardiano)
    const chestProfile = [
      new Vector3(0.28, 1.05, 0),
      new Vector3(0.42, 1.4, 0),
      new Vector3(0.55, 1.85, 0),
      new Vector3(0.84, 2.35, 0),
      new Vector3(0.9, 2.75, 0),
      new Vector3(0.46, 2.95, 0),
    ];
    const chest = MeshBuilder.CreateLathe(
      'malakor_chest',
      { shape: chestProfile, tessellation: 28, sideOrientation: Mesh.DOUBLESIDE },
      scene
    );
    chest.scaling.set(1.12, 1.0, 0.78);
    chest.material = armorMat;
    chest.parent = this.root;

    // Spallacci scolpiti morbidi (flat: false) + vere corna ricurve tramite CreateTube lungo curva 3D
    for (const side of [-1, 1]) {
      const pauldron = MeshBuilder.CreateIcoSphere(
        `malakor_pauldron_${side}`,
        { radius: 0.44, subdivisions: 3, flat: false },
        scene
      );
      pauldron.position.set(side * 1.02, 2.72, 0);
      pauldron.scaling.set(1.3, 0.85, 1.05);
      pauldron.material = armorMat;
      pauldron.parent = this.root;

      const hornPath = [
        new Vector3(side * 0.28, 3.35, 0.04),
        new Vector3(side * 0.62, 3.65, 0.12),
        new Vector3(side * 0.82, 4.02, 0.28),
        new Vector3(side * 0.65, 4.35, 0.48),
      ];
      const horn = MeshBuilder.CreateTube(
        `malakor_horn_${side}`,
        {
          path: hornPath,
          tessellation: 16,
          radiusFunction: (i) => Math.max(0.025, 0.14 - i * 0.038),
          cap: Mesh.CAP_END,
        },
        scene
      );
      horn.material = goldMat;
      horn.parent = this.root;
    }

    // Testa / Maschera dell'Eclissi con occhi ardenti
    const head = MeshBuilder.CreateCapsule(
      'malakor_head',
      { height: 0.92, radius: 0.36, tessellation: 20 },
      scene
    );
    head.position.y = 3.25;
    head.material = armorMat;
    head.parent = this.root;

    const crest = MeshBuilder.CreateTorus(
      'malakor_crest',
      { diameter: 0.75, thickness: 0.08, tessellation: 24 },
      scene
    );
    crest.position.y = 3.55;
    crest.rotation.x = 0.25;
    crest.material = goldMat;
    crest.parent = this.root;

    for (const side of [-1, 1]) {
      const eye = MeshBuilder.CreateSphere(`malakor_eye_${side}`, { diameter: 0.16, segments: 14 }, scene);
      eye.position.set(side * 0.16, 3.28, 0.32);
      eye.scaling.set(1.2, 0.55, 0.6);
      eye.rotation.z = side * 0.28;
      eye.material = glowMat;
      eye.parent = this.root;
    }

    // Nucleo dell'Eclissi + Doppio Anello Runico proporzionato
    this.coreOrb = new TransformNode('malakor_core', scene);
    this.coreOrb.position.set(0, 2.25, 0.58);
    this.coreOrb.parent = this.root;
    const orbMesh = MeshBuilder.CreateSphere('malakor_core_mesh', { diameter: 0.48, segments: 18 }, scene);
    orbMesh.material = glowMat;
    orbMesh.parent = this.coreOrb;

    this.ringOuter = new TransformNode('malakor_ring_out', scene);
    this.ringOuter.position.set(0, 2.25, 0);
    this.ringOuter.parent = this.root;
    const rOutMesh = MeshBuilder.CreateTorus(
      'malakor_rout_m',
      { diameter: 2.0, thickness: 0.06, tessellation: 28 },
      scene
    );
    rOutMesh.rotation.x = Math.PI / 2;
    rOutMesh.material = goldMat;
    rOutMesh.parent = this.ringOuter;

    this.ringInner = new TransformNode('malakor_ring_in', scene);
    this.ringInner.position.set(0, 2.25, 0);
    this.ringInner.parent = this.root;
    const rInMesh = MeshBuilder.CreateTorus(
      'malakor_rin_m',
      { diameter: 1.55, thickness: 0.055, tessellation: 28 },
      scene
    );
    rInMesh.rotation.z = Math.PI / 3;
    rInMesh.material = glowMat;
    rInMesh.parent = this.ringInner;

    // Braccia artigliate scolpite
    this.leftArm = this.buildClawedArm(-1, scene, armorMat, glowMat);
    this.rightArm = this.buildClawedArm(1, scene, armorMat, glowMat);

    // Tentacoli / Lembi d'ombra curvi generati con CreateTube ad alta tessellazione
    for (let i = 0; i < 5; i++) {
      const tendrilNode = new TransformNode(`malakor_tend_${i}`, scene);
      const angle = (Math.PI * 2 * i) / 5;
      tendrilNode.position.set(Math.cos(angle) * 0.4, 1.15, Math.sin(angle) * 0.3);
      tendrilNode.parent = this.root;

      const tPath = [
        new Vector3(0, 0, 0),
        new Vector3(Math.cos(angle) * 0.14, -0.38, -0.18),
        new Vector3(Math.cos(angle) * 0.24, -0.78, -0.45),
        new Vector3(Math.cos(angle) * 0.16, -1.12, -0.68),
      ];
      const tMesh = MeshBuilder.CreateTube(
        `malakor_tm_${i}`,
        {
          path: tPath,
          tessellation: 14,
          radiusFunction: (idx) => Math.max(0.02, 0.14 - idx * 0.04),
          cap: Mesh.CAP_END,
        },
        scene
      );
      tMesh.material = i % 2 === 0 ? armorMat : glowMat;
      tMesh.parent = tendrilNode;
      this.tendrils.push(tendrilNode);
    }

    // Ombra morbida di contatto a terra sotto Malakor
    this.contactShadowTex = new DynamicTexture('malakor_shadow_tex', 128, scene, false);
    this.contactShadowTex.hasAlpha = true;
    const shadowCtx = this.contactShadowTex.getContext();
    if (shadowCtx && typeof shadowCtx.createRadialGradient === 'function') {
      const grad = shadowCtx.createRadialGradient(64, 64, 8, 64, 64, 62);
      grad.addColorStop(0, 'rgba(12, 4, 24, 0.58)');
      grad.addColorStop(0.55, 'rgba(12, 4, 24, 0.28)');
      grad.addColorStop(1, 'rgba(12, 4, 24, 0)');
      shadowCtx.fillStyle = grad;
      shadowCtx.fillRect(0, 0, 128, 128);
      this.contactShadowTex.update();
    }
    this.contactShadowMat = new StandardMaterial('malakor_shadow_mat', scene);
    this.contactShadowMat.diffuseTexture = this.contactShadowTex;
    this.contactShadowMat.useAlphaFromDiffuseTexture = true;
    this.contactShadowMat.emissiveColor = new Color3(0, 0, 0);
    this.contactShadowMat.specularColor = Color3.Black();
    this.contactShadowMat.disableLighting = true;
    this.contactShadow = MeshBuilder.CreateDisc(
      'malakor_contact_shadow',
      { radius: 1.55, tessellation: 24 },
      scene
    );
    this.contactShadow.rotation.x = Math.PI / 2;
    this.contactShadow.material = this.contactShadowMat;
    this.contactShadow.isPickable = false;
    this.contactShadow.parent = this.root;
  }

  private buildClawedArm(
    side: -1 | 1,
    scene: Scene,
    armorMat: StandardMaterial,
    glowMat: StandardMaterial
  ): TransformNode {
    const arm = new TransformNode(`malakor_arm_${side}`, scene);
    arm.position.set(side * 1.12, 2.55, 0.1);
    arm.parent = this.root;

    const upper = MeshBuilder.CreateCapsule(
      `malakor_uarm_${side}`,
      { height: 0.85, radius: 0.18, tessellation: 16 },
      scene
    );
    upper.position.y = -0.35;
    upper.material = armorMat;
    upper.parent = arm;

    const fore = MeshBuilder.CreateCapsule(
      `malakor_farm_${side}`,
      { height: 0.85, radius: 0.15, tessellation: 16 },
      scene
    );
    fore.position.set(0, -0.92, 0.28);
    fore.rotation.x = -0.55;
    fore.material = armorMat;
    fore.parent = arm;

    for (let c = -1; c <= 1; c++) {
      const clawPath = [
        new Vector3(c * 0.1, -1.18, 0.45),
        new Vector3(c * 0.12, -1.32, 0.66),
        new Vector3(c * 0.11, -1.36, 0.88),
      ];
      const claw = MeshBuilder.CreateTube(
        `malakor_claw_${side}_${c}`,
        {
          path: clawPath,
          tessellation: 10,
          radiusFunction: (idx) => Math.max(0.012, 0.048 - idx * 0.017),
          cap: Mesh.CAP_END,
        },
        scene
      );
      claw.material = glowMat;
      claw.parent = arm;
    }

    return arm;
  }

  public reset(shadowRelicCompleted: boolean): void {
    this.threatLevel = shadowRelicCompleted ? 0.28 : 0.44;
    this.catchLunge = false;
    this.root.setEnabled(true);
    eventBus.emit('audio:sfx', { sfx: 'enemy_roar' });
  }

  public getThreatLevel(): number {
    return this.threatLevel;
  }

  public onPlayerStumble(): boolean {
    if (this.threatLevel >= 0.55) {
      this.threatLevel = 1.0;
      this.catchLunge = true;
      eventBus.emit('audio:sfx', { sfx: 'enemy_roar' });
      return true;
    }
    this.threatLevel = 0.78;
    eventBus.emit('audio:sfx', { sfx: 'enemy_roar' });
    return false;
  }

  public onShieldPushback(): void {
    this.threatLevel = Math.max(0.12, this.threatLevel - 0.35);
    this.catchLunge = false;
  }

  public triggerInstantCatch(): void {
    this.threatLevel = 1.0;
    this.catchLunge = true;
  }

  public update(
    dt: number,
    playerWorldPos: Vector3,
    playerYaw: number,
    isIntensePursuit: boolean,
    isPlaying: boolean
  ): void {
    if (isPlaying && !this.catchLunge) {
      const targetFloor = isIntensePursuit ? 0.56 : 0.14;
      if (this.threatLevel > targetFloor) {
        this.threatLevel = Math.max(targetFloor, this.threatLevel - this.recoveryRate * dt);
      } else if (isIntensePursuit && this.threatLevel < targetFloor) {
        this.threatLevel = Math.min(targetFloor, this.threatLevel + dt * 0.18);
      }
    }

    this.animPhase += dt * (isIntensePursuit ? 10 : 6.5);

    const fwdX = Math.sin(playerYaw);
    const fwdZ = Math.cos(playerYaw);
    const rightX = Math.cos(playerYaw);
    const rightZ = -Math.sin(playerYaw);

    // Distanza calibrata tra 3.2m (pericolo massimo) e 10.5m (lontano) o 1.9m a lato al Game Over
    const followDist = this.catchLunge ? 1.95 : 10.5 - this.threatLevel * 7.3;

    // Offset laterale diagonale: mantiene Malakor a sinistra o destra del protagonista, MAI al centro davanti alla camera!
    const swayDir = Math.tanh(Math.sin(this.animPhase * 0.16) * 3.8);
    const sway = this.catchLunge
      ? 1.45
      : swayDir * (1.28 + Math.cos(this.animPhase * 0.35) * 0.25);

    this.root.position.set(
      playerWorldPos.x - fwdX * followDist + rightX * sway,
      Math.max(0.12, playerWorldPos.y * 0.28) + Math.abs(Math.sin(this.animPhase)) * 0.18,
      playerWorldPos.z - fwdZ * followDist + rightZ * sway
    );
    this.root.rotation.y = playerYaw;
    this.root.rotation.z = Math.sin(this.animPhase * 0.5) * 0.08;
    this.contactShadow.position.y = (0.04 - this.root.position.y) / 0.62;
    const shadowScale = Math.max(0.55, 1.0 - Math.max(0, this.root.position.y - 0.12) * 0.28);
    this.contactShadow.scaling.setAll(shadowScale);

    this.leftArm.rotation.x = -0.65 + Math.sin(this.animPhase) * 0.5;
    this.rightArm.rotation.x = -0.65 - Math.sin(this.animPhase) * 0.5;
    this.coreOrb.scaling.setAll(1 + Math.sin(this.animPhase * 1.5) * 0.16);
    this.ringOuter.rotation.y += dt * 2.2;
    this.ringOuter.rotation.z = Math.sin(this.animPhase * 0.3) * 0.25;
    this.ringInner.rotation.x -= dt * 3.1;

    this.tendrils.forEach((t, idx) => {
      t.rotation.x = 0.22 + Math.sin(this.animPhase * 1.4 + idx) * 0.24;
      t.rotation.z = Math.cos(this.animPhase * 1.1 + idx * 1.3) * 0.18;
    });
  }

  public dispose(): void {
    this.armorTex.dispose();
    this.contactShadowTex.dispose();
    this.contactShadowMat.dispose();
    this.root.dispose();
  }
}

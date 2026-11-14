import {
  AbstractMesh,
  AnimationGroup,
  BaseTexture,
  Color3,
  Color4,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  PBRMaterial,
  PointLight,
  Scene,
  SceneLoader,
  Skeleton,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { CHARACTERS, TRAILS } from '../data/gameCatalog';
import type {
  AccessoryId,
  CelebrationStyle,
  CharacterId,
  PlayerAnimState,
  TrailId,
} from '../types/game.types';

export class CharacterMeshBuilder {
  public readonly root: TransformNode;
  private readonly hips: TransformNode;
  private readonly torso: TransformNode;
  private readonly head: TransformNode;
  private readonly shoulderL: TransformNode;
  private readonly elbowL: TransformNode;
  private readonly shoulderR: TransformNode;
  private readonly elbowR: TransformNode;
  private readonly hipL: TransformNode;
  private readonly kneeL: TransformNode;
  private readonly ankleL: TransformNode;
  private readonly hipR: TransformNode;
  private readonly kneeR: TransformNode;
  private readonly ankleR: TransformNode;
  private readonly capeUpper: TransformNode;
  private readonly capeLower: TransformNode;
  private readonly relicRingA: Mesh;
  private readonly relicRingB: Mesh;
  private readonly shockwaveRing: Mesh;
  private readonly shockwaveMat: StandardMaterial;
  private readonly accessoryRoot: TransformNode;
  private readonly hairRoot: TransformNode;
  private readonly shieldBubble: Mesh;
  private readonly shieldMat: StandardMaterial;
  private readonly shieldRingMat: StandardMaterial;
  private readonly heroLight: PointLight;
  private readonly heroFrontLight: PointLight;
  private readonly contactShadow: Mesh;
  private readonly contactShadowMat: StandardMaterial;
  private readonly contactShadowTex: DynamicTexture;
  private readonly rigContainer: TransformNode;
  private readonly proceduralMeshes: AbstractMesh[] = [];

  private readonly texOutfit: Texture;
  private readonly texLeather: Texture;
  private readonly texBronze: Texture;
  private matPrimary: StandardMaterial;
  private matSecondary: StandardMaterial;
  private matSkin: StandardMaterial;
  private matAccent: StandardMaterial;
  private matDarkLeather: StandardMaterial;
  private matHair: StandardMaterial;
  private trailSystem: ParticleSystem | null = null;
  private footDustSystem: ParticleSystem | null = null;
  private burstSystem: ParticleSystem | null = null;
  private animPhase = 0;
  private doubleJumpSpin = 0;
  private shockwaveTimer = 0;
  private prevAnimState: PlayerAnimState = 'IDLE';
  private rigLoadToken = 0;
  private loadedRigFile: string | null = null;
  private rigLoaded = false;
  private rigMeshes: AbstractMesh[] = [];
  private rigNodes: TransformNode[] = [];
  private rigSkeletons: Skeleton[] = [];
  private rigAnimGroups: Map<string, AnimationGroup> = new Map();
  private rigMaterialClones: Array<{
    clone: PBRMaterial;
    baseColor: Color3;
    baseTexture: BaseTexture | null;
    baseMetallic: number;
    baseRoughness: number;
    role: 'head' | 'outfit' | 'limb';
  }> = [];
  private currentRigAnim = '';
  private readonly rigBackGearRoot: TransformNode;
  private readonly talosVisorRoot: TransformNode;
  private currentCharacterId: CharacterId = 'leo';

  constructor(
    private readonly scene: Scene,
    private readonly onRigLoaded?: () => void
  ) {
    this.root = new TransformNode('player_root', scene);
    this.root.scaling.setAll(1.0);

    this.rigContainer = new TransformNode('player_rig_container', scene);
    this.rigContainer.parent = this.root;
    this.rigContainer.rotation.y = 0;
    this.rigContainer.scaling.setAll(0.68);

    this.rigBackGearRoot = new TransformNode('rig_back_gear', scene);
    this.rigBackGearRoot.parent = this.rigContainer;
    this.rigBackGearRoot.setEnabled(false);

    this.talosVisorRoot = new TransformNode('talos_visor_root', scene);
    this.talosVisorRoot.parent = this.rigContainer;
    this.talosVisorRoot.setEnabled(false);

    // Ombra morbida di contatto a terra sotto il protagonista
    this.contactShadowTex = new DynamicTexture('player_shadow_tex', 128, scene, false);
    this.contactShadowTex.hasAlpha = true;
    const shadowCtx = this.contactShadowTex.getContext();
    if (shadowCtx && typeof shadowCtx.createRadialGradient === 'function') {
      const grad = shadowCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
      grad.addColorStop(0, 'rgba(10, 12, 20, 0.52)');
      grad.addColorStop(0.55, 'rgba(10, 12, 20, 0.24)');
      grad.addColorStop(1, 'rgba(10, 12, 20, 0)');
      shadowCtx.fillStyle = grad;
      shadowCtx.fillRect(0, 0, 128, 128);
      this.contactShadowTex.update();
    }
    this.contactShadowMat = new StandardMaterial('player_shadow_mat', scene);
    this.contactShadowMat.diffuseTexture = this.contactShadowTex;
    this.contactShadowMat.useAlphaFromDiffuseTexture = true;
    this.contactShadowMat.emissiveColor = new Color3(0, 0, 0);
    this.contactShadowMat.specularColor = Color3.Black();
    this.contactShadowMat.disableLighting = true;
    this.contactShadow = MeshBuilder.CreateDisc(
      'player_contact_shadow',
      { radius: 0.62, tessellation: 24 },
      scene
    );
    this.contactShadow.rotation.x = Math.PI / 2;
    this.contactShadow.position.y = 0.03;
    this.contactShadow.material = this.contactShadowMat;
    this.contactShadow.isPickable = false;
    this.contactShadow.parent = this.root;

    this.hips = new TransformNode('player_hips', scene);
    this.hips.parent = this.root;
    this.hips.position.y = 0.96;

    // Luce calda dedicata sul protagonista (retro per la corsa + frontale per il ritratto nel menu)
    this.heroLight = new PointLight('heroKeyLight', new Vector3(0, 1.85, -1.2), scene);
    this.heroLight.diffuse = new Color3(1.0, 0.94, 0.85);
    this.heroLight.intensity = 0.9;
    this.heroLight.range = 7;
    this.heroLight.parent = this.root;

    this.heroFrontLight = new PointLight('heroFrontLight', new Vector3(0.35, 1.95, 1.5), scene);
    this.heroFrontLight.diffuse = new Color3(1.0, 0.95, 0.88);
    this.heroFrontLight.intensity = 1.1;
    this.heroFrontLight.range = 7;
    this.heroFrontLight.parent = this.root;

    this.texOutfit = new Texture('/assets/textures/hero_outfit.jpg', scene, false, true);
    this.texOutfit.wrapU = Texture.WRAP_ADDRESSMODE;
    this.texOutfit.wrapV = Texture.WRAP_ADDRESSMODE;
    this.texOutfit.uScale = 1.4;
    this.texOutfit.vScale = 1.4;

    this.texLeather = new Texture('/assets/textures/bark_wood.jpg', scene, false, true);
    this.texLeather.wrapU = Texture.WRAP_ADDRESSMODE;
    this.texLeather.wrapV = Texture.WRAP_ADDRESSMODE;
    this.texLeather.uScale = 1.8;
    this.texLeather.vScale = 1.8;

    this.texBronze = new Texture('/assets/textures/ancient_gold_metal.jpg', scene, false, true);
    this.texBronze.wrapU = Texture.WRAP_ADDRESSMODE;
    this.texBronze.wrapV = Texture.WRAP_ADDRESSMODE;
    this.texBronze.uScale = 1.6;
    this.texBronze.vScale = 1.6;

    this.matPrimary = this.makeMat('char_primary', '#3a78b0', 0.28);
    this.matPrimary.diffuseTexture = this.texOutfit;

    this.matSecondary = this.makeMat('char_secondary', '#eab308', 0.58);
    this.matSecondary.diffuseTexture = this.texOutfit;
    this.matSecondary.emissiveColor = new Color3(0.08, 0.05, 0.01);

    this.matSkin = this.makeMat('char_skin', '#e3b898', 0.12);
    this.matAccent = this.makeMat('char_accent', '#38bdf8', 0.55);
    this.matDarkLeather = this.makeMat('char_leather', '#6a4630', 0.18);
    this.matDarkLeather.diffuseTexture = this.texLeather;
    this.matHair = this.makeMat('char_hair', '#2d1c14', 0.15);

    // Bacino arrotondato + cintura + fibbia dorata cesellata
    const pelvis = MeshBuilder.CreateSphere('char_pelvis', { diameter: 0.46, segments: 22 }, scene);
    pelvis.scaling.set(1.12, 0.78, 0.85);
    pelvis.material = this.matDarkLeather;
    pelvis.parent = this.hips;

    const belt = MeshBuilder.CreateCylinder(
      'char_belt',
      { height: 0.12, diameterTop: 0.47, diameterBottom: 0.49, tessellation: 24 },
      scene
    );
    belt.position.y = 0.06;
    belt.scaling.set(1.06, 1.0, 0.8);
    belt.material = this.matDarkLeather;
    belt.parent = this.hips;

    const buckle = MeshBuilder.CreateCylinder(
      'char_buckle',
      { height: 0.08, diameter: 0.14, tessellation: 22 },
      scene
    );
    buckle.rotation.x = Math.PI / 2;
    buckle.position.set(0, 0.06, 0.21);
    buckle.material = this.matSecondary;
    buckle.parent = this.hips;

    // Frusta / rampino da esploratore arrotolata al fianco destro della cintura
    const whipCoil = MeshBuilder.CreateTorus(
      'char_whip_coil',
      { diameter: 0.24, thickness: 0.036, tessellation: 22 },
      scene
    );
    whipCoil.rotation.set(0.18, Math.PI / 2, 0.14);
    whipCoil.position.set(0.27, -0.02, -0.05);
    whipCoil.material = this.matDarkLeather;
    whipCoil.parent = this.hips;

    const whipClasp = MeshBuilder.CreateBox(
      'char_whip_clasp',
      { width: 0.06, height: 0.07, depth: 0.06 },
      scene
    );
    whipClasp.position.set(0.27, 0.09, -0.05);
    whipClasp.material = this.matSecondary;
    whipClasp.parent = this.hips;

    // Torso scolpito anatomicamente con CreateLathe (falda giacca -> vita -> torace -> spalle)
    this.torso = new TransformNode('char_torso_node', scene);
    this.torso.parent = this.hips;
    this.torso.position.y = 0.06;

    const chestProfile = [
      new Vector3(0.25, -0.1, 0),
      new Vector3(0.23, 0.04, 0),
      new Vector3(0.2, 0.16, 0), // vita definita
      new Vector3(0.24, 0.34, 0),
      new Vector3(0.29, 0.52, 0), // petto e dorso ampi
      new Vector3(0.27, 0.64, 0),
      new Vector3(0.14, 0.69, 0),
    ];
    const chest = MeshBuilder.CreateLathe(
      'char_chest',
      { shape: chestProfile, tessellation: 28, sideOrientation: Mesh.DOUBLESIDE },
      scene
    );
    chest.scaling.set(1.06, 1.0, 0.74);
    chest.material = this.matPrimary;
    chest.parent = this.torso;

    // Due cinghie incrociate di cuoio sul torace e sulla schiena
    for (const side of [-1, 1]) {
      const strap = MeshBuilder.CreateBox(
        `char_strap_${side}`,
        { width: 0.075, height: 0.72, depth: 0.44 },
        scene
      );
      strap.position.set(0, 0.34, 0);
      strap.rotation.z = side * 0.42;
      strap.material = this.matDarkLeather;
      strap.parent = this.torso;
    }

    // Spallacci scolpiti e morbidi
    for (const side of [-1, 1]) {
      const pauldron = MeshBuilder.CreateSphere(
        `char_pauldron_${side}`,
        { diameter: 0.25, segments: 20 },
        scene
      );
      pauldron.position.set(side * 0.31, 0.6, 0);
      pauldron.scaling.set(1.16, 0.8, 1.02);
      pauldron.material = this.matSecondary;
      pauldron.parent = this.torso;
    }

    // Zaino da esploratore con rotolo, medaglione runico morbido e lanterna dorata sul retro
    const pack = MeshBuilder.CreateCapsule(
      'char_pack',
      { height: 0.44, radius: 0.17, tessellation: 18 },
      scene
    );
    pack.position.set(0, 0.38, -0.24);
    pack.scaling.set(1.2, 1.0, 0.78);
    pack.material = this.matDarkLeather;
    pack.parent = this.torso;

    const bedroll = MeshBuilder.CreateCylinder(
      'char_bedroll',
      { height: 0.5, diameter: 0.15, tessellation: 22 },
      scene
    );
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 0.61, -0.24);
    bedroll.material = this.matSecondary;
    bedroll.parent = this.torso;

    const packGem = MeshBuilder.CreateSphere('char_pack_gem', { diameter: 0.14, segments: 18 }, scene);
    packGem.scaling.set(1, 1, 0.6);
    packGem.position.set(0, 0.43, -0.37);
    packGem.material = this.matAccent;
    packGem.parent = this.torso;

    const packGemRing = MeshBuilder.CreateTorus(
      'char_pack_gem_ring',
      { diameter: 0.17, thickness: 0.025, tessellation: 24 },
      scene
    );
    packGemRing.rotation.x = Math.PI / 2;
    packGemRing.position.set(0, 0.43, -0.37);
    packGemRing.material = this.matSecondary;
    packGemRing.parent = this.torso;

    // Due anelli runici dorati controrotanti della Reliquia Rubata incastonata nello zaino
    this.relicRingA = MeshBuilder.CreateTorus(
      'char_relic_ring_a',
      { diameter: 0.27, thickness: 0.022, tessellation: 24 },
      scene
    );
    this.relicRingA.position.set(0, 0.43, -0.38);
    this.relicRingA.rotation.x = Math.PI / 4;
    this.relicRingA.material = this.matSecondary;
    this.relicRingA.parent = this.torso;

    this.relicRingB = MeshBuilder.CreateTorus(
      'char_relic_ring_b',
      { diameter: 0.33, thickness: 0.018, tessellation: 24 },
      scene
    );
    this.relicRingB.position.set(0, 0.43, -0.38);
    this.relicRingB.rotation.z = Math.PI / 3;
    this.relicRingB.material = this.matAccent;
    this.relicRingB.parent = this.torso;

    // Piccola lanterna calda appesa allo zaino (punto focale chiaro quando visto di spalle)
    const lanternFrame = MeshBuilder.CreateCylinder(
      'char_lantern_frame',
      { height: 0.14, diameter: 0.11, tessellation: 18 },
      scene
    );
    lanternFrame.position.set(0.14, 0.22, -0.35);
    lanternFrame.material = this.matSecondary;
    lanternFrame.parent = this.torso;

    const lanternGlow = MeshBuilder.CreateSphere(
      'char_lantern_glow',
      { diameter: 0.085, segments: 16 },
      scene
    );
    lanternGlow.position.set(0.14, 0.22, -0.35);
    const lanternMat = this.makeMat('char_lantern_mat', '#fef08a', 0.2);
    lanternMat.emissiveColor = new Color3(1.0, 0.72, 0.22);
    lanternGlow.material = lanternMat;
    lanternGlow.parent = this.torso;

    // Colletto sciarpa e mantello fluente articolato ad alta tessellazione
    const collar = MeshBuilder.CreateTorus(
      'char_scarf_collar',
      { diameter: 0.34, thickness: 0.08, tessellation: 24 },
      scene
    );
    collar.position.set(0, 0.68, 0.02);
    collar.material = this.matSecondary;
    collar.parent = this.torso;

    this.capeUpper = new TransformNode('char_cape_upper', scene);
    this.capeUpper.parent = this.torso;
    this.capeUpper.position.set(0, 0.64, -0.2);
    const capeMesh1 = MeshBuilder.CreateCylinder(
      'char_cape_1',
      { height: 0.44, diameterTop: 0.34, diameterBottom: 0.48, tessellation: 22 },
      scene
    );
    capeMesh1.position.set(0, -0.2, -0.1);
    capeMesh1.scaling.set(1.15, 1.0, 0.14);
    capeMesh1.material = this.matPrimary;
    capeMesh1.parent = this.capeUpper;

    this.capeLower = new TransformNode('char_cape_lower', scene);
    this.capeLower.parent = this.capeUpper;
    this.capeLower.position.set(0, -0.4, -0.1);
    const capeMesh2 = MeshBuilder.CreateCylinder(
      'char_cape_2',
      { height: 0.42, diameterTop: 0.48, diameterBottom: 0.58, tessellation: 22 },
      scene
    );
    capeMesh2.position.set(0, -0.19, -0.04);
    capeMesh2.scaling.set(1.15, 1.0, 0.12);
    capeMesh2.material = this.matSecondary;
    capeMesh2.parent = this.capeLower;

    // Collo e Testa espressiva morbida
    const neck = MeshBuilder.CreateCylinder(
      'char_neck',
      { height: 0.16, diameter: 0.16, tessellation: 22 },
      scene
    );
    neck.position.set(0, 0.74, 0.02);
    neck.material = this.matSkin;
    neck.parent = this.torso;

    this.head = new TransformNode('char_head_node', scene);
    this.head.parent = this.torso;
    this.head.position.set(0, 0.88, 0.02);

    const cranium = MeshBuilder.CreateSphere('char_head', { diameter: 0.42, segments: 24 }, scene);
    cranium.position.y = 0.12;
    cranium.scaling.set(0.94, 1.08, 0.98);
    cranium.material = this.matSkin;
    cranium.parent = this.head;

    const nose = MeshBuilder.CreateCapsule(
      'char_nose',
      { height: 0.08, radius: 0.022, tessellation: 14 },
      scene
    );
    nose.position.set(0, 0.11, 0.19);
    nose.rotation.x = -0.25;
    nose.material = this.matSkin;
    nose.parent = this.head;

    const matEyeWhite = this.makeMat('char_eye_w', '#ffffff', 0.25);
    const matPupil = this.makeMat('char_eye_p', '#0f172a', 0.4);
    for (const side of [-1, 1]) {
      const eyeW = MeshBuilder.CreateSphere(`char_ew_${side}`, { diameter: 0.072, segments: 16 }, scene);
      eyeW.position.set(side * 0.082, 0.15, 0.168);
      eyeW.scaling.set(1.0, 1.1, 0.55);
      eyeW.material = matEyeWhite;
      eyeW.parent = this.head;

      const pupil = MeshBuilder.CreateSphere(`char_ep_${side}`, { diameter: 0.044, segments: 14 }, scene);
      pupil.position.set(side * 0.082, 0.15, 0.184);
      pupil.material = matPupil;
      pupil.parent = this.head;

      const eyelid = MeshBuilder.CreateSphere(`char_el_${side}`, { diameter: 0.078, segments: 14 }, scene);
      eyelid.position.set(side * 0.082, 0.172, 0.168);
      eyelid.scaling.set(1.05, 0.55, 0.6);
      eyelid.material = this.matSkin;
      eyelid.parent = this.head;

      const brow = MeshBuilder.CreateCapsule(
        `char_brow_${side}`,
        { height: 0.08, radius: 0.014, tessellation: 12 },
        scene
      );
      brow.rotation.z = Math.PI / 2 + side * 0.14;
      brow.position.set(side * 0.082, 0.205, 0.178);
      brow.material = this.matHair;
      brow.parent = this.head;
    }

    this.hairRoot = new TransformNode('char_hair_root', scene);
    this.hairRoot.parent = this.head;
    this.buildHair();

    this.accessoryRoot = new TransformNode('char_accessory', scene);
    this.accessoryRoot.parent = this.head;
    this.accessoryRoot.position.y = 0.3;
    if (this.scene.getEngine().getClassName() !== 'NullEngine') {
      this.accessoryRoot.setEnabled(false);
    }

    // Braccia articolate (spalla -> gomito -> mano)
    const armL = this.createArticulatedArm(-1);
    this.shoulderL = armL.shoulder;
    this.elbowL = armL.elbow;
    const armR = this.createArticulatedArm(1);
    this.shoulderR = armR.shoulder;
    this.elbowR = armR.elbow;

    // Gambe articolate (anca -> ginocchio -> caviglia/stivale)
    const legL = this.createArticulatedLeg(-1);
    this.hipL = legL.hip;
    this.kneeL = legL.knee;
    this.ankleL = legL.ankle;
    const legR = this.createArticulatedLeg(1);
    this.hipR = legR.hip;
    this.kneeR = legR.knee;
    this.ankleR = legR.ankle;

    this.initFootDustParticles();
    this.initBurstParticles();

    // Onda d'urto a terra su atterraggio / near miss
    this.shockwaveRing = MeshBuilder.CreateTorus(
      'player_shockwave_ring',
      { diameter: 1.15, thickness: 0.065, tessellation: 28 },
      scene
    );
    this.shockwaveMat = new StandardMaterial('player_shockwave_mat', scene);
    this.shockwaveMat.diffuseColor = new Color3(0.35, 0.85, 1.0);
    this.shockwaveMat.emissiveColor = new Color3(0.45, 0.88, 1.0);
    this.shockwaveMat.alpha = 0.85;
    this.shockwaveRing.material = this.shockwaveMat;
    this.shockwaveRing.position.set(0, 0.06, 0);
    this.shockwaveRing.parent = this.root;
    this.shockwaveRing.isVisible = false;

    // Bolla scudo Runica avvolgente proporzionata al personaggio
    this.shieldBubble = MeshBuilder.CreateSphere(
      'player_shield_bubble',
      { diameter: 1.95, segments: 28 },
      scene
    );
    this.shieldMat = new StandardMaterial('shield_bubble_mat', scene);
    this.shieldMat.diffuseColor = new Color3(0.18, 0.96, 0.74);
    this.shieldMat.emissiveColor = new Color3(0.1, 0.58, 0.48);
    this.shieldMat.specularColor = new Color3(0.35, 1.0, 0.85);
    this.shieldMat.alpha = 0.15;
    this.shieldMat.backFaceCulling = false;
    this.shieldBubble.material = this.shieldMat;
    this.shieldBubble.isPickable = false;
    this.shieldBubble.position.y = 0.84;
    this.shieldBubble.scaling.set(0.92, 1.04, 0.92);
    this.shieldBubble.parent = this.root;

    this.shieldRingMat = new StandardMaterial('shield_ring_mat', scene);
    this.shieldRingMat.diffuseColor = new Color3(0.3, 1.0, 0.82);
    this.shieldRingMat.emissiveColor = new Color3(0.28, 0.95, 0.76);
    this.shieldRingMat.alpha = 0.72;

    const shieldRingA = MeshBuilder.CreateTorus(
      'player_shield_ring_a',
      { diameter: 1.98, thickness: 0.026, tessellation: 32 },
      scene
    );
    shieldRingA.rotation.set(Math.PI / 5, 0, Math.PI / 8);
    shieldRingA.material = this.shieldRingMat;
    shieldRingA.isPickable = false;
    shieldRingA.parent = this.shieldBubble;

    const shieldRingB = MeshBuilder.CreateTorus(
      'player_shield_ring_b',
      { diameter: 1.98, thickness: 0.026, tessellation: 32 },
      scene
    );
    shieldRingB.rotation.set(-Math.PI / 4, 0, -Math.PI / 6);
    shieldRingB.material = this.shieldRingMat;
    shieldRingB.isPickable = false;
    shieldRingB.parent = this.shieldBubble;

    this.shieldBubble.isVisible = false;
    this.shieldBubble.setEnabled(false);

    // Traccia solo le mesh procedurali (escludendo hips usato come emettitore scia e shadow disc)
    this.proceduralMeshes = this.hips.getChildMeshes(false);

    this.applyCustomization('leo', '#2c5f8a', 'explorer_hat', 'gold_dust');
  }

  private makeMat(name: string, hex: string, spec: number): StandardMaterial {
    const m = new StandardMaterial(name, this.scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor = new Color3(spec, spec, spec);
    return m;
  }

  private buildHair(): void {
    const cap = MeshBuilder.CreateSphere('char_hair_cap', { diameter: 0.43, segments: 22 }, this.scene);
    cap.position.set(0, 0.21, -0.045);
    cap.scaling.set(1.0, 0.88, 1.03);
    cap.material = this.matHair;
    cap.parent = this.hairRoot;

    for (let i = -2; i <= 2; i++) {
      const tuft = MeshBuilder.CreateCapsule(
        `char_tuft_${i}`,
        { height: 0.16, radius: 0.052, tessellation: 14 },
        this.scene
      );
      tuft.position.set(i * 0.062, 0.29, 0.11 - Math.abs(i) * 0.02);
      tuft.rotation.x = 0.72;
      tuft.rotation.z = -i * 0.12;
      tuft.material = this.matHair;
      tuft.parent = this.hairRoot;
    }
  }

  private createArticulatedArm(side: -1 | 1): { shoulder: TransformNode; elbow: TransformNode } {
    const shoulder = new TransformNode(`char_sh_${side}`, this.scene);
    shoulder.parent = this.torso;
    shoulder.position.set(side * 0.34, 0.58, 0);

    const upper = MeshBuilder.CreateCapsule(
      `char_uarm_${side}`,
      { height: 0.34, radius: 0.088, tessellation: 18 },
      this.scene
    );
    upper.position.y = -0.15;
    upper.material = this.matPrimary;
    upper.parent = shoulder;

    const elbow = new TransformNode(`char_elb_${side}`, this.scene);
    elbow.parent = shoulder;
    elbow.position.set(0, -0.31, 0);

    const forearm = MeshBuilder.CreateCapsule(
      `char_farm_${side}`,
      { height: 0.32, radius: 0.074, tessellation: 18 },
      this.scene
    );
    forearm.position.y = -0.14;
    forearm.material = this.matDarkLeather;
    forearm.parent = elbow;

    const bracer = MeshBuilder.CreateCylinder(
      `char_bracer_${side}`,
      { height: 0.14, diameter: 0.17, tessellation: 22 },
      this.scene
    );
    bracer.position.y = -0.19;
    bracer.material = this.matSecondary;
    bracer.parent = elbow;

    const hand = MeshBuilder.CreateSphere(
      `char_hand_${side}`,
      { diameter: 0.14, segments: 18 },
      this.scene
    );
    hand.position.y = -0.3;
    hand.material = this.matSkin;
    hand.parent = elbow;

    return { shoulder, elbow };
  }

  private createArticulatedLeg(
    side: -1 | 1
  ): { hip: TransformNode; knee: TransformNode; ankle: TransformNode } {
    const hip = new TransformNode(`char_hip_${side}`, this.scene);
    hip.parent = this.hips;
    hip.position.set(side * 0.155, -0.06, 0);

    const thigh = MeshBuilder.CreateCapsule(
      `char_thigh_${side}`,
      { height: 0.44, radius: 0.112, tessellation: 18 },
      this.scene
    );
    thigh.position.y = -0.2;
    thigh.material = this.matPrimary;
    thigh.parent = hip;

    const knee = new TransformNode(`char_knee_${side}`, this.scene);
    knee.parent = hip;
    knee.position.set(0, -0.42, 0);

    const shin = MeshBuilder.CreateCapsule(
      `char_shin_${side}`,
      { height: 0.42, radius: 0.092, tessellation: 18 },
      this.scene
    );
    shin.position.y = -0.19;
    shin.material = this.matDarkLeather;
    shin.parent = knee;

    const bootCuff = MeshBuilder.CreateCylinder(
      `char_bcuff_${side}`,
      { height: 0.08, diameterTop: 0.21, diameterBottom: 0.19, tessellation: 22 },
      this.scene
    );
    bootCuff.position.y = -0.22;
    bootCuff.material = this.matSecondary;
    bootCuff.parent = knee;

    const ankle = new TransformNode(`char_ankle_${side}`, this.scene);
    ankle.parent = knee;
    ankle.position.set(0, -0.39, 0);

    const foot = MeshBuilder.CreateCapsule(
      `char_foot_${side}`,
      { height: 0.28, radius: 0.084, tessellation: 18 },
      this.scene
    );
    foot.rotation.x = Math.PI / 2;
    foot.position.set(0, -0.03, 0.09);
    foot.material = this.matDarkLeather;
    foot.parent = ankle;

    return { hip, knee, ankle };
  }

  private initFootDustParticles(): void {
    const ps = new ParticleSystem('player_foot_dust', 110, this.scene);
    ps.particleTexture = new Texture(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIUlEQVQoU2NkYGD4z8DAwMgABXAGkMDEyMjIyMDAwAgAN3IEB2r9p+AAAAAASUVORK5CYII=',
      this.scene
    );
    ps.emitter = this.root as unknown as Mesh;
    ps.minEmitBox = new Vector3(-0.32, 0.02, -0.35);
    ps.maxEmitBox = new Vector3(0.32, 0.12, 0.1);
    ps.color1 = new Color4(0.84, 0.76, 0.62, 0.52);
    ps.color2 = new Color4(0.7, 0.64, 0.54, 0.22);
    ps.colorDead = new Color4(0.6, 0.55, 0.45, 0.0);
    ps.minSize = 0.08;
    ps.maxSize = 0.22;
    ps.minLifeTime = 0.22;
    ps.maxLifeTime = 0.42;
    ps.gravity = new Vector3(0, 1.4, -2.5);
    ps.minEmitPower = 0.25;
    ps.maxEmitPower = 0.85;
    ps.emitRate = 0;
    ps.start();
    this.footDustSystem = ps;
  }

  private initBurstParticles(): void {
    const ps = new ParticleSystem('player_vfx_burst', 80, this.scene);
    ps.particleTexture = new Texture(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIUlEQVQoU2NkYGD4z8DAwMgABXAGkMDEyMjIyMDAwAgAN3IEB2r9p+AAAAAASUVORK5CYII=',
      this.scene
    );
    ps.emitter = this.hips as unknown as Mesh;
    ps.minEmitBox = new Vector3(-0.25, -0.35, -0.25);
    ps.maxEmitBox = new Vector3(0.25, 0.45, 0.25);
    ps.color1 = new Color4(1.0, 0.88, 0.35, 1.0);
    ps.color2 = new Color4(0.98, 0.72, 0.18, 0.6);
    ps.colorDead = new Color4(1.0, 0.85, 0.4, 0.0);
    ps.minSize = 0.09;
    ps.maxSize = 0.26;
    ps.minLifeTime = 0.2;
    ps.maxLifeTime = 0.48;
    ps.gravity = new Vector3(0, -1.8, 0);
    ps.minEmitPower = 1.4;
    ps.maxEmitPower = 3.8;
    ps.emitRate = 0;
    ps.start();
    this.burstSystem = ps;
  }

  public triggerBurst(kind: 'coin' | 'land' | 'near_miss'): void {
    if (this.burstSystem) {
      if (kind === 'coin') {
        this.burstSystem.color1 = new Color4(1.0, 0.9, 0.3, 1.0);
        this.burstSystem.color2 = new Color4(1.0, 0.65, 0.15, 0.7);
        this.burstSystem.manualEmitCount = 14;
      } else if (kind === 'land') {
        this.burstSystem.color1 = new Color4(0.95, 0.88, 0.72, 0.85);
        this.burstSystem.color2 = new Color4(0.85, 0.78, 0.62, 0.35);
        this.burstSystem.manualEmitCount = 24;
      } else {
        this.burstSystem.color1 = new Color4(0.22, 0.85, 1.0, 1.0);
        this.burstSystem.color2 = new Color4(0.95, 0.98, 1.0, 0.8);
        this.burstSystem.manualEmitCount = 24;
      }
    }

    if (kind === 'land' || kind === 'near_miss') {
      this.shockwaveTimer = 0.28;
      this.shockwaveRing.isVisible = true;
      this.shockwaveRing.scaling.set(0.4, 1, 0.4);
      if (kind === 'land') {
        this.shockwaveMat.diffuseColor = new Color3(0.95, 0.78, 0.35);
        this.shockwaveMat.emissiveColor = new Color3(0.85, 0.62, 0.18);
      } else {
        this.shockwaveMat.diffuseColor = new Color3(0.22, 0.88, 1.0);
        this.shockwaveMat.emissiveColor = new Color3(0.28, 0.82, 1.0);
      }
      this.shockwaveMat.alpha = 0.9;
    }
  }

  public applyCustomization(
    characterId: CharacterId,
    customColorHex: string,
    accessoryId: AccessoryId,
    trailId: TrailId
  ): void {
    const def = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
    // Miscela morbida verso il bianco così la texture hero_outfit.jpg resta nitida e dettagliata
    const chosen = Color3.FromHexString(customColorHex || def.baseColor);
    this.currentCharacterId = characterId;
    this.matPrimary.diffuseColor = Color3.Lerp(chosen, new Color3(1, 1, 1), 0.38);
    const secCol = Color3.FromHexString(def.secondaryColor);
    this.matSecondary.diffuseColor = Color3.Lerp(secCol, new Color3(1, 1, 1), 0.25);
    const acc = Color3.FromHexString(def.accentColor);
    this.matAccent.diffuseColor = acc;
    this.matAccent.emissiveColor = acc.scale(0.75);

    if (characterId === 'talos') {
      this.matSkin.diffuseColor = new Color3(0.58, 0.54, 0.48);
      this.matHair.diffuseColor = Color3.FromHexString('#38bdf8');
    } else if (characterId === 'nyx') {
      this.matSkin.diffuseColor = new Color3(0.8, 0.76, 0.88);
      this.matHair.diffuseColor = Color3.FromHexString('#1e1b4b');
    } else if (characterId === 'aethel') {
      this.matSkin.diffuseColor = new Color3(0.95, 0.82, 0.72);
      this.matHair.diffuseColor = Color3.FromHexString('#fef08a');
    } else {
      this.matSkin.diffuseColor = new Color3(0.89, 0.72, 0.58);
      this.matHair.diffuseColor = Color3.FromHexString('#2d1c14');
    }

    this.rebuildAccessory(accessoryId);
    this.rebuildTrail(trailId);

    const rigSpec = this.getRigSpec(characterId);
    if (this.scene.getEngine().getClassName() === 'NullEngine') {
      this.accessoryRoot.setEnabled(accessoryId !== 'none');
      return;
    }

    const suppressHatForTalos = characterId === 'talos' && accessoryId === 'explorer_hat';
    const showCustomAccessory =
      accessoryId !== 'none' &&
      !suppressHatForTalos &&
      (characterId === 'leo' || accessoryId !== def.defaultAccessory);
    const hideNativeHeadgear =
      characterId !== 'talos' && (showCustomAccessory || characterId === 'leo');

    if (this.rigLoaded && this.loadedRigFile === rigSpec.file) {
      this.syncLoadedRigAppearance(rigSpec, chosen, showCustomAccessory, hideNativeHeadgear);
      return;
    }

    this.accessoryRoot.setEnabled(false);
    const token = ++this.rigLoadToken;
    void this.loadCharacterRigAsync(token, rigSpec, chosen, showCustomAccessory, hideNativeHeadgear);
  }

  private getRigSpec(characterId: CharacterId): {
    file: string;
    hide: string[];
    nativeHeadgear: string[];
  } {
    switch (characterId) {
      case 'maya':
        return {
          file: 'Rogue.glb',
          hide: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable'],
          nativeHeadgear: [],
        };
      case 'nyx':
        return {
          file: 'Rogue_Hooded.glb',
          hide: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable'],
          nativeHeadgear: [],
        };
      case 'kaelen':
        return {
          file: 'Knight.glb',
          hide: [
            '1H_Sword_Offhand',
            'Rectangle_Shield',
            'Round_Shield',
            'Spike_Shield',
            '1H_Sword',
            '2H_Sword',
          ],
          nativeHeadgear: ['Knight_Helmet'],
        };
      case 'talos':
        return {
          file: 'Knight.glb',
          hide: [
            '1H_Sword_Offhand',
            'Badge_Shield',
            'Rectangle_Shield',
            'Round_Shield',
            '1H_Sword',
            '2H_Sword',
            'Knight_Head',
            'Knight_Cape',
          ],
          nativeHeadgear: [],
        };
      case 'aethel':
        return {
          file: 'Mage.glb',
          hide: ['Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff'],
          nativeHeadgear: ['Mage_Hat'],
        };
      case 'leo':
      default:
        return {
          file: 'Barbarian.glb',
          hide: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Mug'],
          nativeHeadgear: ['Barbarian_Hat'],
        };
    }
  }

  private async loadCharacterRigAsync(
    token: number,
    spec: { file: string; hide: string[]; nativeHeadgear: string[] },
    chosenColor: Color3,
    showCustomAccessory: boolean,
    hideNativeHeadgear: boolean
  ): Promise<void> {
    try {
      const result = await SceneLoader.ImportMeshAsync(
        '',
        '/assets/characters/',
        spec.file,
        this.scene
      );

      if (token !== this.rigLoadToken || this.scene.isDisposed) {
        for (const ag of result.animationGroups) ag.dispose();
        for (const sk of result.skeletons) sk.dispose();
        for (const m of result.meshes) m.dispose();
        for (const n of result.transformNodes) n.dispose();
        return;
      }

      this.disposeLoadedRig();

      this.loadedRigFile = spec.file;
      this.rigMeshes = result.meshes;
      this.rigNodes = result.transformNodes;
      this.rigSkeletons = result.skeletons;

      for (const m of result.meshes) {
        if (!m.parent) {
          m.parent = this.rigContainer;
        }
        m.isPickable = false;
        m.receiveShadows = true;
      }
      for (const n of result.transformNodes) {
        if (!n.parent) {
          n.parent = this.rigContainer;
        }
      }

      const clonedMaterials = new Map<string, PBRMaterial>();
      for (const mesh of result.meshes) {
        if (mesh.material instanceof PBRMaterial) {
          const role = this.classifyRigMeshRole(mesh.name);
          const orig = mesh.material;
          const cacheKey = `${orig.uniqueId}_${role}`;
          let clone = clonedMaterials.get(cacheKey);
          if (!clone) {
            clone = orig.clone(`${orig.name}_${role}_${token}`);
            const baseColor = orig.albedoColor ? orig.albedoColor.clone() : Color3.White();
            const baseTexture = orig.albedoTexture ?? null;
            const baseMetallic = typeof orig.metallic === 'number' ? orig.metallic : 0.15;
            const baseRoughness = typeof orig.roughness === 'number' ? orig.roughness : 0.65;
            clonedMaterials.set(cacheKey, clone);
            this.rigMaterialClones.push({
              clone,
              baseColor,
              baseTexture,
              baseMetallic,
              baseRoughness,
              role,
            });
          }
          mesh.material = clone;
        }
      }

      this.rigAnimGroups.clear();
      this.currentRigAnim = '';
      for (const ag of result.animationGroups) {
        ag.stop();
        ag.enableBlending = true;
        ag.blendingSpeed = 0.14;
        this.rigAnimGroups.set(ag.name, ag);
      }

      for (const m of this.proceduralMeshes) {
        m.isVisible = false;
        m.setEnabled(false);
      }

      this.rigLoaded = true;
      this.syncLoadedRigAppearance(spec, chosenColor, showCustomAccessory, hideNativeHeadgear);
      this.playRigAnimation('Idle', true, 1.0);
      this.onRigLoaded?.();
    } catch {
      // Fallback automatico sullo scheletro procedurale se il modello .glb non è caricabile
      if (token === this.rigLoadToken && !this.scene.isDisposed) {
        this.disposeLoadedRig();
      }
    }
  }

  private classifyRigMeshRole(meshName: string): 'head' | 'outfit' | 'limb' {
    if (meshName.endsWith('_Head')) {
      return 'head';
    }
    if (/Body|Cape/i.test(meshName)) {
      return 'outfit';
    }
    return 'limb';
  }

  private findRigBoneNode(boneName: string): TransformNode | undefined {
    return this.rigNodes.find(
      (n) =>
        n.name === boneName ||
        n.name.endsWith(`.${boneName}`) ||
        n.name.endsWith(`/${boneName}`)
    );
  }

  private clearNodeChildren(node: TransformNode): void {
    for (const child of node.getChildMeshes(false)) {
      child.dispose();
    }
  }

  private rebuildRigAttachments(headNode?: TransformNode): void {
    this.clearNodeChildren(this.rigBackGearRoot);
    this.clearNodeChildren(this.talosVisorRoot);

    const chestNode = this.findRigBoneNode('chest') ?? this.rigContainer;
    this.rigBackGearRoot.parent = chestNode;
    this.rigBackGearRoot.position.set(0, 0, 0);
    this.rigBackGearRoot.rotation.set(0, 0, 0);
    this.rigBackGearRoot.scaling.setAll(1);

    if (this.currentCharacterId === 'talos') {
      // Corazza meccanica dorata-ciano e Reattore Arcano frontale + propulsore dorsale
      const frontRing = MeshBuilder.CreateTorus(
        'talos_front_reactor_ring',
        { diameter: 0.36, thickness: 0.07, tessellation: 24 },
        this.scene
      );
      frontRing.rotation.x = Math.PI / 2;
      frontRing.position.set(0, 0.14, 0.38);
      frontRing.material = this.matSecondary;
      frontRing.parent = this.rigBackGearRoot;

      const frontCore = MeshBuilder.CreateSphere(
        'talos_front_reactor_core',
        { diameter: 0.24, segments: 18 },
        this.scene
      );
      frontCore.position.set(0, 0.14, 0.39);
      frontCore.material = this.matAccent;
      frontCore.parent = this.rigBackGearRoot;

      const backPack = MeshBuilder.CreateBox(
        'talos_back_pack',
        { width: 0.48, height: 0.56, depth: 0.24 },
        this.scene
      );
      backPack.position.set(0, 0.14, -0.4);
      backPack.material = this.matSecondary;
      backPack.parent = this.rigBackGearRoot;

      const backRing = MeshBuilder.CreateTorus(
        'talos_back_reactor_ring',
        { diameter: 0.3, thickness: 0.06, tessellation: 22 },
        this.scene
      );
      backRing.rotation.x = Math.PI / 2;
      backRing.position.set(0, 0.14, -0.52);
      backRing.material = this.matAccent;
      backRing.parent = this.rigBackGearRoot;

      for (const side of [-1, 1]) {
        const thruster = MeshBuilder.CreateCylinder(
          `talos_thruster_${side}`,
          { height: 0.24, diameterTop: 0.1, diameterBottom: 0.15, tessellation: 14 },
          this.scene
        );
        thruster.position.set(side * 0.16, 0.32, -0.44);
        thruster.rotation.x = -0.25;
        thruster.material = this.matDarkLeather;
        thruster.parent = this.rigBackGearRoot;
      }

      this.rigBackGearRoot.setEnabled(true);

      if (headNode) {
        this.talosVisorRoot.parent = headNode;
        this.talosVisorRoot.position.set(0, 0, 0);
        this.talosVisorRoot.rotation.set(0, 0, 0);
        this.talosVisorRoot.scaling.setAll(1);

        const innerSkull = MeshBuilder.CreateSphere(
          'talos_inner_skull',
          { diameter: 0.72, segments: 18 },
          this.scene
        );
        innerSkull.position.set(0, 0.42, 0.02);
        innerSkull.material = this.matDarkLeather;
        innerSkull.parent = this.talosVisorRoot;

        const cyanVisor = MeshBuilder.CreateBox(
          'talos_cyan_visor',
          { width: 0.52, height: 0.13, depth: 0.18 },
          this.scene
        );
        cyanVisor.position.set(0, 0.48, 0.43);
        cyanVisor.material = this.matAccent;
        cyanVisor.parent = this.talosVisorRoot;

        this.talosVisorRoot.setEnabled(true);
      } else {
        this.talosVisorRoot.setEnabled(false);
      }
      return;
    }

    this.talosVisorRoot.setEnabled(false);

    if (this.currentCharacterId === 'leo' || this.currentCharacterId === 'maya') {
      const pack = MeshBuilder.CreateBox(
        'explorer_backpack',
        { width: 0.46, height: 0.56, depth: 0.24 },
        this.scene
      );
      pack.position.set(0, 0.12, -0.43);
      pack.material = this.matDarkLeather;
      pack.parent = this.rigBackGearRoot;

      const bedroll = MeshBuilder.CreateCylinder(
        'explorer_bedroll',
        { height: 0.48, diameter: 0.16, tessellation: 16 },
        this.scene
      );
      bedroll.rotation.z = Math.PI / 2;
      bedroll.position.set(0, 0.44, -0.42);
      bedroll.material = this.matPrimary;
      bedroll.parent = this.rigBackGearRoot;

      const clasp = MeshBuilder.CreateBox(
        'explorer_pack_clasp',
        { width: 0.14, height: 0.14, depth: 0.06 },
        this.scene
      );
      clasp.position.set(0, 0.18, -0.56);
      clasp.material = this.matSecondary;
      clasp.parent = this.rigBackGearRoot;

      const lanternGlow = MeshBuilder.CreateSphere(
        'explorer_lantern_glow',
        { diameter: 0.16, segments: 12 },
        this.scene
      );
      lanternGlow.position.set(0.22, -0.02, -0.56);
      lanternGlow.material = this.matSecondary;
      lanternGlow.parent = this.rigBackGearRoot;

      this.rigBackGearRoot.setEnabled(true);
      return;
    }

    this.rigBackGearRoot.setEnabled(false);
  }

  private syncLoadedRigAppearance(
    spec: { file: string; hide: string[]; nativeHeadgear: string[] },
    chosenColor: Color3,
    showCustomAccessory: boolean,
    hideNativeHeadgear: boolean = showCustomAccessory
  ): void {
    const hideSet = new Set(spec.hide);
    const headgearSet = new Set(spec.nativeHeadgear);

    for (const mesh of this.rigMeshes) {
      const shouldHide =
        hideSet.has(mesh.name) || (hideNativeHeadgear && headgearSet.has(mesh.name));
      mesh.isVisible = !shouldHide;
      mesh.setEnabled(!shouldHide);
    }

    const isTalos = this.currentCharacterId === 'talos';
    for (const entry of this.rigMaterialClones) {
      if (entry.role === 'head') {
        entry.clone.albedoTexture = entry.baseTexture;
        entry.clone.albedoColor = Color3.White();
        entry.clone.emissiveColor = Color3.Black();
        entry.clone.metallic = entry.baseMetallic;
        entry.clone.roughness = entry.baseRoughness;
        entry.clone.clearCoat.isEnabled = false;
      } else if (entry.role === 'outfit') {
        if (isTalos) {
          entry.clone.albedoTexture = this.texBronze;
          entry.clone.albedoColor = Color3.Lerp(chosenColor, new Color3(1.0, 0.84, 0.46), 0.55);
          entry.clone.emissiveColor = new Color3(0.16, 0.12, 0.04);
          entry.clone.metallic = 0.32;
          entry.clone.roughness = 0.18;
          entry.clone.clearCoat.isEnabled = true;
          entry.clone.clearCoat.intensity = 0.75;
          entry.clone.clearCoat.roughness = 0.12;
        } else {
          entry.clone.albedoTexture = this.texOutfit;
          entry.clone.albedoColor = Color3.Lerp(chosenColor, Color3.White(), 0.12);
          entry.clone.emissiveColor = chosenColor.scale(0.14);
          entry.clone.metallic = 0.12;
          entry.clone.roughness = 0.52;
          entry.clone.clearCoat.isEnabled = false;
        }
      } else {
        if (isTalos) {
          entry.clone.albedoTexture = this.texBronze;
          entry.clone.albedoColor = Color3.Lerp(chosenColor, new Color3(1.0, 0.84, 0.46), 0.55);
          entry.clone.emissiveColor = new Color3(0.08, 0.16, 0.22);
          entry.clone.metallic = 0.32;
          entry.clone.roughness = 0.18;
          entry.clone.clearCoat.isEnabled = true;
          entry.clone.clearCoat.intensity = 0.75;
          entry.clone.clearCoat.roughness = 0.12;
        } else {
          entry.clone.albedoTexture = entry.baseTexture;
          entry.clone.albedoColor = Color3.Lerp(entry.baseColor, chosenColor, 0.42);
          entry.clone.emissiveColor = chosenColor.scale(0.05);
          entry.clone.metallic = entry.baseMetallic;
          entry.clone.roughness = entry.baseRoughness;
          entry.clone.clearCoat.isEnabled = false;
        }
      }
    }

    const headNode = this.findRigBoneNode('head');
    if (headNode) {
      this.accessoryRoot.parent = headNode;
      this.accessoryRoot.position.set(0, 0.73, -0.02);
      this.accessoryRoot.rotation.set(-0.08, 0, 0);
      this.accessoryRoot.scaling.set(2.45, 2.35, 2.45);
      this.accessoryRoot.setEnabled(showCustomAccessory);
    } else {
      this.accessoryRoot.setEnabled(false);
    }

    this.rebuildRigAttachments(headNode);
  }

  private playRigAnimation(clipName: string, loop: boolean, speedRatio: number): void {
    const ag =
      this.rigAnimGroups.get(clipName) ??
      this.rigAnimGroups.get('Idle') ??
      Array.from(this.rigAnimGroups.values())[0];
    if (!ag) return;

    const targetKey = ag.name;
    if (this.currentRigAnim !== targetKey) {
      for (const other of this.rigAnimGroups.values()) {
        if (other !== ag && other.isPlaying) {
          other.stop();
        }
      }
      ag.reset();
      ag.start(loop, speedRatio);
      this.currentRigAnim = targetKey;
    } else {
      ag.speedRatio = speedRatio;
    }
  }

  private disposeLoadedRig(): void {
    this.accessoryRoot.parent = this.head;
    this.accessoryRoot.position.set(0, 0.3, 0);
    this.accessoryRoot.rotation.set(0, 0, 0);
    this.accessoryRoot.scaling.setAll(1);
    this.accessoryRoot.setEnabled(this.scene.getEngine().getClassName() === 'NullEngine');

    this.clearNodeChildren(this.rigBackGearRoot);
    this.rigBackGearRoot.parent = this.rigContainer;
    this.rigBackGearRoot.setEnabled(false);

    this.clearNodeChildren(this.talosVisorRoot);
    this.talosVisorRoot.parent = this.rigContainer;
    this.talosVisorRoot.setEnabled(false);

    for (const ag of this.rigAnimGroups.values()) {
      ag.stop();
      ag.dispose();
    }
    this.rigAnimGroups.clear();
    for (const sk of this.rigSkeletons) {
      sk.dispose();
    }
    this.rigSkeletons = [];
    for (const entry of this.rigMaterialClones) {
      entry.clone.dispose();
    }
    this.rigMaterialClones = [];
    for (const m of this.rigMeshes) {
      m.dispose();
    }
    this.rigMeshes = [];
    for (const n of this.rigNodes) {
      n.dispose();
    }
    this.rigNodes = [];

    this.loadedRigFile = null;
    this.rigLoaded = false;
    this.currentRigAnim = '';

    for (const m of this.proceduralMeshes) {
      m.isVisible = true;
      m.setEnabled(true);
    }
  }

  private rebuildAccessory(accId: AccessoryId): void {
    for (const child of this.accessoryRoot.getChildMeshes()) {
      child.dispose();
    }
    if (accId === 'none') return;

    if (accId === 'explorer_hat') {
      // Cappello Fedora proporzionato con tesa compatta anti-compenetrazione
      const hatProfile = [
        new Vector3(0.34, -0.01, 0),
        new Vector3(0.28, 0.022, 0),
        new Vector3(0.225, 0.02, 0),
        new Vector3(0.215, 0.13, 0),
        new Vector3(0.175, 0.21, 0),
        new Vector3(0.075, 0.195, 0),
        new Vector3(0.0, 0.21, 0),
      ];
      const hat = MeshBuilder.CreateLathe(
        'acc_fedora',
        { shape: hatProfile, tessellation: 28, sideOrientation: Mesh.DOUBLESIDE },
        this.scene
      );
      hat.material = this.matDarkLeather;
      hat.parent = this.accessoryRoot;

      const band = MeshBuilder.CreateCylinder(
        'acc_hat_band',
        { height: 0.05, diameterTop: 0.43, diameterBottom: 0.45, tessellation: 24 },
        this.scene
      );
      band.position.y = 0.05;
      band.material = this.matSecondary;
      band.parent = this.accessoryRoot;
    } else if (accId === 'sun_crown' || accId === 'celestial_tiara') {
      const ring = MeshBuilder.CreateTorus(
        'acc_crown',
        { diameter: 0.46, thickness: 0.065, tessellation: 24 },
        this.scene
      );
      ring.material = this.matSecondary;
      ring.parent = this.accessoryRoot;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        const spike = MeshBuilder.CreateCylinder(
          `acc_sp_${i}`,
          { height: 0.18, diameterTop: 0.01, diameterBottom: 0.07, tessellation: 14 },
          this.scene
        );
        spike.position.set(Math.cos(angle) * 0.22, 0.09, Math.sin(angle) * 0.22);
        spike.material = this.matAccent;
        spike.parent = this.accessoryRoot;
      }
    } else if (accId === 'shadow_hood') {
      const hood = MeshBuilder.CreateSphere(
        'acc_hood',
        { diameter: 0.56, segments: 20 },
        this.scene
      );
      hood.position.set(0, -0.12, -0.07);
      hood.scaling.set(1.02, 1.05, 1.15);
      hood.material = this.matPrimary;
      hood.parent = this.accessoryRoot;
    } else if (accId === 'ancient_helm') {
      const helm = MeshBuilder.CreateCylinder(
        'acc_helm',
        { height: 0.44, diameterTop: 0.48, diameterBottom: 0.52, tessellation: 24 },
        this.scene
      );
      helm.position.y = -0.1;
      helm.material = this.matSecondary;
      helm.parent = this.accessoryRoot;

      const visor = MeshBuilder.CreateTorus(
        'acc_visor',
        { diameter: 0.48, thickness: 0.05, tessellation: 24 },
        this.scene
      );
      visor.position.y = -0.1;
      visor.material = this.matAccent;
      visor.parent = this.accessoryRoot;
    }
  }

  private rebuildTrail(trailId: TrailId): void {
    if (this.trailSystem) {
      this.trailSystem.dispose();
      this.trailSystem = null;
    }
    if (trailId === 'none') return;

    const trailDef = TRAILS.find((t) => t.id === trailId) ?? TRAILS[1];
    const ps = new ParticleSystem('player_trail_ps', 150, this.scene);
    ps.particleTexture = new Texture(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIUlEQVQoU2NkYGD4z8DAwMgABXAGkMDEyMjIyMDAwAgAN3IEB2r9p+AAAAAASUVORK5CYII=',
      this.scene
    );
    const col = Color3.FromHexString(trailDef.colorHex);
    ps.color1 = new Color4(col.r, col.g, col.b, 0.9);
    ps.color2 = new Color4(col.r, col.g, col.b, 0.22);
    ps.emitter = this.hips as unknown as Mesh;
    ps.minEmitBox = new Vector3(-0.22, -0.25, -0.28);
    ps.maxEmitBox = new Vector3(0.22, 0.25, 0.08);
    ps.minSize = 0.08;
    ps.maxSize = 0.22;
    ps.minLifeTime = 0.25;
    ps.maxLifeTime = 0.55;
    ps.emitRate = 55;
    ps.start();
    this.trailSystem = ps;
  }

  public setShieldVisual(active: boolean): void {
    this.shieldBubble.setEnabled(active);
    this.shieldBubble.isVisible = active;
    if (active) {
      this.shieldBubble.rotation.y += 0.035;
      const pulse = 1 + Math.sin(this.animPhase * 0.6) * 0.025;
      this.shieldBubble.scaling.set(0.92 * pulse, 1.04 * pulse, 0.92 * pulse);
    }
  }

  private computeRunLegAngles(phase: number): { hip: number; knee: number; ankle: number } {
    const s = Math.sin(phase);
    const v = Math.cos(phase); // v >= 0: gamba spinge indietro a terra (stance); v < 0: richiamo in volo (swing)
    const hip = s * 0.94;

    if (v >= 0) {
      // Appoggio e spinta a terra: ginocchio quasi disteso, ammortizza al centro, poi caviglia estende allo stacco
      const midStance = 1 - Math.abs(s);
      const knee = 0.14 + midStance * 0.24;
      const toeOff = Math.max(0, s);
      const heelStrike = Math.max(0, -s);
      const ankle = toeOff * 0.58 - heelStrike * 0.24;
      return { hip, knee, ankle };
    }

    // Fase aerea di richiamo in avanti: ginocchio si flette profondamente all'indietro alzando lo stivale dal suolo!
    const swingPeak = Math.pow(-v, 0.72);
    const knee = 0.22 + swingPeak * 1.42;
    const ankle = -0.28 * swingPeak;
    return { hip, knee, ankle };
  }

  public updateAnimation(
    state: PlayerAnimState,
    dt: number,
    speed: number,
    celebrationStyle: CelebrationStyle
  ): void {
    // Frequenza sincronizzata alla velocità reale del terreno: evita ogni effetto pattinamento
    const strideFreq =
      state === 'IDLE' || state === 'CELEBRATE' || state === 'CRASH'
        ? 4.6
        : Math.max(9.2, speed * 1.18);
    this.animPhase += dt * strideFreq;
    const blend = Math.min(1, dt * 18);

    const wasAirborne =
      this.prevAnimState === 'JUMP' ||
      this.prevAnimState === 'DOUBLE_JUMP' ||
      this.prevAnimState === 'FALL';
    if (state === 'LAND' && wasAirborne) {
      this.triggerBurst('land');
    }
    this.prevAnimState = state;

    // Rotazione continua degli anelli della Reliquia sullo zaino
    this.relicRingA.rotation.y += dt * 3.4;
    this.relicRingA.rotation.x += dt * 1.6;
    this.relicRingB.rotation.y -= dt * 2.8;
    this.relicRingB.rotation.z += dt * 2.1;

    // Aggiorna espansione onda d'urto a terra
    if (this.shockwaveTimer > 0) {
      this.shockwaveTimer -= dt;
      const t = 1 - Math.max(0, this.shockwaveTimer / 0.28);
      const scale = 0.4 + t * 1.65;
      this.shockwaveRing.scaling.set(scale, 1, scale);
      this.shockwaveMat.alpha = (1 - t) * 0.85;
      if (this.shockwaveTimer <= 0) {
        this.shockwaveRing.isVisible = false;
      }
    }

    if (state === 'DOUBLE_JUMP') {
      this.doubleJumpSpin += dt * 11.5;
    } else {
      this.doubleJumpSpin += (0 - this.doubleJumpSpin) * Math.min(1, dt * 18);
    }

    if (this.footDustSystem) {
      this.footDustSystem.emitRate =
        state === 'RUN' || state === 'LANE_LEFT' || state === 'LANE_RIGHT'
          ? 28
          : state === 'SLIDE'
            ? 55
            : 0;
    }

    const playerY = Math.max(0, this.root.position.y);
    this.contactShadow.position.y = 0.03 - this.root.position.y;
    const shadowScale = Math.max(0.45, 1.0 - Math.min(0.55, playerY * 0.2));
    this.contactShadow.scaling.setAll(shadowScale);

    if (this.rigLoaded) {
      const runCadence = Math.max(0.85, Math.min(1.65, speed / 12.5));
      switch (state) {
        case 'IDLE':
          this.playRigAnimation('Idle', true, 1.0);
          break;
        case 'RUN':
        case 'LANE_LEFT':
        case 'LANE_RIGHT':
          this.playRigAnimation('Running_A', true, runCadence);
          break;
        case 'JUMP':
        case 'FALL':
          this.playRigAnimation('Jump_Idle', true, 1.0);
          break;
        case 'DOUBLE_JUMP':
          this.playRigAnimation('Jump_Idle', true, 1.2);
          break;
        case 'LAND':
          this.playRigAnimation('Jump_Land', false, 1.45);
          break;
        case 'SLIDE':
          if (this.rigAnimGroups.has('Sit_Floor_Pose')) {
            this.playRigAnimation('Sit_Floor_Pose', true, 1.0);
          } else if (this.rigAnimGroups.has('Lie_Idle')) {
            this.playRigAnimation('Lie_Idle', true, 1.0);
          } else {
            this.playRigAnimation('Dodge_Forward', false, 1.35);
          }
          break;
        case 'STUMBLE':
          this.playRigAnimation('Hit_A', false, 1.2);
          break;
        case 'CRASH':
          this.playRigAnimation('Death_A', false, 1.0);
          break;
        case 'CELEBRATE':
          this.playRigAnimation(
            celebrationStyle === 'spin_leap' ? '2H_Melee_Attack_Spin' : 'Cheer',
            true,
            1.0
          );
          break;
      }

      const targetRigPosY = state === 'SLIDE' ? 0.05 : 0;
      const targetScaleY = state === 'SLIDE' ? 0.48 : 0.68;
      const targetRigRotZ =
        state === 'LANE_LEFT' ? 0.16 : state === 'LANE_RIGHT' ? -0.16 : 0;
      const targetRigRotX = 0;

      this.rigContainer.position.y += (targetRigPosY - this.rigContainer.position.y) * blend;
      this.rigContainer.scaling.set(
        0.68,
        this.rigContainer.scaling.y + (targetScaleY - this.rigContainer.scaling.y) * blend,
        0.68
      );
      this.rigContainer.rotation.z += (targetRigRotZ - this.rigContainer.rotation.z) * blend;
      if (state === 'DOUBLE_JUMP') {
        this.rigContainer.rotation.x = this.doubleJumpSpin;
      } else {
        this.rigContainer.rotation.x += (targetRigRotX - this.rigContainer.rotation.x) * blend;
      }
      if (this.accessoryRoot.parent !== this.head) {
        const targetAccY = state === 'SLIDE' ? 0.58 : 0.73;
        this.accessoryRoot.position.y += (targetAccY - this.accessoryRoot.position.y) * blend;
      }
      return;
    }

    let tHipsY = 0.96;
    let tHipsYaw = 0;
    let tHipsRoll = 0;
    let tTorsoX = 0;
    let tTorsoZ = 0;
    let tTorsoY = 0;
    let tHeadX = 0;
    let tHeadY = 0;
    let tHeadZ = 0;
    let tHipLX = 0;
    let tHipRX = 0;
    let tKneeLX = 0;
    let tKneeRX = 0;
    let tAnkLX = 0;
    let tAnkRX = 0;
    let tShLX = 0;
    let tShRX = 0;
    let tElbLX = -0.35;
    let tElbRX = -0.35;
    let tCapeX = 0.25;

    switch (state) {
      case 'IDLE': {
        const breath = Math.sin(this.animPhase * 0.45);
        const sway = Math.sin(this.animPhase * 0.22);
        tHipsY = 0.96 + breath * 0.032;
        tHipsRoll = sway * 0.045;
        tTorsoX = 0.03 + breath * 0.025;
        tTorsoZ = -sway * 0.035;
        tHeadY = Math.sin(this.animPhase * 0.35) * 0.32;
        tHeadX = Math.cos(this.animPhase * 0.25) * 0.08;
        tHeadZ = sway * 0.05;
        tShLX = 0.1 + breath * 0.06;
        tShRX = -0.1 - breath * 0.06;
        tElbLX = -0.32 - breath * 0.08;
        tElbRX = -0.32 + breath * 0.08;
        tHipLX = -0.05;
        tHipRX = 0.05;
        tKneeLX = 0.1;
        tKneeRX = 0.08;
        tAnkLX = -0.04;
        tAnkRX = -0.04;
        tCapeX = 0.16 + Math.sin(this.animPhase * 0.55) * 0.11;
        break;
      }
      case 'RUN': {
        const s = Math.sin(this.animPhase);
        const legL = this.computeRunLegAngles(this.animPhase);
        const legR = this.computeRunLegAngles(this.animPhase + Math.PI);
        const flightArc = Math.pow(Math.abs(s), 1.35);

        tHipsY = 0.87 + flightArc * 0.165;
        tHipsYaw = s * 0.16;
        tHipsRoll = Math.cos(this.animPhase) * 0.055;
        tTorsoX = 0.31 + Math.min(0.11, speed * 0.004) + flightArc * 0.04;
        tTorsoY = -s * 0.24;
        tHeadY = s * 0.1;
        tHeadX = -0.14;
        tHipLX = legL.hip;
        tKneeLX = legL.knee;
        tAnkLX = legL.ankle;
        tHipRX = legR.hip;
        tKneeRX = legR.knee;
        tAnkRX = legR.ankle;
        tShLX = -s * 1.12;
        tShRX = s * 1.12;
        tElbLX = -1.15 - Math.max(0, -s) * 0.45;
        tElbRX = -1.15 - Math.max(0, s) * 0.45;
        tCapeX = 0.65 + Math.sin(this.animPhase * 1.25) * 0.22;
        break;
      }
      case 'LANE_LEFT':
      case 'LANE_RIGHT': {
        const s = Math.sin(this.animPhase);
        const sign = state === 'LANE_LEFT' ? 1 : -1;
        const legL = this.computeRunLegAngles(this.animPhase);
        const legR = this.computeRunLegAngles(this.animPhase + Math.PI);
        tHipsY = 0.88 + Math.abs(s) * 0.14;
        tTorsoX = 0.3;
        tTorsoZ = sign * 0.3;
        tTorsoY = -sign * 0.16;
        tHipsYaw = sign * 0.14;
        tHeadY = sign * 0.18;
        tHeadZ = -sign * 0.12;
        tHipLX = legL.hip * 0.9;
        tKneeLX = legL.knee;
        tAnkLX = legL.ankle;
        tHipRX = legR.hip * 0.9;
        tKneeRX = legR.knee;
        tAnkRX = legR.ankle;
        tShLX = -sign * 0.55 - s * 0.55;
        tShRX = sign * 0.55 + s * 0.55;
        tElbLX = -1.05;
        tElbRX = -1.05;
        tCapeX = 0.68;
        break;
      }
      case 'JUMP': {
        tHipsY = 1.05;
        tTorsoX = 0.14;
        tHeadX = -0.14;
        tHipLX = -1.05;
        tKneeLX = 1.32;
        tAnkLX = 0.42;
        tHipRX = 0.42;
        tKneeRX = 0.55;
        tAnkRX = 0.45;
        tShLX = -1.45;
        tShRX = -0.82;
        tElbLX = -0.45;
        tElbRX = -0.75;
        tCapeX = 0.98;
        break;
      }
      case 'DOUBLE_JUMP': {
        tHipsY = 1.02;
        tTorsoX = 0.52;
        tHipLX = -1.15;
        tHipRX = -1.15;
        tKneeLX = 1.65;
        tKneeRX = 1.65;
        tAnkLX = 0.45;
        tAnkRX = 0.45;
        tShLX = -1.55;
        tShRX = -1.55;
        tElbLX = -0.9;
        tElbRX = -0.9;
        tCapeX = 1.15;
        break;
      }
      case 'FALL': {
        tTorsoX = 0.15;
        tHeadX = 0.18;
        tHipLX = -0.3;
        tHipRX = 0.25;
        tKneeLX = 0.45;
        tKneeRX = 0.35;
        tAnkLX = 0.25;
        tAnkRX = 0.25;
        tShLX = -1.1;
        tShRX = -1.1;
        tCapeX = 1.05;
        break;
      }
      case 'LAND': {
        tHipsY = 0.7;
        tTorsoX = 0.42;
        tHeadX = -0.18;
        tHipLX = -0.55;
        tHipRX = -0.55;
        tKneeLX = 0.95;
        tKneeRX = 0.95;
        tAnkLX = -0.25;
        tAnkRX = -0.25;
        tShLX = 0.45;
        tShRX = 0.45;
        tCapeX = 0.45;
        break;
      }
      case 'SLIDE': {
        tHipsY = 0.34;
        tTorsoX = -0.78;
        tTorsoY = 0.12;
        tHeadX = 0.48;
        tHipLX = -1.35;
        tKneeLX = 0.15;
        tAnkLX = 0.42;
        tHipRX = 0.45;
        tKneeRX = 1.45;
        tAnkRX = 0.35;
        tShLX = 0.72;
        tElbLX = -0.35;
        tShRX = -0.95;
        tElbRX = -0.7;
        tCapeX = 0.88;
        break;
      }
      case 'STUMBLE': {
        tHipsY = 0.8;
        tTorsoX = 0.55;
        tTorsoZ = Math.sin(this.animPhase * 3.2) * 0.32;
        tHeadZ = -tTorsoZ * 0.6;
        tShLX = -1.0;
        tShRX = 1.0;
        break;
      }
      case 'CRASH': {
        tHipsY = 0.32;
        tTorsoX = -1.35;
        tHeadX = 0.35;
        tHipLX = -0.5;
        tHipRX = 0.4;
        tShLX = -1.1;
        tShRX = 1.1;
        break;
      }
      case 'CELEBRATE': {
        tHipsY = 0.96 + Math.abs(Math.sin(this.animPhase * 0.7)) * 0.22;
        tHeadX = -0.15;
        if (celebrationStyle === 'spin_leap') {
          tTorsoY = this.animPhase * 1.1;
        } else {
          tShLX = -2.4;
          tShRX = -2.4;
        }
        break;
      }
    }

    this.hips.position.y += (tHipsY - this.hips.position.y) * blend;
    this.hips.rotation.x = state === 'DOUBLE_JUMP' ? this.doubleJumpSpin : 0;
    this.hips.rotation.y += (tHipsYaw - this.hips.rotation.y) * blend;
    this.hips.rotation.z += (tHipsRoll - this.hips.rotation.z) * blend;
    this.torso.rotation.x += (tTorsoX - this.torso.rotation.x) * blend;
    this.torso.rotation.z += (tTorsoZ - this.torso.rotation.z) * blend;
    this.torso.rotation.y += (tTorsoY - this.torso.rotation.y) * blend;

    this.head.rotation.x += (tHeadX - this.head.rotation.x) * blend;
    this.head.rotation.y += (tHeadY - this.head.rotation.y) * blend;
    this.head.rotation.z += (tHeadZ - this.head.rotation.z) * blend;

    this.hipL.rotation.x += (tHipLX - this.hipL.rotation.x) * blend;
    this.hipR.rotation.x += (tHipRX - this.hipR.rotation.x) * blend;
    this.kneeL.rotation.x += (tKneeLX - this.kneeL.rotation.x) * blend;
    this.kneeR.rotation.x += (tKneeRX - this.kneeR.rotation.x) * blend;
    this.ankleL.rotation.x += (tAnkLX - this.ankleL.rotation.x) * blend;
    this.ankleR.rotation.x += (tAnkRX - this.ankleR.rotation.x) * blend;

    this.shoulderL.rotation.x += (tShLX - this.shoulderL.rotation.x) * blend;
    this.shoulderR.rotation.x += (tShRX - this.shoulderR.rotation.x) * blend;
    this.elbowL.rotation.x += (tElbLX - this.elbowL.rotation.x) * blend;
    this.elbowR.rotation.x += (tElbRX - this.elbowR.rotation.x) * blend;

    this.capeUpper.rotation.x += (tCapeX - this.capeUpper.rotation.x) * blend;
    this.capeLower.rotation.x = Math.sin(this.animPhase * 1.6) * 0.28 + 0.16;
  }

  public dispose(): void {
    this.rigLoadToken += 1;
    this.disposeLoadedRig();
    this.trailSystem?.dispose();
    this.footDustSystem?.dispose();
    this.burstSystem?.dispose();
    this.contactShadowTex.dispose();
    this.contactShadowMat.dispose();
    this.shockwaveMat.dispose();
    this.shieldMat.dispose();
    this.shieldRingMat.dispose();
    this.heroLight.dispose();
    this.heroFrontLight.dispose();
    this.texOutfit.dispose();
    this.texLeather.dispose();
    this.texBronze.dispose();
    this.matPrimary.dispose();
    this.matSecondary.dispose();
    this.matSkin.dispose();
    this.matAccent.dispose();
    this.matDarkLeather.dispose();
    this.matHair.dispose();
    this.root.dispose();
  }
}

import {
  Camera,
  Color3,
  Color4,
  DirectionalLight,
  GlowLayer,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  Vector4,
  VertexBuffer,
  VolumetricLightScatteringPostProcess,
} from '@babylonjs/core';
import { BIOMES } from '../data/gameCatalog';
import { ProceduralTextures } from './ProceduralTextures';
import type { ModelAssetLoader } from './ModelAssetLoader';
import { TRACK_WIDTH, TrackMath } from './TrackMath';
import type { BiomeId, QualityPreset, TrackSegmentData } from '../types/game.types';

export interface BiomeMaterialSet {
  floor: StandardMaterial;
  terrain: StandardMaterial;
  wall: StandardMaterial;
  wood: StandardMaterial;
  trim: StandardMaterial;
  foliage: StandardMaterial;
  accentGlow: StandardMaterial;
  waterOrLava: StandardMaterial;
  cliff: StandardMaterial;
}

interface BiomeAtmosphereProfile {
  biome: BiomeId;
  fogColor: Color3;
  fogDensityBase: number;
  hemiIntensity: number;
  hemiGround: Color3;
  sunIntensity: number;
  sunDiffuse: Color3;
  valleyColor: Color3;
  valleyEmissive: Color3;
  sunDiscColor: Color3;
  particleColor1: Color4;
  particleGravity: Vector3;
  skyTex: Texture;
  valleySourceTex: Texture;
}

export class EnvironmentManager {
  private readonly textures: ProceduralTextures;
  private readonly materials: Map<BiomeId, BiomeMaterialSet> = new Map();
  private hemiLight: HemisphericLight;
  private sunLight: DirectionalLight;
  private shadowGen: ShadowGenerator | null = null;
  private glowLayer: GlowLayer | null = null;
  private skyDome: Mesh;
  private skyMat: StandardMaterial;
  private valleyPlane: Mesh;
  private valleyMat: StandardMaterial;
  private valleyTex: Texture | null = null;
  private skyCloudMat: StandardMaterial;
  private readonly shadowCasters = new Set<TransformNode>();
  private weatherParticles: ParticleSystem | null = null;
  private readonly weatherEmitterPos = new Vector3(0, 6, 14);
  private vlsPostProcess: VolumetricLightScatteringPostProcess | null = null;
  private vlsCamera: Camera | null = null;
  private sunDisc: Mesh | null = null;
  private sunDiscMat: StandardMaterial | null = null;
  private animatedProps: Array<{
    node: TransformNode;
    kind: 'tree' | 'crystal' | 'torch' | 'astrolabe' | 'portal_ring';
    phase: number;
  }> = [];
  private readonly icoTemplates: Map<string, Mesh> = new Map();
  private currentBiome: BiomeId = 'jungle';
  private timeOfDay = 0.25;
  private activeTempest = false;
  private smoothYaw = 0;

  // Stato di transizione atmosferica fluida (crossfade continuo senza stacchi netti)
  private currentProfile: BiomeAtmosphereProfile | null = null;
  private transitionFrom: BiomeAtmosphereProfile | null = null;
  private transitionTo: BiomeAtmosphereProfile | null = null;
  private transitionTimer = 0;
  private readonly transitionDuration = 2.4;
  private transitionActive = false;
  private transitionSwappedTextures = false;
  private currentSunBaseIntensity = 1.34;
  private readonly tmpParticleColor = new Color4(1, 1, 1, 0.85);
  private readonly tmpGravity = new Vector3(0, 0, 0);

  constructor(
    private readonly scene: Scene,
    private readonly modelLoader: ModelAssetLoader | null = null
  ) {
    this.textures = new ProceduralTextures(scene);

    this.hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
    this.hemiLight.intensity = 1.05;
    this.hemiLight.groundColor = new Color3(0.32, 0.28, 0.22);

    this.sunLight = new DirectionalLight('sunLight', new Vector3(-0.4, -0.85, -0.35), scene);
    this.sunLight.position = new Vector3(25, 45, 25);
    this.sunLight.intensity = 1.35;

    // GlowLayer calibrato solo su gemme, fiamme e rune (esclude lo SkyDome!)
    try {
      this.glowLayer = new GlowLayer('glowLayer', scene, {
        mainTextureFixedSize: 512,
        blurKernelSize: 24,
      });
      this.glowLayer.intensity = 0.28;
    } catch {
      this.glowLayer = null;
    }

    // Skydome panoramico dipinto: immune da fog e glowLayer per non accecare mai il cielo
    this.skyDome = MeshBuilder.CreateSphere('skyDome', { diameter: 520, segments: 48 }, scene);
    this.skyMat = new StandardMaterial('skyDomeMat', scene);
    this.skyMat.backFaceCulling = false;
    this.skyMat.disableLighting = true;
    this.skyMat.emissiveColor = new Color3(0, 0, 0);
    this.skyDome.material = this.skyMat;
    this.skyDome.isPickable = false;
    this.skyDome.infiniteDistance = true;
    this.skyDome.applyFog = false;
    this.glowLayer?.addExcludedMesh(this.skyDome);

    // Fondovalle continuo ancorato al mondo: elimina tagli quadrati e scorrimento
    this.valleyPlane = MeshBuilder.CreateGround(
      'valleyGround',
      { width: 960, height: 960, subdivisions: 2 },
      scene
    );
    this.valleyPlane.position.set(0, -5.8, 0);
    this.valleyPlane.isPickable = false;
    this.valleyPlane.receiveShadows = true;
    this.valleyMat = new StandardMaterial('valleyGroundMat', scene);
    this.valleyMat.specularColor = new Color3(0.08, 0.08, 0.08);
    this.valleyPlane.material = this.valleyMat;

    this.skyCloudMat = new StandardMaterial('skyCloudMat', scene);
    this.skyCloudMat.diffuseColor = new Color3(0.97, 0.99, 1.0);
    this.skyCloudMat.emissiveColor = new Color3(0.35, 0.42, 0.52);
    this.skyCloudMat.specularColor = new Color3(0.08, 0.08, 0.1);
    this.skyCloudMat.alpha = 0.84;

    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.0055;

    this.initParticleAtmosphere();
    this.applyBiomeAtmosphere('jungle');
  }

  public setQualityPreset(preset: QualityPreset): void {
    if (this.shadowGen) {
      this.shadowGen.dispose();
      this.shadowGen = null;
    }

    if (preset === 'medium' || preset === 'high' || preset === 'ultra') {
      const mapSize = preset === 'ultra' ? 2048 : preset === 'high' ? 1024 : 512;
      this.shadowGen = new ShadowGenerator(mapSize, this.sunLight);
      this.shadowGen.useBlurExponentialShadowMap = preset !== 'medium';
      this.shadowGen.blurKernel = preset === 'ultra' ? 16 : 8;
      // Bias calibrato per eliminare completamente le righe da shadow-acne su strada e tronchi
      this.shadowGen.bias = 0.0008;
      this.shadowGen.normalBias = 0.025;

      for (const node of this.shadowCasters) {
        this.addNodeMeshesToShadowGen(node);
      }
    }

    if (this.glowLayer) {
      this.glowLayer.intensity = preset === 'low' ? 0.15 : preset === 'medium' ? 0.24 : 0.32;
    }

    if (this.weatherParticles) {
      this.weatherParticles.emitRate =
        preset === 'low' ? 18 : preset === 'medium' ? 42 : preset === 'high' ? 75 : 120;
    }
  }

  private addNodeMeshesToShadowGen(node: TransformNode): void {
    if (!this.shadowGen || node.isDisposed()) return;
    const renderList = this.shadowGen.getShadowMap()?.renderList;
    if (renderList) {
      for (let i = renderList.length - 1; i >= 0; i--) {
        if (renderList[i]?.isDisposed()) {
          renderList.splice(i, 1);
        }
      }
    }
    for (const mesh of node.getChildMeshes(false)) {
      if (
        mesh.isDisposed() ||
        mesh.getTotalVertices() <= 0 ||
        mesh.name.includes('contact_shadow') ||
        mesh.name.includes('shield') ||
        mesh.name.includes('shockwave')
      ) {
        continue;
      }
      this.shadowGen.addShadowCaster(mesh, false);
    }
  }

  public registerShadowCaster(node: TransformNode): void {
    this.shadowCasters.add(node);
    this.addNodeMeshesToShadowGen(node);
  }

  public getMaterials(biome: BiomeId): BiomeMaterialSet {
    const cached = this.materials.get(biome);
    if (cached) return cached;

    const cfg = BIOMES[biome];
    const texPack = this.textures.getBiomeTextures(biome);
    const shared = this.textures.getSharedTextures();

    const floor = new StandardMaterial(`mat_floor_${biome}`, this.scene);
    floor.diffuseTexture = texPack.diffuse;
    floor.bumpTexture = texPack.normal;
    floor.bumpTexture.level = 0.35;
    floor.specularColor = new Color3(0.18, 0.18, 0.16);
    if (biome === 'volcano') {
      floor.emissiveColor = new Color3(0.1, 0.025, 0.0);
    } else if (biome === 'shadow') {
      floor.emissiveColor = new Color3(0.05, 0.015, 0.1);
    }

    const terrain = new StandardMaterial(`mat_terrain_${biome}`, this.scene);
    terrain.diffuseTexture = texPack.terrainDiffuse;
    terrain.bumpTexture = texPack.normal;
    terrain.bumpTexture.level = 0.45;
    terrain.diffuseColor =
      biome === 'jungle'
        ? new Color3(0.68, 0.84, 0.56)
        : biome === 'volcano'
          ? new Color3(0.75, 0.58, 0.52)
          : biome === 'sky'
            ? new Color3(0.88, 0.94, 1.0)
            : biome === 'desert'
              ? new Color3(0.95, 0.8, 0.52)
              : new Color3(0.45, 0.36, 0.65);
    terrain.specularColor = new Color3(0.06, 0.06, 0.06);
    if (biome === 'volcano') {
      terrain.emissiveColor = new Color3(0.12, 0.02, 0.0);
    }

    const wall = new StandardMaterial(`mat_wall_${biome}`, this.scene);
    wall.diffuseTexture = shared.carvedStone;
    wall.bumpTexture = texPack.normal;
    wall.bumpTexture.level = 0.4;
    wall.diffuseColor =
      biome === 'jungle'
        ? new Color3(0.95, 0.92, 0.84)
        : biome === 'volcano'
          ? new Color3(0.45, 0.3, 0.28)
          : biome === 'sky'
            ? new Color3(0.92, 0.96, 1.0)
            : biome === 'desert'
              ? new Color3(1.0, 0.84, 0.56)
              : new Color3(0.45, 0.36, 0.62);
    wall.specularColor = new Color3(0.22, 0.2, 0.18);

    const wood = new StandardMaterial(`mat_wood_${biome}`, this.scene);
    wood.diffuseTexture = shared.barkWood;
    wood.bumpTexture = texPack.normal;
    wood.bumpTexture.level = 0.55;
    wood.diffuseColor =
      biome === 'shadow' ? new Color3(0.55, 0.45, 0.65) : new Color3(0.98, 0.92, 0.84);
    wood.specularColor = new Color3(0.08, 0.06, 0.05);

    const cliff = new StandardMaterial(`mat_cliff_${biome}`, this.scene);
    cliff.diffuseTexture = biome === 'volcano' ? shared.obsHazardSurface : shared.carvedStone;
    cliff.bumpTexture = texPack.normal;
    cliff.bumpTexture.level = 0.45;
    cliff.diffuseColor = Color3.FromHexString(cfg.primaryColor).scale(0.85);
    cliff.specularColor = new Color3(0.08, 0.08, 0.08);

    const trim = new StandardMaterial(`mat_trim_${biome}`, this.scene);
    trim.diffuseTexture = shared.ancientGoldMetal;
    trim.diffuseColor =
      biome === 'sky' || biome === 'desert' || biome === 'jungle'
        ? new Color3(1.0, 0.84, 0.42)
        : new Color3(0.84, 0.56, 0.42);
    trim.specularColor = new Color3(0.75, 0.62, 0.3);

    const foliage = new StandardMaterial(`mat_foliage_${biome}`, this.scene);
    foliage.diffuseTexture = shared.foliageCanopy;
    foliage.bumpTexture = texPack.normal;
    foliage.bumpTexture.level = 0.35;
    foliage.diffuseColor =
      biome === 'jungle'
        ? new Color3(0.94, 1.0, 0.94)
        : biome === 'desert'
          ? new Color3(0.88, 0.96, 0.68)
          : Color3.FromHexString(cfg.accentHex);
    foliage.specularColor = new Color3(0.1, 0.14, 0.1);

    const accentGlow = new StandardMaterial(`mat_glow_${biome}`, this.scene);
    const acc = Color3.FromHexString(cfg.accentHex);
    accentGlow.diffuseColor = acc;
    accentGlow.emissiveColor = acc.scale(0.85);
    accentGlow.specularColor = new Color3(0.4, 0.4, 0.4);

    const waterOrLava = new StandardMaterial(`mat_liq_${biome}`, this.scene);
    const liqSrc = biome === 'volcano' ? shared.obsHazardSurface : texPack.diffuse;
    const liqTex = liqSrc.clone();
    if (liqTex) {
      liqTex.wrapU = Texture.MIRROR_ADDRESSMODE;
      liqTex.wrapV = Texture.MIRROR_ADDRESSMODE;
      liqTex.uScale = 6;
      liqTex.vScale = 6;
      waterOrLava.diffuseTexture = liqTex;
    }
    if (biome === 'volcano') {
      waterOrLava.diffuseColor = new Color3(1.0, 0.42, 0.08);
      waterOrLava.emissiveColor = new Color3(0.78, 0.22, 0.02);
    } else if (biome === 'shadow') {
      waterOrLava.diffuseColor = new Color3(0.25, 0.08, 0.52);
      waterOrLava.emissiveColor = new Color3(0.28, 0.08, 0.55);
    } else if (biome === 'sky') {
      waterOrLava.diffuseColor = new Color3(0.88, 0.95, 1.0);
      waterOrLava.emissiveColor = new Color3(0.18, 0.38, 0.62);
      waterOrLava.alpha = 0.76;
    } else {
      waterOrLava.diffuseColor = new Color3(0.16, 0.66, 0.78);
      waterOrLava.emissiveColor = new Color3(0.08, 0.26, 0.36);
      waterOrLava.alpha = 0.86;
    }

    const set: BiomeMaterialSet = {
      floor,
      terrain,
      wall,
      wood,
      trim,
      foliage,
      accentGlow,
      waterOrLava,
      cliff,
    };
    this.materials.set(biome, set);
    return set;
  }

  private buildAtmosphereProfile(biome: BiomeId): BiomeAtmosphereProfile {
    const cfg = BIOMES[biome];
    const texPack = this.textures.getBiomeTextures(biome);
    const fogColor = Color3.FromHexString(cfg.fogColor);

    const valleyColor =
      biome === 'jungle'
        ? new Color3(0.45, 0.62, 0.38)
        : biome === 'volcano'
          ? new Color3(0.85, 0.42, 0.25)
          : biome === 'sky'
            ? new Color3(0.75, 0.88, 1.0)
            : biome === 'desert'
              ? new Color3(0.9, 0.72, 0.45)
              : new Color3(0.28, 0.18, 0.45);
    const valleyEmissive =
      biome === 'volcano'
        ? new Color3(0.22, 0.04, 0.0)
        : biome === 'shadow'
          ? new Color3(0.05, 0.015, 0.1)
          : new Color3(0.02, 0.03, 0.03);

    let hemiIntensity = 0.9;
    let sunIntensity = 1.34;
    let sunDiffuse = new Color3(0.98, 1.0, 0.92);
    let hemiGround = new Color3(0.32, 0.28, 0.22);

    if (biome === 'shadow') {
      hemiIntensity = 0.72;
      sunIntensity = 1.0;
      sunDiffuse = new Color3(0.78, 0.68, 1.0);
      hemiGround = new Color3(0.16, 0.08, 0.28);
    } else if (biome === 'volcano') {
      hemiIntensity = 0.74;
      sunIntensity = 1.25;
      sunDiffuse = new Color3(1.0, 0.75, 0.52);
      hemiGround = new Color3(0.38, 0.16, 0.1);
    } else if (biome === 'sky') {
      hemiIntensity = 0.95;
      sunIntensity = 1.38;
      sunDiffuse = new Color3(1.0, 0.98, 0.92);
      hemiGround = new Color3(0.42, 0.5, 0.62);
    } else if (biome === 'desert') {
      hemiIntensity = 0.9;
      sunIntensity = 1.42;
      sunDiffuse = new Color3(1.0, 0.9, 0.74);
      hemiGround = new Color3(0.45, 0.32, 0.18);
    }

    const acc = Color3.FromHexString(cfg.accentHex);
    const particleColor1 = new Color4(acc.r, acc.g, acc.b, 0.85);
    const particleGravity =
      biome === 'volcano'
        ? new Vector3(0.5, 2.4, 0)
        : biome === 'desert'
          ? new Vector3(-4.5, -1.5, 0)
          : new Vector3(0.4, -1.1, 0);

    const sunHex =
      biome === 'volcano'
        ? '#fb923c'
        : biome === 'shadow'
          ? '#a855f7'
          : biome === 'sky'
            ? '#bae6fd'
            : '#fde68a';

    return {
      biome,
      fogColor,
      fogDensityBase: biome === 'shadow' ? 0.0065 : biome === 'desert' ? 0.006 : 0.0055,
      hemiIntensity,
      hemiGround,
      sunIntensity,
      sunDiffuse,
      valleyColor,
      valleyEmissive,
      sunDiscColor: Color3.FromHexString(sunHex),
      particleColor1,
      particleGravity,
      skyTex: texPack.sky,
      valleySourceTex: texPack.terrainDiffuse,
    };
  }

  private updateValleyTexture(sourceTex: Texture): void {
    this.valleyTex?.dispose();
    const vTex = sourceTex.clone();
    if (vTex) {
      vTex.wrapU = Texture.WRAP_ADDRESSMODE;
      vTex.wrapV = Texture.WRAP_ADDRESSMODE;
      vTex.uScale = 48;
      vTex.vScale = 48;
      vTex.uOffset = 0;
      vTex.vOffset = 0;
      this.valleyMat.diffuseTexture = vTex;
      this.valleyTex = vTex;
    }
  }

  private applyProfileToScene(profile: BiomeAtmosphereProfile, swapTextures: boolean): void {
    this.scene.fogColor = profile.fogColor.clone();
    this.scene.clearColor = new Color4(profile.fogColor.r, profile.fogColor.g, profile.fogColor.b, 1);
    this.scene.fogDensity = this.activeTempest ? 0.011 : profile.fogDensityBase;

    if (swapTextures) {
      this.skyMat.emissiveTexture = profile.skyTex;
      // IMPORTANTISSIMO: emissiveColor in Babylon.js SI SOMMA a emissiveTexture! Deve restare nero (0,0,0)!
      this.skyMat.emissiveColor = new Color3(0, 0, 0);
      this.updateValleyTexture(profile.valleySourceTex);
    }

    this.valleyMat.diffuseColor = profile.valleyColor.clone();
    this.valleyMat.emissiveColor = profile.valleyEmissive.clone();
    this.hemiLight.intensity = profile.hemiIntensity;
    this.hemiLight.groundColor = profile.hemiGround.clone();
    this.currentSunBaseIntensity = profile.sunIntensity;
    this.sunLight.intensity = profile.sunIntensity;
    this.sunLight.diffuse = profile.sunDiffuse.clone();

    if (this.weatherParticles) {
      this.weatherParticles.color1 = profile.particleColor1.clone();
      this.weatherParticles.color2 = new Color4(1, 0.95, 0.8, 0.45);
      this.weatherParticles.gravity = profile.particleGravity.clone();
    }

    if (this.sunDiscMat) {
      this.sunDiscMat.emissiveColor = profile.sunDiscColor.clone();
      this.sunDiscMat.diffuseColor = profile.sunDiscColor.clone();
    }
  }

  public applyBiomeAtmosphere(biome: BiomeId, instant: boolean = true): void {
    const target = this.buildAtmosphereProfile(biome);

    if (instant || !this.currentProfile || biome === this.currentBiome) {
      this.currentBiome = biome;
      this.currentProfile = target;
      this.transitionFrom = null;
      this.transitionTo = null;
      this.transitionActive = false;
      this.applyProfileToScene(target, true);
      return;
    }

    // Avvia una transizione fluida progressiva su 2.4 secondi senza stacchi netti
    this.transitionFrom = this.currentProfile;
    this.transitionTo = target;
    this.currentBiome = biome;
    this.transitionTimer = 0;
    this.transitionSwappedTextures = false;
    this.transitionActive = true;
  }

  public initVolumetricLight(camera: Camera): void {
    if (this.vlsPostProcess) return;
    try {
      this.sunDisc = MeshBuilder.CreateSphere(
        'vls_sun_disc',
        { diameter: 28, segments: 20 },
        this.scene
      );
      this.sunDisc.position.set(36, 74, 320);
      this.sunDisc.isPickable = false;
      this.sunDisc.applyFog = false;

      this.sunDiscMat = new StandardMaterial('vls_sun_mat', this.scene);
      this.sunDiscMat.disableLighting = true;
      this.sunDiscMat.diffuseColor = new Color3(1.0, 0.9, 0.55);
      this.sunDiscMat.emissiveColor = new Color3(1.0, 0.88, 0.52);
      this.sunDisc.material = this.sunDiscMat;
      this.glowLayer?.addExcludedMesh(this.sunDisc);

      const vls = new VolumetricLightScatteringPostProcess(
        'godRays',
        { passRatio: 0.5, postProcessRatio: 1.0 },
        camera,
        this.sunDisc,
        36,
        Texture.BILINEAR_SAMPLINGMODE,
        this.scene.getEngine(),
        false
      );
      vls.exposure = 0.16;
      vls.decay = 0.965;
      vls.weight = 0.28;
      vls.density = 0.65;
      vls.excludedMeshes.push(this.skyDome, this.valleyPlane);
      this.vlsPostProcess = vls;
      this.vlsCamera = camera;
    } catch {
      this.vlsPostProcess = null;
    }
  }

  public setTempestActive(active: boolean): void {
    this.activeTempest = active;
    if (!this.transitionActive) {
      this.scene.fogDensity = active ? 0.011 : (this.currentProfile?.fogDensityBase ?? 0.0055);
    }
    if (this.weatherParticles) {
      this.weatherParticles.emitRate = active ? 160 : 75;
    }
  }

  public update(dt: number, playerPos: Vector3, playerYaw: number = 0): void {
    this.smoothYaw = TrackMath.shortestAngleLerp(this.smoothYaw, playerYaw, Math.min(1, dt * 14));
    const fwdX = Math.sin(this.smoothYaw);
    const fwdZ = Math.cos(this.smoothYaw);
    const rightX = Math.cos(this.smoothYaw);
    const rightZ = -Math.sin(this.smoothYaw);

    if (this.weatherParticles) {
      this.weatherEmitterPos.set(playerPos.x + fwdX * 14, playerPos.y + 6, playerPos.z + fwdZ * 14);
      this.weatherParticles.emitter = this.weatherEmitterPos;
    }
    this.sunLight.position.set(
      playerPos.x + fwdX * 24 + rightX * 22,
      playerPos.y + 42,
      playerPos.z + fwdZ * 24 + rightZ * 22
    );
    if (this.sunDisc) {
      this.sunDisc.position.set(
        playerPos.x + fwdX * 320 + rightX * 36,
        74,
        playerPos.z + fwdZ * 320 + rightZ * 36
      );
    }
    const snapX = Math.round(playerPos.x / 20) * 20;
    const snapZ = Math.round(playerPos.z / 20) * 20;
    this.valleyPlane.position.set(snapX, -5.8, snapZ);

    const nowSec = performance.now() * 0.001;
    const activeMats = this.materials.get(this.currentBiome);
    const liqTex = activeMats?.waterOrLava.diffuseTexture as Texture | null;
    if (liqTex) {
      liqTex.vOffset = (liqTex.vOffset + dt * 0.38) % 1;
      liqTex.uOffset = Math.sin(nowSec * 0.8) * 0.08;
    }

    // Interpolazione continua durante la transizione fluida tra biomi
    if (this.transitionActive && this.transitionFrom && this.transitionTo) {
      this.transitionTimer += dt;
      const t = Math.min(1, this.transitionTimer / this.transitionDuration);
      const smooth = t * t * (3 - 2 * t);
      const from = this.transitionFrom;
      const to = this.transitionTo;

      Color3.LerpToRef(from.fogColor, to.fogColor, smooth, this.scene.fogColor);
      this.scene.clearColor.set(
        this.scene.fogColor.r,
        this.scene.fogColor.g,
        this.scene.fogColor.b,
        1
      );

      this.hemiLight.intensity = from.hemiIntensity + (to.hemiIntensity - from.hemiIntensity) * smooth;
      Color3.LerpToRef(from.hemiGround, to.hemiGround, smooth, this.hemiLight.groundColor);
      this.currentSunBaseIntensity =
        from.sunIntensity + (to.sunIntensity - from.sunIntensity) * smooth;
      Color3.LerpToRef(from.sunDiffuse, to.sunDiffuse, smooth, this.sunLight.diffuse);

      Color3.LerpToRef(from.valleyColor, to.valleyColor, smooth, this.valleyMat.diffuseColor);
      Color3.LerpToRef(from.valleyEmissive, to.valleyEmissive, smooth, this.valleyMat.emissiveColor);

      if (this.sunDiscMat) {
        Color3.LerpToRef(from.sunDiscColor, to.sunDiscColor, smooth, this.sunDiscMat.emissiveColor);
        this.sunDiscMat.diffuseColor.copyFrom(this.sunDiscMat.emissiveColor);
      }

      if (this.weatherParticles) {
        Color4.LerpToRef(from.particleColor1, to.particleColor1, smooth, this.tmpParticleColor);
        this.weatherParticles.color1.copyFrom(this.tmpParticleColor);
        Vector3.LerpToRef(from.particleGravity, to.particleGravity, smooth, this.tmpGravity);
        this.weatherParticles.gravity.copyFrom(this.tmpGravity);
      }

      const baseFog = this.activeTempest
        ? 0.011
        : from.fogDensityBase + (to.fogDensityBase - from.fogDensityBase) * smooth;
      const fogBell = Math.sin(t * Math.PI);
      this.scene.fogDensity = baseFog + fogBell * 0.0085;

      // Al picco della nebbia di transizione (t >= 0.45), esegui lo swap di cielo e fondovalle
      if (!this.transitionSwappedTextures && t >= 0.45) {
        this.transitionSwappedTextures = true;
        this.skyMat.emissiveTexture = to.skyTex;
        this.skyMat.emissiveColor.set(0, 0, 0);
        this.updateValleyTexture(to.valleySourceTex);
      }

      if (t >= 1) {
        this.currentProfile = to;
        this.transitionFrom = null;
        this.transitionTo = null;
        this.transitionActive = false;
        this.scene.fogDensity = this.activeTempest ? 0.011 : to.fogDensityBase;
      }
    }

    this.timeOfDay = (this.timeOfDay + dt * 0.008) % 1;
    const daylight = 0.86 + Math.sin(this.timeOfDay * Math.PI * 2) * 0.14;
    if (this.currentBiome === 'shadow') {
      this.sunLight.intensity = this.currentSunBaseIntensity;
    } else {
      const tempestScale = this.activeTempest ? 0.62 : 1.0;
      this.sunLight.intensity = this.currentSunBaseIntensity * tempestScale * daylight;
    }

    for (let i = this.animatedProps.length - 1; i >= 0; i--) {
      const p = this.animatedProps[i];
      if (p.node.isDisposed()) {
        this.animatedProps.splice(i, 1);
        continue;
      }
      if (p.kind === 'crystal') {
        p.node.rotation.y += dt * 1.3;
        p.node.position.y += Math.sin(nowSec * 2.2 + p.phase) * dt * 0.3;
      } else if (p.kind === 'torch') {
        const pulse = 0.9 + Math.sin(nowSec * 9 + p.phase) * 0.14;
        p.node.scaling.set(pulse, pulse * 1.12, pulse);
      } else if (p.kind === 'astrolabe') {
        p.node.rotation.y += dt * (p.phase >= 0 ? 0.55 : -0.75);
      } else if (p.kind === 'portal_ring') {
        p.node.rotation.z += dt * p.phase;
      }
    }
  }

  public buildSegmentEnvironment(seg: TrackSegmentData, root: TransformNode): void {
    const mats = this.getMaterials(seg.biome);
    const w = seg.type === 'narrow' ? 2.6 : TRACK_WIDTH;
    const len = seg.length;

    const pitObstacles = seg.obstacles.filter(
      (o) => o.type === 'chasm_pit' || o.type === 'broken_bridge'
    );

    if (pitObstacles.length === 0) {
      this.createFloorSlab(seg, root, mats, w, 0, len);
    } else {
      const sortedPits = [...pitObstacles].sort((a, b) => a.localZ - b.localZ);
      let cursor = 0;
      for (const pit of sortedPits) {
        const gapHalf = 1.65;
        const startGap = Math.max(cursor, pit.localZ - gapHalf);
        const endGap = Math.min(len, pit.localZ + gapHalf);
        if (startGap - cursor > 0.25) {
          this.createFloorSlab(seg, root, mats, w, cursor, startGap - cursor);
        }
        if (pit.type === 'broken_bridge') {
          const plankL = MeshBuilder.CreateBox(
            `plankL_${seg.id}`,
            { width: 0.42, height: 0.22, depth: 3.1 },
            this.scene
          );
          plankL.position.set(-w * 0.42, -0.14, pit.localZ);
          plankL.material = mats.wood;
          plankL.parent = root;
        }
        cursor = endGap;
      }
      if (len - cursor > 0.25) {
        this.createFloorSlab(seg, root, mats, w, cursor, len - cursor);
      }
    }

    // Cordoli templari scolpiti ai bordi della pista (niente tubi né luci continue accecanti)
    const railDepth =
      seg.type === 'turn_left' || seg.type === 'turn_right' || seg.type === 'fork_t'
        ? len - TRACK_WIDTH
        : len;

    if (railDepth > 1.5) {
      for (const side of [-1, 1]) {
        const curb = MeshBuilder.CreateBox(
          `curb_${seg.id}_${side}`,
          { width: 0.42, height: 0.28, depth: railDepth },
          this.scene
        );
        curb.position.set(side * (w / 2 + 0.21), 0.1, railDepth / 2);
        curb.material = mats.cliff;
        curb.parent = root;

        // Blocchi di pietra ornati + cespugli/pietre ogni 6 metri lungo i cordoli
        for (let z = 3.5; z < railDepth - 1.5; z += 6) {
          const curbCap = MeshBuilder.CreateBox(
            `curbCap_${seg.id}_${side}_${z}`,
            { width: 0.56, height: 0.42, depth: 0.65 },
            this.scene
          );
          curbCap.position.set(side * (w / 2 + 0.22), 0.22, z);
          curbCap.material = mats.wall;
          curbCap.parent = root;

          if (seg.biome === 'jungle') {
            const bush = this.createDisplacedIco(
              `bush_${seg.id}_${side}_${z}`,
              0.5,
              3,
              0.12,
              seg.id * 7 + z
            );
            bush.position.set(side * (w / 2 + 0.68), 0.24, z + 1.5);
            bush.scaling.set(1.22, 0.72, 1.3);
            bush.material = mats.foliage;
            bush.parent = root;
          } else if (seg.biome === 'volcano') {
            const lavaRock = this.createDisplacedIco(
              `c_lava_${seg.id}_${side}_${z}`,
              0.44,
              3,
              0.2,
              seg.id * 9 + z
            );
            lavaRock.position.set(side * (w / 2 + 0.68), 0.2, z + 1.5);
            lavaRock.scaling.set(1.15, 0.7, 1.15);
            lavaRock.material = mats.cliff;
            lavaRock.parent = root;
          } else if (seg.biome === 'sky') {
            const cPost = MeshBuilder.CreateCylinder(
              `c_sky_${seg.id}_${side}_${z}`,
              { height: 0.78, diameterTop: 0.24, diameterBottom: 0.34, tessellation: 12 },
              this.scene
            );
            cPost.position.set(side * (w / 2 + 0.68), 0.39, z + 1.5);
            cPost.material = mats.wall;
            cPost.parent = root;
            const orb = MeshBuilder.CreateSphere(
              `c_sky_orb_${seg.id}_${side}_${z}`,
              { diameter: 0.26, segments: 12 },
              this.scene
            );
            orb.position.set(side * (w / 2 + 0.68), 0.9, z + 1.5);
            orb.material = mats.accentGlow;
            orb.parent = root;
          } else if (seg.biome === 'desert') {
            const urn = MeshBuilder.CreateCylinder(
              `c_des_${seg.id}_${side}_${z}`,
              { height: 0.68, diameterTop: 0.38, diameterBottom: 0.26, tessellation: 12 },
              this.scene
            );
            urn.position.set(side * (w / 2 + 0.68), 0.34, z + 1.5);
            urn.material = mats.wall;
            urn.parent = root;
            const ringTrim = MeshBuilder.CreateCylinder(
              `c_des_t_${seg.id}_${side}_${z}`,
              { height: 0.1, diameter: 0.42, tessellation: 12 },
              this.scene
            );
            ringTrim.position.set(side * (w / 2 + 0.68), 0.56, z + 1.5);
            ringTrim.material = mats.trim;
            ringTrim.parent = root;
          } else {
            const shard = MeshBuilder.CreateCylinder(
              `c_shd_${seg.id}_${side}_${z}`,
              { height: 0.85, diameterTop: 0.04, diameterBottom: 0.32, tessellation: 6 },
              this.scene
            );
            shard.position.set(side * (w / 2 + 0.68), 0.38, z + 1.5);
            shard.rotation.z = side * -0.22;
            shard.material = mats.accentGlow;
            shard.parent = root;
          }
        }
      }

      if (seg.type === 'tunnel') {
        for (let z = 4; z < railDepth - 2; z += 6) {
          this.buildMonumentalArch(`tun_${seg.id}_${z}`, z, w, root, mats, false);
        }
      }
    }

    // Sponde laterali di terreno solido e scarpata rocciosa: impediscono a qualsiasi albero o rovina di fluttuare!
    if (seg.type !== 'bridge' && seg.type !== 'elevated') {
      const bankWidth = 13.5;
      for (const side of [-1, 1]) {
        const isTurnOpeningSide =
          (seg.type === 'turn_left' && side === -1) ||
          (seg.type === 'turn_right' && side === 1) ||
          seg.type === 'fork_t';
        const bankDepth = isTurnOpeningSide ? Math.max(0, railDepth - 0.5) : len;
        if (bankDepth <= 1.0) continue;

        const bankX = side * (w / 2 + bankWidth / 2 + 0.15);
        const bankCenterZ = bankDepth / 2;

        const topUV = ProceduralTextures.buildBoxFaceUV(bankWidth, 0.52, bankDepth, 7.2);
        const bankTop = MeshBuilder.CreateBox(
          `bankTop_${seg.id}_${side}`,
          { width: bankWidth, height: 0.52, depth: bankDepth, faceUV: topUV, wrap: true },
          this.scene
        );
        bankTop.position.set(bankX, -0.34, bankCenterZ);
        bankTop.material = mats.terrain;
        bankTop.receiveShadows = true;
        bankTop.parent = root;

        const cliffUV = ProceduralTextures.buildBoxFaceUV(bankWidth + 0.4, 5.4, bankDepth, 3.6);
        const bankCliff = MeshBuilder.CreateBox(
          `bankCliff_${seg.id}_${side}`,
          { width: bankWidth + 0.4, height: 5.4, depth: bankDepth, faceUV: cliffUV, wrap: true },
          this.scene
        );
        bankCliff.position.set(bankX + side * 0.2, -3.3, bankCenterZ);
        bankCliff.material = mats.cliff;
        bankCliff.receiveShadows = true;
        bankCliff.parent = root;

        // Massi e rilievi naturali lungo il bordo della sponda per nascondere gli spigoli geometrici
        for (let z = 2.5; z < bankDepth - 1.5; z += 5.5) {
          const rock = this.createDisplacedIco(
            `bankRock_${seg.id}_${side}_${z.toFixed(1)}`,
            0.95 + ((Math.floor(z) + seg.id) % 3) * 0.25,
            3,
            0.16,
            seg.id * 11 + z + side
          );
          rock.position.set(side * (w / 2 + 1.55 + ((Math.floor(z) % 2) * 0.5)), -0.05, z);
          rock.scaling.set(1.35, 0.58, 1.45);
          rock.material = mats.cliff;
          rock.receiveShadows = true;
          rock.parent = root;
        }
      }
    }

    if (seg.type === 'bridge') {
      const under = MeshBuilder.CreateBox(
        `under_${seg.id}`,
        { width: 42, height: 0.5, depth: len + 8 },
        this.scene
      );
      under.position.set(0, -6.5, len / 2);
      under.material = mats.waterOrLava;
      under.parent = root;

      for (const side of [-1, 1]) {
        const cascade = MeshBuilder.CreateCylinder(
          `cascade_${seg.id}_${side}`,
          { height: 6.4, diameterTop: 2.4, diameterBottom: 2.8, tessellation: 14 },
          this.scene
        );
        cascade.position.set(side * 11.5, -3.2, len * 0.5);
        cascade.scaling.set(0.35, 1, 1.35);
        cascade.material = mats.waterOrLava;
        cascade.parent = root;

        for (let z = 3; z < len - 2; z += 6) {
          const post = MeshBuilder.CreateCylinder(
            `post_${seg.id}_${side}_${z}`,
            { height: 1.35, diameterTop: 0.28, diameterBottom: 0.42, tessellation: 18 },
            this.scene
          );
          post.position.set(side * (w / 2 + 0.28), 0.68, z);
          post.material = mats.wood;
          post.parent = root;

          const brazier = MeshBuilder.CreateCylinder(
            `brazier_${seg.id}_${side}_${z}`,
            { height: 0.22, diameterTop: 0.5, diameterBottom: 0.2, tessellation: 16 },
            this.scene
          );
          brazier.position.set(side * (w / 2 + 0.28), 1.38, z);
          brazier.material = mats.trim;
          brazier.parent = root;

          const lantern = MeshBuilder.CreateSphere(
            `lantern_${seg.id}_${side}_${z}`,
            { diameter: 0.3, segments: 14 },
            this.scene
          );
          lantern.position.set(side * (w / 2 + 0.28), 1.56, z);
          lantern.material = mats.accentGlow;
          lantern.parent = root;
          this.animatedProps.push({ node: lantern, kind: 'torch', phase: z + seg.id });
        }
      }
    }

    // Vero Portale Templare con architrave alta (y = 4.65m) per curve e bivi: visuale sempre sgombra!
    if (seg.type === 'turn_left' || seg.type === 'turn_right' || seg.type === 'fork_t') {
      const signZ = Math.max(4, len - TRACK_WIDTH / 2 - 2.4);
      this.buildMonumentalArch(`turn_gate_${seg.id}`, signZ, TRACK_WIDTH, root, mats, true);
    }

    // Portale Dimensionale al confine di cambio bioma
    if (seg.isBiomeTransition) {
      this.buildBiomeTransitionPortal(seg, root, mats, w);
    }

    this.buildBiomeScenery(seg, root, mats);

    // Ottimizzazione picking e matrici statiche: congela world matrix e bounding info sulle mesh statiche
    root.computeWorldMatrix(true);
    const animatedNodes = new Set(this.animatedProps.map((p) => p.node));
    for (const m of root.getChildMeshes()) {
      m.isPickable = false;
      m.doNotSyncBoundingInfo = true;
      let isAnimated = false;
      let cur = m.parent;
      if (animatedNodes.has(m)) {
        isAnimated = true;
      } else {
        while (cur && cur !== root) {
          if (animatedNodes.has(cur as TransformNode)) {
            isAnimated = true;
            break;
          }
          cur = cur.parent;
        }
      }
      if (!isAnimated) {
        m.freezeWorldMatrix();
      }
    }
  }

  /**
   * Portale Dimensionale 3D sul segmento di cambio bioma:
   * - Soglia dorata a filo strada, due obelischi runici esterni ai cordoli (|x| > 3.0m)
   * - Due anelli concentrici controrotanti incassati ai lati della pista
   * - Velo energetico attraversabile semitrasparente
   */
  private buildBiomeTransitionPortal(
    seg: TrackSegmentData,
    root: TransformNode,
    mats: BiomeMaterialSet,
    trackWidth: number
  ): void {
    const portalZ = 2.6;
    const pillarX = trackWidth / 2 + 0.85;

    // Soglia lastricata dorata a terra che raccorda i due biomi
    const threshold = MeshBuilder.CreateBox(
      `portal_thresh_${seg.id}`,
      { width: trackWidth, height: 0.05, depth: 1.4 },
      this.scene
    );
    threshold.position.set(0, 0.02, 1.2);
    threshold.material = mats.trim;
    threshold.parent = root;

    // Due obelischi runici laterali esterni alla carreggiata (|x| = 3.85m > 3.0m)
    for (const side of [-1, 1]) {
      const plinth = MeshBuilder.CreateBox(
        `portal_plinth_${seg.id}_${side}`,
        { width: 1.15, height: 0.6, depth: 1.15 },
        this.scene
      );
      plinth.position.set(side * pillarX, 0.3, portalZ);
      plinth.material = mats.cliff;
      plinth.parent = root;

      const obelisk = MeshBuilder.CreateCylinder(
        `portal_ob_${seg.id}_${side}`,
        { height: 4.8, diameterTop: 0.42, diameterBottom: 0.88, tessellation: 6 },
        this.scene
      );
      obelisk.position.set(side * pillarX, 2.9, portalZ);
      obelisk.material = mats.wall;
      obelisk.parent = root;

      const capGlow = MeshBuilder.CreatePolyhedron(
        `portal_gem_${seg.id}_${side}`,
        { type: 1, size: 0.5 },
        this.scene
      );
      capGlow.position.set(side * pillarX, 5.55, portalZ);
      capGlow.material = mats.accentGlow;
      capGlow.parent = root;
      this.animatedProps.push({ node: capGlow, kind: 'crystal', phase: seg.id + side });
    }

    // Due anelli portale concentrici controrotanti sul piano XY (perpendicolari alla corsa lungo Z)
    const portalCenter = new TransformNode(`portal_center_${seg.id}`, this.scene);
    portalCenter.position.set(0, 1.75, portalZ);
    portalCenter.parent = root;

    const ringSpecs = [
      { name: 'outer', diameter: 7.8, thickness: 0.24, speed: 0.9, mat: mats.trim },
      { name: 'inner', diameter: 7.0, thickness: 0.18, speed: -1.25, mat: mats.accentGlow },
    ];
    for (const spec of ringSpecs) {
      const spinner = new TransformNode(`portal_spin_${spec.name}_${seg.id}`, this.scene);
      spinner.parent = portalCenter;
      const torus = MeshBuilder.CreateTorus(
        `portal_ring_${spec.name}_${seg.id}`,
        { diameter: spec.diameter, thickness: spec.thickness, tessellation: 32 },
        this.scene
      );
      torus.rotation.x = Math.PI / 2; // Orientato verticalmente nel piano XY frontale
      torus.material = spec.mat;
      torus.parent = spinner;
      this.animatedProps.push({ node: spinner, kind: 'portal_ring', phase: spec.speed });
    }

    // Velo energetico semitrasparente attraversabile al centro del portale
    const veil = MeshBuilder.CreateCylinder(
      `portal_veil_${seg.id}`,
      { height: 0.04, diameter: 5.9, tessellation: 32 },
      this.scene
    );
    veil.rotation.x = Math.PI / 2;
    veil.position.set(0, 2.55, portalZ);
    veil.material = mats.accentGlow;
    veil.visibility = 0.22;
    veil.parent = root;
  }

  /**
   * Portale Templare monumentale composto da due colonne scanalate con capitello e architrave alta (y = 4.65m).
   * Non ostruisce mai la telecamera di gioco (posta a y ~ 3.6m) né crea torus sdraiati in pista.
   */
  private buildMonumentalArch(
    id: string,
    z: number,
    width: number,
    root: TransformNode,
    mats: BiomeMaterialSet,
    isTurnGate: boolean
  ): void {
    const pillarX = width / 2 + 0.65;
    for (const side of [-1, 1]) {
      const plinth = MeshBuilder.CreateBox(
        `${id}_pl_${side}`,
        { width: 1.05, height: 0.6, depth: 1.05 },
        this.scene
      );
      plinth.position.set(side * pillarX, 0.3, z);
      plinth.material = mats.cliff;
      plinth.parent = root;

      const shaft = MeshBuilder.CreateCylinder(
        `${id}_sh_${side}`,
        { height: 4.1, diameterTop: 0.68, diameterBottom: 0.84, tessellation: 20 },
        this.scene
      );
      shaft.position.set(side * pillarX, 2.55, z);
      shaft.material = mats.wall;
      shaft.parent = root;

      const cap = MeshBuilder.CreateBox(
        `${id}_cp_${side}`,
        { width: 1.02, height: 0.38, depth: 1.02 },
        this.scene
      );
      cap.position.set(side * pillarX, 4.65, z);
      cap.material = mats.trim;
      cap.parent = root;

      if (isTurnGate) {
        const torch = MeshBuilder.CreateSphere(
          `${id}_tr_${side}`,
          { diameter: 0.42, segments: 14 },
          this.scene
        );
        torch.scaling.set(0.78, 1.45, 0.78);
        torch.position.set(side * pillarX, 5.15, z);
        torch.material = mats.accentGlow;
        torch.parent = root;
      }
    }

    const lintel = MeshBuilder.CreateBox(
      `${id}_lin`,
      { width: width + 2.5, height: 0.72, depth: 0.95 },
      this.scene
    );
    lintel.position.set(0, 5.15, z);
    lintel.material = mats.wall;
    lintel.parent = root;

    const frieze = MeshBuilder.CreateBox(
      `${id}_frz`,
      { width: width + 2.8, height: 0.26, depth: 1.08 },
      this.scene
    );
    frieze.position.set(0, 5.6, z);
    frieze.material = mats.trim;
    frieze.parent = root;

    const keystone = MeshBuilder.CreateSphere(
      `${id}_key`,
      { diameter: isTurnGate ? 0.72 : 0.52, segments: 18 },
      this.scene
    );
    keystone.scaling.set(1, 1, 0.55);
    keystone.position.set(0, 5.15, z - 0.52);
    keystone.material = mats.accentGlow;
    keystone.parent = root;

    const keystoneRing = MeshBuilder.CreateTorus(
      `${id}_key_ring`,
      { diameter: isTurnGate ? 0.88 : 0.64, thickness: 0.085, tessellation: 24 },
      this.scene
    );
    keystoneRing.rotation.x = Math.PI / 2;
    keystoneRing.position.set(0, 5.15, z - 0.52);
    keystoneRing.material = mats.trim;
    keystoneRing.parent = root;
  }

  private createFloorSlab(
    seg: TrackSegmentData,
    root: TransformNode,
    mats: BiomeMaterialSet,
    width: number,
    startZ: number,
    depth: number
  ): void {
    const tileScale = 3.1;
    const uRepeat = width / tileScale;
    const vRepeat = depth / tileScale;
    const faceUV = [
      new Vector4(0, 0, uRepeat, 0.25),
      new Vector4(0, 0, uRepeat, 0.25),
      new Vector4(0, 0, vRepeat, 0.25),
      new Vector4(0, 0, vRepeat, 0.25),
      new Vector4(0, 0, uRepeat, vRepeat),
      new Vector4(0, 0, 1, 1),
    ];

    const floor = MeshBuilder.CreateBox(
      `floor_${seg.id}_${startZ.toFixed(1)}`,
      { width, height: 0.5, depth, faceUV, wrap: true },
      this.scene
    );
    floor.position.set(0, -0.25, startZ + depth / 2);
    floor.material = mats.floor;
    floor.receiveShadows = true;
    floor.parent = root;

    if (seg.type !== 'bridge') {
      const foundation = MeshBuilder.CreateCylinder(
        `found_${seg.id}_${startZ.toFixed(1)}`,
        { height: 5.5, diameterTop: width + 0.9, diameterBottom: width * 0.45, tessellation: 8 },
        this.scene
      );
      foundation.position.set(0, -3.2, startZ + depth / 2);
      foundation.scaling.set(1.0, 1.0, depth / (width + 0.9));
      foundation.material = mats.cliff;
      foundation.parent = root;
    }
  }

  private createTerrainIslandUnderProp(
    id: string,
    x: number,
    z: number,
    root: TransformNode,
    mats: BiomeMaterialSet
  ): void {
    const mound = this.createDisplacedIco(`${id}_mound`, 1.85, 3, 0.14, Math.abs(Math.round(x * 7 + z)));
    mound.position.set(x, -0.32, z);
    mound.scaling.set(1.25, 0.42, 1.25);
    mound.material = mats.terrain;
    mound.receiveShadows = true;
    mound.parent = root;

    const pillar = MeshBuilder.CreateCylinder(
      `${id}_ispil`,
      { height: 6.4, diameterTop: 3.3, diameterBottom: 2.0, tessellation: 12 },
      this.scene
    );
    pillar.position.set(x, -3.55, z);
    pillar.material = mats.cliff;
    pillar.receiveShadows = true;
    pillar.parent = root;
  }

  private buildBiomeScenery(
    seg: TrackSegmentData,
    root: TransformNode,
    mats: BiomeMaterialSet
  ): void {
    const w = seg.type === 'narrow' ? 2.6 : TRACK_WIDTH;
    const isTurnSeg = seg.type === 'turn_left' || seg.type === 'turn_right' || seg.type === 'fork_t';
    const maxSafeZ = isTurnSeg ? Math.max(8, seg.length - TRACK_WIDTH - 2.0) : seg.length - 4.0;
    const count = 3;
    const needsIsland = seg.type === 'bridge' || seg.type === 'elevated';

    for (let i = 0; i < count; i++) {
      const z = Math.min(maxSafeZ, 4.5 + (i * Math.max(6, maxSafeZ - 4.5)) / count);
      const side = i % 2 === 0 ? -1 : 1;
      const xOffset = side * (w / 2 + 3.6 + (i % 2) * 1.9);

      // Colonne braciere compatte a lato pista (o Idolo 3D .glb su piedistallo scolpito)
      const pillar = MeshBuilder.CreateCylinder(
        `pil_${seg.id}_${i}`,
        { height: 2.0, diameterTop: 0.44, diameterBottom: 0.66, tessellation: 20 },
        this.scene
      );
      pillar.position.set(side * (w / 2 + 0.85), 1.0, z);
      pillar.material = mats.wall;
      pillar.parent = root;

      if (i === 1 && this.modelLoader?.isReady('temple_idol')) {
        const idol = this.modelLoader.instantiate('temple_idol', `idol_${seg.id}_${i}`, root);
        if (idol) {
          idol.position.set(-side * (w / 2 + 1.05), 0.0, z);
          idol.scaling.setAll(0.95);
          idol.rotation.y = side > 0 ? -Math.PI * 0.35 : Math.PI * 0.35;
        }
      }

      const flame = MeshBuilder.CreateSphere(
        `flame_${seg.id}_${i}`,
        { diameter: 0.34, segments: 14 },
        this.scene
      );
      flame.scaling.set(0.75, 1.45, 0.75);
      flame.position.set(side * (w / 2 + 0.85), 2.2, z);
      flame.material = mats.accentGlow;
      flame.parent = root;
      this.animatedProps.push({ node: flame, kind: 'torch', phase: i + seg.id });

      if (needsIsland) {
        this.createTerrainIslandUnderProp(`isl_${seg.id}_${i}`, xOffset, z, root, mats);
      }

      if (seg.biome === 'jungle') {
        this.createOrganicJungleTree(seg.id, i, side, xOffset, z, root, mats);

        if (i === 1 && this.modelLoader?.isReady('crystal_cluster')) {
          const cluster = this.modelLoader.instantiate('crystal_cluster', `jcl_${seg.id}_${i}`, root);
          if (cluster) {
            cluster.position.set(-side * (w / 2 + 1.9), -0.05, z + 2.2);
            cluster.scaling.setAll(0.85);
          }
        }

        if (i === 1 && seg.type === 'straight' && seg.id % 2 === 0) {
          this.buildMonumentalArch(`jgate_${seg.id}`, z, TRACK_WIDTH, root, mats, false);
        }
      } else if (seg.biome === 'volcano') {
        const spire = MeshBuilder.CreateCylinder(
          `spire_${seg.id}_${i}`,
          { height: 8.8, diameterTop: 0.25, diameterBottom: 3.4, tessellation: 10 },
          this.scene
        );
        spire.position.set(xOffset, 3.1, z);
        spire.rotation.z = side * 0.14;
        spire.material = mats.cliff;
        spire.parent = root;

        const magmaCore = MeshBuilder.CreatePolyhedron(
          `magmaOrb_${seg.id}_${i}`,
          { type: 1, size: 0.85 },
          this.scene
        );
        magmaCore.position.set(xOffset * 0.9, 4.5, z);
        magmaCore.material = mats.accentGlow;
        magmaCore.parent = root;
        this.animatedProps.push({ node: magmaCore, kind: 'crystal', phase: i + seg.id });
      } else if (seg.biome === 'sky') {
        const cloudPuffs: Mesh[] = [];
        for (let b = 0; b < 5; b++) {
          const rad = b === 2 ? 1.55 : b === 1 || b === 3 ? 1.25 : 0.95;
          const puff = this.createDisplacedIco(
            `puff_${seg.id}_${i}_${b}`,
            rad,
            3,
            0.08,
            b + seg.id
          );
          puff.position.set((b - 2) * 0.95, b === 2 ? 0.35 : (b % 2) * 0.22, (b % 2 === 0 ? 1 : -1) * 0.25);
          puff.scaling.set(1.25, 0.58, 1.1);
          puff.computeWorldMatrix(true);
          cloudPuffs.push(puff);
        }
        const mergedCloud = Mesh.MergeMeshes(cloudPuffs, true, true);
        if (mergedCloud) {
          mergedCloud.name = `cloud_${seg.id}_${i}`;
          mergedCloud.position.set(xOffset, -1.2, z);
          mergedCloud.material = this.skyCloudMat;
          mergedCloud.parent = root;
        }

        if (this.modelLoader?.isReady('celestial_spire')) {
          const spire = this.modelLoader.instantiate(
            'celestial_spire',
            `skySpire_${seg.id}_${i}`,
            root
          );
          if (spire) {
            spire.position.set(xOffset, -0.05, z);
            spire.scaling.setAll(1.15);
          }
        } else {
          this.createCelestialPavilion(seg.id, i, xOffset, z, root, mats);
        }

        if (i === 1) {
          const pavX = -side * (w / 2 + 5.2);
          if (needsIsland) {
            this.createTerrainIslandUnderProp(`pav_isl_${seg.id}_${i}`, pavX, z, root, mats);
          }
          this.createCelestialPavilion(seg.id, i + 10, pavX, z, root, mats);
        }

        if (i === 1 && seg.type === 'straight') {
          const astroOuter = new TransformNode(`astro_out_${seg.id}`, this.scene);
          astroOuter.position.set(0, 6.8, z);
          astroOuter.parent = root;
          const ringOuter = MeshBuilder.CreateTorus(
            `astro_ro_${seg.id}`,
            { diameter: 7.4, thickness: 0.24, tessellation: 28 },
            this.scene
          );
          ringOuter.rotation.x = Math.PI / 2;
          ringOuter.material = mats.trim;
          ringOuter.parent = astroOuter;
          this.animatedProps.push({ node: astroOuter, kind: 'astrolabe', phase: seg.id });

          const astroInner = new TransformNode(`astro_in_${seg.id}`, this.scene);
          astroInner.position.set(0, 6.8, z);
          astroInner.parent = root;
          const ringInner = MeshBuilder.CreateTorus(
            `astro_ri_${seg.id}`,
            { diameter: 6.1, thickness: 0.16, tessellation: 28 },
            this.scene
          );
          ringInner.rotation.x = Math.PI / 2;
          ringInner.material = mats.accentGlow;
          ringInner.parent = astroInner;
          this.animatedProps.push({ node: astroInner, kind: 'astrolabe', phase: -seg.id });
        }
      } else if (seg.biome === 'desert') {
        const pyrX = side * (w / 2 + 9.2);
        if (needsIsland) {
          this.createTerrainIslandUnderProp(`pyr_isl_${seg.id}_${i}`, pyrX, z, root, mats);
        }
        // Basamento a gradoni + piramide + portale templare alla base + pyramidion dorato
        const pyrStep = MeshBuilder.CreateCylinder(
          `pyr_step_${seg.id}_${i}`,
          { height: 2.2, diameterTop: 8.6, diameterBottom: 10.6, tessellation: 4 },
          this.scene
        );
        pyrStep.position.set(pyrX, 0.2, z);
        pyrStep.rotation.y = Math.PI / 4;
        pyrStep.material = mats.cliff;
        pyrStep.parent = root;

        const pyr = MeshBuilder.CreateCylinder(
          `pyr_${seg.id}_${i}`,
          { height: 9.2, diameterTop: 0.4, diameterBottom: 8.8, tessellation: 4 },
          this.scene
        );
        pyr.position.set(pyrX, 3.6, z);
        pyr.rotation.y = Math.PI / 4;
        pyr.material = mats.wall;
        pyr.parent = root;

        const cap = MeshBuilder.CreateCylinder(
          `pyrcap_${seg.id}_${i}`,
          { height: 2.1, diameterTop: 0.05, diameterBottom: 2.1, tessellation: 4 },
          this.scene
        );
        cap.position.set(pyrX, 7.6, z);
        cap.rotation.y = Math.PI / 4;
        cap.material = mats.trim;
        cap.parent = root;

        // Portale templare scolpito alla base della piramide rivolto verso la pista
        const gateX = pyrX - side * 4.2;
        const gateFrame = MeshBuilder.CreateBox(
          `pyrgate_${seg.id}_${i}`,
          { width: 0.85, height: 2.4, depth: 2.6 },
          this.scene
        );
        gateFrame.position.set(gateX, 1.1, z);
        gateFrame.material = mats.trim;
        gateFrame.parent = root;

        const palmX = -side * (w / 2 + 3.4);
        if (needsIsland) {
          this.createTerrainIslandUnderProp(`palm_isl_${seg.id}_${i}`, palmX, z, root, mats);
        }
        this.createDesertPalmTree(seg.id, i + 10, -side, palmX, z, root, mats);

        if (i === 1 && this.modelLoader?.isReady('desert_obelisk')) {
          const obelisk = this.modelLoader.instantiate(
            'desert_obelisk',
            `desOb_${seg.id}_${i}`,
            root
          );
          if (obelisk) {
            const obX = -side * (w / 2 + 5.6);
            obelisk.position.set(obX, -0.05, z + 2.2);
            obelisk.scaling.setAll(1.1);
            obelisk.rotation.y = side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
          }
        }
      } else {
        // Regno delle Ombre: Monoliti .glb / Obelischi, Alberi abissali con cristalli e portali gotici
        if (this.modelLoader?.isReady('shadow_monolith')) {
          const mono = this.modelLoader.instantiate(
            'shadow_monolith',
            `shMono_${seg.id}_${i}`,
            root
          );
          if (mono) {
            mono.position.set(xOffset, -0.05, z);
            mono.scaling.setAll(1.18);
          }
        } else {
          const obelisk = MeshBuilder.CreateCylinder(
            `darkPil_${seg.id}_${i}`,
            { height: 7.6, diameterTop: 0.35, diameterBottom: 1.5, tessellation: 6 },
            this.scene
          );
          obelisk.position.set(xOffset, 3.0, z);
          obelisk.material = mats.wall;
          obelisk.parent = root;

          const runeOrb = MeshBuilder.CreatePolyhedron(
            `shadowCrystal_${seg.id}_${i}`,
            { type: 1, size: 0.8 },
            this.scene
          );
          runeOrb.position.set(xOffset, 7.2, z);
          runeOrb.material = mats.accentGlow;
          runeOrb.parent = root;
          this.animatedProps.push({ node: runeOrb, kind: 'crystal', phase: i * 1.2 + seg.id });
        }

        const streeX = -side * (w / 2 + 3.8);
        if (needsIsland) {
          this.createTerrainIslandUnderProp(`stree_isl_${seg.id}_${i}`, streeX, z, root, mats);
        }
        this.createShadowCrystalTree(seg.id, i, -side, streeX, z, root, mats);

        if (i === 1 && seg.type === 'straight' && seg.id % 2 === 0) {
          this.buildMonumentalArch(`sgate_${seg.id}`, z, TRACK_WIDTH, root, mats, false);
        }
      }
    }
  }

  /**
   * Edicola / Padiglione Celeste a 4 colonne marmoree, cupola dorata e cristallo d'etere sospeso.
   */
  private createCelestialPavilion(
    segId: number,
    idx: number,
    xOffset: number,
    z: number,
    root: TransformNode,
    mats: BiomeMaterialSet
  ): void {
    const pav = new TransformNode(`pav_${segId}_${idx}`, this.scene);
    pav.position.set(xOffset, 0, z);
    pav.parent = root;

    const base = MeshBuilder.CreateBox(
      `pav_base_${segId}_${idx}`,
      { width: 3.1, height: 0.42, depth: 3.1 },
      this.scene
    );
    base.position.y = 0.21;
    base.material = mats.wall;
    base.parent = pav;

    const colDist = 1.05;
    for (const cx of [-colDist, colDist]) {
      for (const cz of [-colDist, colDist]) {
        const col = MeshBuilder.CreateCylinder(
          `pav_col_${segId}_${idx}_${cx}_${cz}`,
          { height: 3.6, diameterTop: 0.3, diameterBottom: 0.36, tessellation: 14 },
          this.scene
        );
        col.position.set(cx, 2.2, cz);
        col.material = mats.wall;
        col.parent = pav;
      }
    }

    const roof = MeshBuilder.CreateCylinder(
      `pav_roof_${segId}_${idx}`,
      { height: 1.5, diameterTop: 0.15, diameterBottom: 3.5, tessellation: 8 },
      this.scene
    );
    roof.position.y = 4.75;
    roof.material = mats.trim;
    roof.parent = pav;

    const crystal = MeshBuilder.CreatePolyhedron(
      `pav_gem_${segId}_${idx}`,
      { type: 1, size: 0.58 },
      this.scene
    );
    crystal.position.y = 2.35;
    crystal.material = mats.accentGlow;
    crystal.parent = pav;
    this.animatedProps.push({ node: crystal, kind: 'crystal', phase: idx + segId * 0.7 });
  }

  /**
   * Palma del Deserto Perduto ancorata su tumulo di sabbia, tronco anellato curvo,
   * 6 fronde arcuate a raggiera e datteri dorati.
   */
  private createDesertPalmTree(
    segId: number,
    idx: number,
    side: number,
    xOffset: number,
    z: number,
    root: TransformNode,
    mats: BiomeMaterialSet
  ): void {
    const palm = new TransformNode(`palm_${segId}_${idx}`, this.scene);
    palm.position.set(xOffset, 0, z);
    palm.parent = root;

    const duneMound = this.createDisplacedIco(
      `dmound_${segId}_${idx}`,
      1.6,
      3,
      0.12,
      segId * 19 + idx
    );
    duneMound.position.set(0, -0.22, 0);
    duneMound.scaling.set(1.35, 0.38, 1.35);
    duneMound.material = mats.terrain;
    duneMound.receiveShadows = true;
    duneMound.parent = palm;

    const bend = side * 0.78;
    const trunkPath = [
      new Vector3(0, -0.55, 0),
      new Vector3(bend * 0.25, 1.4, 0.12),
      new Vector3(bend * 0.55, 3.2, -0.06),
      new Vector3(bend * 0.8, 5.1, 0.08),
      new Vector3(bend * 0.86, 6.2, 0),
    ];
    const trunk = MeshBuilder.CreateTube(
      `ptrunk_${segId}_${idx}`,
      {
        path: trunkPath,
        tessellation: 14,
        radiusFunction: (k) => 0.42 - (k / (trunkPath.length - 1)) * 0.2,
        cap: Mesh.CAP_END,
      },
      this.scene
    );
    trunk.material = mats.wood;
    trunk.parent = palm;

    // 6 fronde arcuate a raggiera unite in un'unica mesh fogliame + grappolo di datteri dorati
    const crownBase = new Vector3(bend * 0.86, 6.15, 0);
    const frondParts: Mesh[] = [];
    for (let f = 0; f < 6; f++) {
      const ang = (f / 6) * Math.PI * 2 + (idx % 3) * 0.3;
      const dx = Math.cos(ang);
      const dz = Math.sin(ang);
      const frond = MeshBuilder.CreateTube(
        `frond_${segId}_${idx}_${f}`,
        {
          path: [
            crownBase,
            new Vector3(crownBase.x + dx * 1.15, crownBase.y + 0.65, crownBase.z + dz * 1.15),
            new Vector3(crownBase.x + dx * 2.15, crownBase.y - 0.15, crownBase.z + dz * 2.15),
            new Vector3(crownBase.x + dx * 2.65, crownBase.y - 0.95, crownBase.z + dz * 2.65),
          ],
          tessellation: 8,
          radiusFunction: (k) => (k === 1 ? 0.36 : k === 2 ? 0.26 : 0.1),
          cap: Mesh.CAP_ALL,
        },
        this.scene
      );
      frond.computeWorldMatrix(true);
      frondParts.push(frond);
    }
    const mergedFronds = Mesh.MergeMeshes(frondParts, true, true);
    if (mergedFronds) {
      mergedFronds.name = `palm_fronds_${segId}_${idx}`;
      mergedFronds.material = mats.foliage;
      mergedFronds.receiveShadows = true;
      mergedFronds.parent = palm;
    }

    const dates = MeshBuilder.CreateSphere(
      `dates_${segId}_${idx}`,
      { diameter: 0.48, segments: 10 },
      this.scene
    );
    dates.position.set(crownBase.x, crownBase.y - 0.35, crownBase.z);
    dates.material = mats.trim;
    dates.parent = palm;

    this.animatedProps.push({ node: palm, kind: 'tree', phase: idx * 1.1 + segId });
  }

  /**
   * Albero abissale contorto del Regno delle Ombre con radici nodose in legno oscuro
   * e cristalli viola bioluminescenti incastonati tra rami e radici.
   */
  private createShadowCrystalTree(
    segId: number,
    idx: number,
    side: number,
    xOffset: number,
    z: number,
    root: TransformNode,
    mats: BiomeMaterialSet
  ): void {
    const stNode = new TransformNode(`stree_${segId}_${idx}`, this.scene);
    stNode.position.set(xOffset, 0, z);
    stNode.parent = root;

    const baseMound = this.createDisplacedIco(
      `smound_${segId}_${idx}`,
      1.45,
      3,
      0.16,
      segId * 23 + idx
    );
    baseMound.position.set(0, -0.24, 0);
    baseMound.scaling.set(1.25, 0.36, 1.25);
    baseMound.material = mats.terrain;
    baseMound.parent = stNode;

    const bend = side * 0.55;
    const trunkPath = [
      new Vector3(0, -0.6, 0),
      new Vector3(bend * 0.2, 1.2, -0.14),
      new Vector3(-bend * 0.15, 2.9, 0.18),
      new Vector3(bend * 0.45, 4.6, -0.05),
      new Vector3(bend * 0.35, 5.8, 0.1),
    ];
    const trunk = MeshBuilder.CreateTube(
      `strunk_${segId}_${idx}`,
      {
        path: trunkPath,
        tessellation: 14,
        radiusFunction: (k) => Math.max(0.14, 0.54 - k * 0.1),
        cap: Mesh.CAP_END,
      },
      this.scene
    );
    trunk.computeWorldMatrix(true);

    const woodParts: Mesh[] = [trunk];
    const crystalParts: Mesh[] = [];
    for (let c = 0; c < 4; c++) {
      const ang = (c / 4) * Math.PI * 2 + 0.4;
      const dx = Math.cos(ang);
      const dz = Math.sin(ang);
      const branch = MeshBuilder.CreateTube(
        `sbranch_${segId}_${idx}_${c}`,
        {
          path: [
            new Vector3(bend * 0.28, 3.6 + (c % 2) * 0.5, 0),
            new Vector3(bend * 0.28 + dx * 1.35, 4.8 + (c % 2) * 0.5, dz * 1.35),
          ],
          tessellation: 8,
          radiusFunction: (k) => 0.16 - k * 0.08,
          cap: Mesh.CAP_END,
        },
        this.scene
      );
      branch.computeWorldMatrix(true);
      woodParts.push(branch);

      const crystal = MeshBuilder.CreateCylinder(
        `scrys_${segId}_${idx}_${c}`,
        { height: 1.05, diameterTop: 0.04, diameterBottom: 0.36, tessellation: 6 },
        this.scene
      );
      const isRootCrystal = c < 2;
      crystal.position.set(
        isRootCrystal ? dx * 0.85 : bend * 0.28 + dx * 1.25,
        isRootCrystal ? 0.35 : 5.0,
        isRootCrystal ? dz * 0.85 : dz * 1.25
      );
      crystal.rotation.z = -dx * 0.38;
      crystal.rotation.x = dz * 0.38;
      crystal.computeWorldMatrix(true);
      crystalParts.push(crystal);
    }

    const mergedWood = Mesh.MergeMeshes(woodParts, true, true);
    if (mergedWood) {
      mergedWood.name = `stree_wood_${segId}_${idx}`;
      mergedWood.material = mats.wood;
      mergedWood.receiveShadows = true;
      mergedWood.parent = stNode;
    }

    const mergedCrystals = Mesh.MergeMeshes(crystalParts, true, true);
    if (mergedCrystals) {
      mergedCrystals.name = `stree_crystals_${segId}_${idx}`;
      mergedCrystals.material = mats.accentGlow;
      mergedCrystals.parent = stNode;
    }

    this.animatedProps.push({ node: stNode, kind: 'tree', phase: idx * 1.5 + segId });
  }

  /**
   * Albero organico scolpito e solidamente ancorato al suolo tramite basamento di terra,
   * 4 radici rampicanti conficcate nel terreno, tronco curvo texturizzato, rami, liane e chiome multi-strato.
   */
  private createOrganicJungleTree(
    segId: number,
    idx: number,
    side: number,
    xOffset: number,
    z: number,
    root: TransformNode,
    mats: BiomeMaterialSet
  ): void {
    const treeNode = new TransformNode(`tree_${segId}_${idx}`, this.scene);
    treeNode.position.set(xOffset, 0, z);
    treeNode.parent = root;

    // Tumulo di terra e muschio alla base dell'albero affinché sia saldamente piantato nel terreno
    const treeMound = this.createDisplacedIco(
      `tmound_${segId}_${idx}`,
      1.55,
      3,
      0.14,
      segId * 17 + idx
    );
    treeMound.position.set(0, -0.22, 0);
    treeMound.scaling.set(1.25, 0.36, 1.25);
    treeMound.material = mats.terrain;
    treeMound.receiveShadows = true;
    treeMound.parent = treeNode;

    const bend = side * 0.62;
    const trunkPath = [
      new Vector3(0, -0.68, 0),
      new Vector3(bend * 0.14, 1.05, 0.1),
      new Vector3(bend * 0.34, 2.65, -0.08),
      new Vector3(bend * 0.52, 4.3, 0.08),
      new Vector3(bend * 0.44, 5.95, 0),
    ];

    const woodMeshes: Mesh[] = [];
    const foliageMeshes: Mesh[] = [];

    const trunk = MeshBuilder.CreateTube(
      `trunk_${segId}_${idx}`,
      {
        path: trunkPath,
        tessellation: 14,
        radiusFunction: (i) => {
          const t = i / (trunkPath.length - 1);
          return 0.68 * (1 - t * 0.58) + (t === 0 ? 0.2 : 0);
        },
        cap: Mesh.CAP_END,
      },
      this.scene
    );
    trunk.computeWorldMatrix(true);
    woodMeshes.push(trunk);

    // 4 radici nodose rampicanti che affondano nel terreno
    for (let rIdx = 0; rIdx < 4; rIdx++) {
      const ang = (rIdx * Math.PI) / 2 + 0.35 + (idx % 2) * 0.2;
      const dx = Math.cos(ang);
      const dz = Math.sin(ang);
      const rootPath = [
        new Vector3(dx * 0.38, 1.25, dz * 0.38),
        new Vector3(dx * 0.92, 0.38, dz * 0.92),
        new Vector3(dx * 1.48, -0.45, dz * 1.48),
      ];
      const rootTube = MeshBuilder.CreateTube(
        `trootTube_${segId}_${idx}_${rIdx}`,
        {
          path: rootPath,
          tessellation: 8,
          radiusFunction: (i) => Math.max(0.08, 0.28 - i * 0.09),
          cap: Mesh.CAP_END,
        },
        this.scene
      );
      rootTube.computeWorldMatrix(true);
      woodMeshes.push(rootTube);
    }

    // Due rami principali curvi + liane pendenti
    for (const bSide of [-1, 1]) {
      const branchPath = [
        new Vector3(bend * 0.42, 3.65, 0),
        new Vector3(bend * 0.42 + bSide * 0.92, 4.55, bSide * 0.42),
        new Vector3(bend * 0.42 + bSide * 1.65, 5.25, bSide * 0.68),
      ];
      const branch = MeshBuilder.CreateTube(
        `branch_${segId}_${idx}_${bSide}`,
        {
          path: branchPath,
          tessellation: 10,
          radiusFunction: (i) => 0.23 - i * 0.06,
          cap: Mesh.CAP_END,
        },
        this.scene
      );
      branch.computeWorldMatrix(true);
      woodMeshes.push(branch);

      const vine = MeshBuilder.CreateTube(
        `vine_${segId}_${idx}_${bSide}`,
        {
          path: [
            new Vector3(bend * 0.42 + bSide * 1.38, 5.05, bSide * 0.55),
            new Vector3(bend * 0.42 + bSide * 1.42, 3.8, bSide * 0.52),
            new Vector3(bend * 0.42 + bSide * 1.35, 2.75, bSide * 0.58),
          ],
          tessellation: 6,
          radius: 0.045,
          cap: Mesh.CAP_ALL,
        },
        this.scene
      );
      vine.computeWorldMatrix(true);
      foliageMeshes.push(vine);
    }

    // Chioma multi-cluster con IcoSphere scolpite (flat: false + UV sferiche nitide!)
    const canopyOffsets = [
      new Vector3(bend * 0.45, 6.25, 0),
      new Vector3(bend * 0.45 - 1.42, 5.38, 0.55),
      new Vector3(bend * 0.45 + 1.42, 5.42, -0.45),
      new Vector3(bend * 0.45 + 0.15, 5.58, 1.15),
      new Vector3(bend * 0.45 - 0.18, 5.48, -1.1),
    ];
    canopyOffsets.forEach((pos, cIdx) => {
      const r = cIdx === 0 ? 2.0 : 1.48;
      const crown = this.createDisplacedIco(
        `crown_${segId}_${idx}_${cIdx}`,
        r,
        3,
        0.12,
        segId * 13 + idx * 7 + cIdx
      );
      crown.position.copyFrom(pos);
      crown.scaling.set(1.24, 0.64, 1.2);
      crown.computeWorldMatrix(true);
      foliageMeshes.push(crown);
    });

    // Felce/cespuglio basso radicato ai piedi del tronco
    const baseBush = this.createDisplacedIco(
      `tbush_${segId}_${idx}`,
      0.88,
      3,
      0.13,
      segId + idx
    );
    baseBush.position.set(-side * 0.72, 0.24, 0.42);
    baseBush.scaling.set(1.32, 0.62, 1.24);
    baseBush.computeWorldMatrix(true);
    foliageMeshes.push(baseBush);

    const mergedWood = Mesh.MergeMeshes(woodMeshes, true, true);
    if (mergedWood) {
      mergedWood.name = `tree_wood_${segId}_${idx}`;
      mergedWood.material = mats.wood;
      mergedWood.receiveShadows = true;
      mergedWood.parent = treeNode;
    }

    const mergedFoliage = Mesh.MergeMeshes(foliageMeshes, true, true);
    if (mergedFoliage) {
      mergedFoliage.name = `tree_foliage_${segId}_${idx}`;
      mergedFoliage.material = mats.foliage;
      mergedFoliage.receiveShadows = true;
      mergedFoliage.parent = treeNode;
    }

    this.animatedProps.push({ node: treeNode, kind: 'tree', phase: idx * 1.4 + segId });
  }

  private createDisplacedIco(
    name: string,
    radius: number,
    subdivisions: number,
    roughness: number,
    seedVal: number
  ): Mesh {
    const seedBucket = Math.abs(Math.round(seedVal)) % 4;
    const key = `${radius.toFixed(2)}_${roughness.toFixed(2)}_${seedBucket}`;
    let template = this.icoTemplates.get(key);
    if (!template || template.isDisposed()) {
      template = MeshBuilder.CreateIcoSphere(
        `ico_tpl_${key}`,
        { radius, subdivisions: Math.min(2, subdivisions), flat: false },
        this.scene
      );
      const positions = template.getVerticesData(VertexBuffer.PositionKind);
      const uvs = template.getVerticesData(VertexBuffer.UVKind);
      if (positions) {
        for (let i = 0; i < positions.length; i += 3) {
          const x = positions[i];
          const y = positions[i + 1];
          const z = positions[i + 2];
          const noise =
            Math.sin(x * 2.1 + seedBucket) *
            Math.cos(y * 1.9 + seedBucket * 0.5) *
            Math.sin(z * 2.1);
          const factor = 1 + noise * roughness;
          const nx = x * factor;
          const ny = y * factor;
          const nz = z * factor;
          positions[i] = nx;
          positions[i + 1] = ny;
          positions[i + 2] = nz;

          if (uvs) {
            const vIdx = (i / 3) * 2;
            const len = Math.hypot(nx, ny, nz) || 1;
            uvs[vIdx] = 0.5 + (Math.atan2(nz, nx) / (Math.PI * 2)) * 2.2;
            uvs[vIdx + 1] = 0.5 + (ny / len) * 0.5 * 2.2;
          }
        }
        template.updateVerticesData(VertexBuffer.PositionKind, positions);
        if (uvs) {
          template.updateVerticesData(VertexBuffer.UVKind, uvs);
        }
        template.createNormals(false);
      }
      template.isVisible = false;
      template.isPickable = false;
      template.setEnabled(false);
      this.icoTemplates.set(key, template);
    }

    const clone = template.clone(name);
    clone.setEnabled(true);
    clone.isVisible = true;
    clone.scaling.setAll(1);
    return clone;
  }

  private initParticleAtmosphere(): void {
    const ps = new ParticleSystem('weatherParticles', 320, this.scene);
    const tex = new Texture(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIUlEQVQoU2NkYGD4z8DAwMgABXAGkMDEyMjIyMDAwAgAN3IEB2r9p+AAAAAASUVORK5CYII=',
      this.scene
    );
    ps.particleTexture = tex;
    ps.minEmitBox = new Vector3(-12, -2, -6);
    ps.maxEmitBox = new Vector3(12, 4, 18);
    ps.minSize = 0.08;
    ps.maxSize = 0.2;
    ps.minLifeTime = 1.6;
    ps.maxLifeTime = 3.0;
    ps.emitRate = 70;
    ps.minEmitPower = 0.5;
    ps.maxEmitPower = 1.6;
    ps.start();
    this.weatherParticles = ps;
  }

  public dispose(): void {
    if (this.vlsPostProcess && this.vlsCamera) {
      this.vlsPostProcess.dispose(this.vlsCamera);
      this.vlsPostProcess = null;
    }
    this.sunDisc?.dispose();
    this.sunDiscMat?.dispose();
    this.weatherParticles?.dispose();
    this.glowLayer?.dispose();
    this.shadowGen?.dispose();
    this.shadowCasters.clear();
    this.skyCloudMat.dispose();
    this.valleyTex?.dispose();
    this.valleyMat.dispose();
    this.textures.dispose();
    for (const tpl of this.icoTemplates.values()) {
      if (!tpl.isDisposed()) {
        tpl.dispose();
      }
    }
    this.icoTemplates.clear();
    for (const set of this.materials.values()) {
      (set.waterOrLava.diffuseTexture as Texture | null)?.dispose();
      set.floor.dispose();
      set.terrain.dispose();
      set.wall.dispose();
      set.wood.dispose();
      set.trim.dispose();
      set.foliage.dispose();
      set.accentGlow.dispose();
      set.waterOrLava.dispose();
      set.cliff.dispose();
    }
    this.materials.clear();
  }
}

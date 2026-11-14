import {
  AbstractMesh,
  AssetContainer,
  Color3,
  PBRMaterial,
  Scene,
  SceneLoader,
  Texture,
  TransformNode,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

export type ModelAssetKey =
  | 'relic_coin'
  | 'temple_idol'
  | 'crystal_cluster'
  | 'powerup_core'
  | 'guardian_totem'
  | 'celestial_spire'
  | 'desert_obelisk'
  | 'shadow_monolith';

const MODEL_FILES: Record<ModelAssetKey, string> = {
  relic_coin: 'relic_coin.glb',
  temple_idol: 'temple_idol.glb',
  crystal_cluster: 'crystal_cluster.glb',
  powerup_core: 'powerup_core.glb',
  guardian_totem: 'guardian_totem.glb',
  celestial_spire: 'celestial_spire.glb',
  desert_obelisk: 'desert_obelisk.glb',
  shadow_monolith: 'shadow_monolith.glb',
};

/**
 * Caricatore asincrono di veri modelli 3D glTF 2.0 (.glb) tramite @babylonjs/loaders.
 * Mantiene i prefab in AssetContainer dedicati così ogni segmento può istanziare copie
 * leggere in GPU con materiali PBR integrati.
 */
export class ModelAssetLoader {
  private readonly containers = new Map<ModelAssetKey, AssetContainer>();
  private loadingPromise: Promise<void> | null = null;
  private disposed = false;

  constructor(private readonly scene: Scene) {}

  public preloadAll(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
      const entries = Object.entries(MODEL_FILES) as Array<[ModelAssetKey, string]>;
      await Promise.all(
        entries.map(async ([key, filename]) => {
          try {
            const container = await SceneLoader.LoadAssetContainerAsync(
              '/assets/models/',
              filename,
              this.scene
            );
            if (this.disposed) {
              container.dispose();
              return;
            }
            this.enhanceContainerMaterials(container);
            this.containers.set(key, container);
          } catch {
            // Ambiente headless/offline o loader non disponibile: fallback procedurale garantito
          }
        })
      );
    })();

    return this.loadingPromise;
  }

  private enhanceContainerMaterials(container: AssetContainer): void {
    for (const mat of container.materials) {
      if (!(mat instanceof PBRMaterial)) continue;

      if (mat.name === 'TempleBasalt' || mat.name === 'RockMatrix') {
        const stoneTex = new Texture('/assets/textures/carved_stone.jpg', this.scene, false, true);
        stoneTex.wrapU = Texture.MIRROR_ADDRESSMODE;
        stoneTex.wrapV = Texture.MIRROR_ADDRESSMODE;
        stoneTex.uScale = 2.0;
        stoneTex.vScale = 2.0;
        stoneTex.anisotropicFilteringLevel = 8;

        mat.albedoTexture = stoneTex;
        mat.bumpTexture = stoneTex;
        if (mat.bumpTexture) mat.bumpTexture.level = 0.45;
        mat.albedoColor =
          mat.name === 'TempleBasalt' ? new Color3(0.74, 0.78, 0.68) : new Color3(0.55, 0.58, 0.64);
        mat.roughness = 0.78;
        mat.metallic = 0.08;
        container.textures.push(stoneTex);
      } else if (mat.name === 'ObsidianDark') {
        const obsTex = new Texture('/assets/textures/shadow_obsidian.jpg', this.scene, false, true);
        obsTex.wrapU = Texture.MIRROR_ADDRESSMODE;
        obsTex.wrapV = Texture.MIRROR_ADDRESSMODE;
        obsTex.uScale = 2.0;
        obsTex.vScale = 2.0;
        obsTex.anisotropicFilteringLevel = 8;

        mat.albedoTexture = obsTex;
        mat.bumpTexture = obsTex;
        if (mat.bumpTexture) mat.bumpTexture.level = 0.48;
        mat.roughness = 0.45;
        mat.metallic = 0.25;
        container.textures.push(obsTex);
      } else if (mat.name === 'SacredBronze' || mat.name === 'GoldSculpted') {
        const goldTex = new Texture(
          '/assets/textures/ancient_gold_metal.jpg',
          this.scene,
          false,
          true
        );
        goldTex.wrapU = Texture.MIRROR_ADDRESSMODE;
        goldTex.wrapV = Texture.MIRROR_ADDRESSMODE;
        goldTex.uScale = 1.6;
        goldTex.vScale = 1.6;
        goldTex.anisotropicFilteringLevel = 8;

        mat.albedoTexture = goldTex;
        mat.bumpTexture = goldTex;
        if (mat.bumpTexture) mat.bumpTexture.level = 0.35;
        mat.albedoColor = Color3.FromHexString('#ffd84d');
        mat.metallic = 0.28;
        mat.roughness = 0.15;
        mat.reflectivityColor = new Color3(1.0, 0.95, 0.72);
        mat.emissiveColor = new Color3(0.3, 0.2, 0.03);
        mat.clearCoat.isEnabled = true;
        mat.clearCoat.intensity = 0.85;
        mat.clearCoat.roughness = 0.08;
        container.textures.push(goldTex);
      } else if (mat.name === 'AmberRuby') {
        mat.albedoColor = Color3.FromHexString('#fb923c');
        mat.metallic = 0.22;
        mat.roughness = 0.1;
        mat.emissiveColor = new Color3(0.42, 0.16, 0.02);
        mat.clearCoat.isEnabled = true;
        mat.clearCoat.intensity = 0.92;
        mat.clearCoat.roughness = 0.06;
      }
    }
  }

  public isReady(key: ModelAssetKey): boolean {
    return this.containers.has(key);
  }

  /**
   * Crea un'istanza completa del modello .glb richiesto sotto `parent`, restituendo il TransformNode
   * radice (o null se non ancora caricato).
   */
  public instantiate(
    key: ModelAssetKey,
    name: string,
    parent?: TransformNode
  ): TransformNode | null {
    const container = this.containers.get(key);
    if (!container || this.disposed) return null;

    const inst = container.instantiateModelsToScene(
      (sourceName) => `${name}_${sourceName}`,
      false
    );
    const holder = new TransformNode(name, this.scene);
    for (const rootNode of inst.rootNodes) {
      rootNode.parent = holder;
    }
    const meshes = holder.getChildMeshes(false) as AbstractMesh[];
    for (const m of meshes) {
      m.isPickable = false;
    }
    if (parent) {
      holder.parent = parent;
    }
    return holder;
  }

  public dispose(): void {
    this.disposed = true;
    for (const c of this.containers.values()) {
      c.dispose();
    }
    this.containers.clear();
  }
}

import { DynamicTexture, Scene, Texture, Vector4 } from '@babylonjs/core';
import { BIOMES } from '../data/gameCatalog';
import type { BiomeId } from '../types/game.types';

export interface BiomeTexturePack {
  diffuse: Texture;
  terrainDiffuse: Texture;
  normal: DynamicTexture;
  sky: DynamicTexture;
}

export interface SharedTexturePack {
  heroOutfit: Texture;
  malakorArmor: Texture;
  barkWood: Texture;
  foliageCanopy: Texture;
  carvedStone: Texture;
  ancientGoldMetal: Texture;
  obsHazardSurface: Texture;
}

const BIOME_TEXTURE_URLS: Record<BiomeId, string> = {
  jungle: '/assets/textures/temple_stone.jpg',
  volcano: '/assets/textures/volcano_lava.jpg',
  sky: '/assets/textures/celestial_marble.jpg',
  desert: '/assets/textures/desert_sandstone.jpg',
  shadow: '/assets/textures/shadow_obsidian.jpg',
};

const SHARED_TEXTURE_URLS = {
  heroOutfit: '/assets/textures/hero_outfit.jpg',
  malakorArmor: '/assets/textures/malakor_armor.jpg',
  barkWood: '/assets/textures/bark_wood.jpg',
  foliageCanopy: '/assets/textures/foliage_canopy.jpg',
  carvedStone: '/assets/textures/carved_stone.jpg',
  ancientGoldMetal: '/assets/textures/ancient_gold_metal.jpg',
  obsHazardSurface: '/assets/textures/obs_hazard_surface.jpg',
} as const;

export class ProceduralTextures {
  private cache: Map<BiomeId, BiomeTexturePack> = new Map();
  private sharedCache: SharedTexturePack | null = null;

  constructor(private readonly scene: Scene) {}

  private loadTiledTexture(
    url: string,
    uScale: number,
    vScale: number,
    mirror = false
  ): Texture {
    const tex = new Texture(url, this.scene, false, true);
    const mode = mirror ? Texture.MIRROR_ADDRESSMODE : Texture.WRAP_ADDRESSMODE;
    tex.wrapU = mode;
    tex.wrapV = mode;
    tex.uScale = uScale;
    tex.vScale = vScale;
    tex.anisotropicFilteringLevel = 8;
    return tex;
  }

  public getSharedTextures(): SharedTexturePack {
    if (this.sharedCache) return this.sharedCache;

    this.sharedCache = {
      heroOutfit: this.loadTiledTexture(SHARED_TEXTURE_URLS.heroOutfit, 1.5, 1.5),
      malakorArmor: this.loadTiledTexture(SHARED_TEXTURE_URLS.malakorArmor, 2.0, 2.0),
      barkWood: this.loadTiledTexture(SHARED_TEXTURE_URLS.barkWood, 1.5, 2.5, true),
      foliageCanopy: this.loadTiledTexture(SHARED_TEXTURE_URLS.foliageCanopy, 1.8, 1.8, true),
      carvedStone: this.loadTiledTexture(SHARED_TEXTURE_URLS.carvedStone, 1.6, 1.6, true),
      ancientGoldMetal: this.loadTiledTexture(SHARED_TEXTURE_URLS.ancientGoldMetal, 1.5, 1.5),
      obsHazardSurface: this.loadTiledTexture(SHARED_TEXTURE_URLS.obsHazardSurface, 1.5, 1.5, true),
    };
    return this.sharedCache;
  }

  public static buildBoxFaceUV(w: number, h: number, d: number, tileSize = 1.6): Vector4[] {
    const uW = Math.max(0.4, w / tileSize);
    const uH = Math.max(0.4, h / tileSize);
    const uD = Math.max(0.4, d / tileSize);
    return [
      new Vector4(0, 0, uW, uH), // front (+Z)
      new Vector4(0, 0, uW, uH), // back (-Z)
      new Vector4(0, 0, uD, uH), // right (+X)
      new Vector4(0, 0, uD, uH), // left (-X)
      new Vector4(0, 0, uW, uD), // top (+Y)
      new Vector4(0, 0, uW, uD), // bottom (-Y)
    ];
  }

  public getBiomeTextures(biome: BiomeId): BiomeTexturePack {
    const existing = this.cache.get(biome);
    if (existing) return existing;

    const diffuse = this.loadTiledTexture(BIOME_TEXTURE_URLS[biome], 1, 1);
    const shared = this.getSharedTextures();
    const terrainDiffuse =
      biome === 'jungle'
        ? shared.foliageCanopy
        : biome === 'volcano'
          ? shared.obsHazardSurface
          : this.createBiomeTerrainTexture(biome);
    const normal = this.createSoftNormalMap(biome);
    const sky = this.createSkyTexture(biome);
    const pack = { diffuse, terrainDiffuse, normal, sky };
    this.cache.set(biome, pack);
    return pack;
  }

  /**
   * Texture procedurale 512x512 ad alto dettaglio per terreni e rilievi dei biomi avanzati
   * (Città Celeste, Deserto Perduto, Regno delle Ombre).
   */
  private createBiomeTerrainTexture(biome: 'sky' | 'desert' | 'shadow'): DynamicTexture {
    const size = 512;
    const tex = new DynamicTexture(
      `tex_terrain_${biome}`,
      { width: size, height: size },
      this.scene,
      true
    );
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D | null;
    if (!ctx) return tex;

    if (biome === 'sky') {
      // Intarsi di marmo celeste dorato, motivi geometrici astrali e venature ciano/oro
      const bg = ctx.createLinearGradient(0, 0, size, size);
      bg.addColorStop(0, '#dbeafe');
      bg.addColorStop(0.5, '#f1f5f9');
      bg.addColorStop(1, '#bfdbfe');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);

      // Venature di marmo soffuse
      for (let i = 0; i < 22; i++) {
        ctx.strokeStyle =
          i % 3 === 0 ? 'rgba(56, 189, 248, 0.24)' : 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = 1.5 + (i % 3);
        ctx.beginPath();
        const y0 = (i * 29) % size;
        ctx.moveTo(0, y0);
        ctx.bezierCurveTo(
          size * 0.3,
          y0 + Math.sin(i) * 44,
          size * 0.7,
          y0 - Math.cos(i) * 44,
          size,
          (y0 + 36) % size
        );
        ctx.stroke();
      }

      // Griglia di lastre astrali e cornici in oro antico
      const step = 128;
      ctx.strokeStyle = 'rgba(202, 138, 4, 0.55)';
      ctx.lineWidth = 3;
      for (let gx = 0; gx < size; gx += step) {
        for (let gy = 0; gy < size; gy += step) {
          ctx.strokeRect(gx + 6, gy + 6, step - 12, step - 12);
          ctx.beginPath();
          ctx.arc(gx + step / 2, gy + step / 2, step * 0.24, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(14, 165, 233, 0.45)';
          ctx.stroke();
          ctx.strokeStyle = 'rgba(202, 138, 4, 0.55)';
        }
      }
    } else if (biome === 'desert') {
      // Dune di sabbia dorata dal vento, granuli d'ambra e lastre sepolte
      const bg = ctx.createLinearGradient(0, 0, 0, size);
      bg.addColorStop(0, '#d99b4e');
      bg.addColorStop(0.5, '#e6b873');
      bg.addColorStop(1, '#c48339');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);

      // Onde sinusoidali scolpite dal vento del deserto
      for (let y = 0; y < size; y += 16) {
        ctx.strokeStyle =
          y % 32 === 0 ? 'rgba(254, 240, 138, 0.34)' : 'rgba(120, 53, 15, 0.25)';
        ctx.lineWidth = y % 32 === 0 ? 4 : 3;
        ctx.beginPath();
        for (let x = 0; x <= size; x += 16) {
          const wy = y + Math.sin((x / size) * Math.PI * 4 + y * 0.08) * 6;
          if (x === 0) ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        }
        ctx.stroke();
      }

      // Granuli d'ambra e ciottoli d'arenaria
      let seed = 419;
      for (let i = 0; i < 420; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const px = seed % size;
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const py = seed % size;
        ctx.fillStyle = i % 5 === 0 ? 'rgba(251, 191, 36, 0.55)' : 'rgba(146, 64, 14, 0.26)';
        ctx.fillRect(px, py, i % 9 === 0 ? 5 : 2, i % 9 === 0 ? 4 : 2);
      }
    } else {
      // Regno delle Ombre: basalto ossidiana fratturato con vene ametista e sigilli runici
      const bg = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size * 0.72);
      bg.addColorStop(0, '#1e1035');
      bg.addColorStop(1, '#090514');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);

      // Fessure luminose bioluminescenti
      let seed = 881;
      for (let i = 0; i < 28; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        let cx = seed % size;
        seed = (seed * 1664525 + 1013904223) >>> 0;
        let cy = seed % size;
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(192, 132, 252, 0.65)' : 'rgba(139, 92, 246, 0.38)';
        ctx.lineWidth = i % 4 === 0 ? 2.6 : 1.4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (let s = 0; s < 5; s++) {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          cx += ((seed % 70) - 35);
          seed = (seed * 1664525 + 1013904223) >>> 0;
          cy += ((seed % 70) - 35);
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }

      // Cerchi e rune incise
      ctx.strokeStyle = 'rgba(216, 180, 254, 0.35)';
      ctx.lineWidth = 2;
      for (const center of [
        [128, 128],
        [384, 128],
        [256, 384],
      ]) {
        ctx.beginPath();
        ctx.arc(center[0], center[1], 46, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeRect(center[0] - 28, center[1] - 28, 56, 56);
      }
    }

    tex.wrapU = Texture.MIRROR_ADDRESSMODE;
    tex.wrapV = Texture.MIRROR_ADDRESSMODE;
    tex.uScale = 2.0;
    tex.vScale = 2.0;
    tex.anisotropicFilteringLevel = 8;
    tex.update();
    return tex;
  }

  /**
   * Normal map tangent-space morbida (canale B = 255, base #8080ff) con micro-rilievi coerenti col bioma
   * (fughe lastre per sky, onde sabbia per desert, fratture cristalline per shadow), range 118..138.
   */
  private createSoftNormalMap(biome: BiomeId): DynamicTexture {
    const size = 256;
    const tex = new DynamicTexture(`tex_nrm_${biome}`, { width: size, height: size }, this.scene, true);
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D | null;
    if (!ctx) return tex;

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    let seed = biome.charCodeAt(0) * 977 + 13;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        seed = (seed * 1664525 + 1013904223) >>> 0;
        let nx = 123 + (seed % 11); // 123..133
        seed = (seed * 1664525 + 1013904223) >>> 0;
        let ny = 123 + (seed % 11);

        if (biome === 'sky') {
          // Fughe geometriche delle lastre celesti
          if (x % 64 < 3) nx = x % 64 === 0 ? 118 : 138;
          if (y % 64 < 3) ny = y % 64 === 0 ? 118 : 138;
        } else if (biome === 'desert') {
          // Onde di sabbia orizzontali
          const wave = Math.sin((y / size) * Math.PI * 16 + Math.sin((x / size) * Math.PI * 4) * 0.6);
          ny = Math.round(128 + wave * 9);
        } else if (biome === 'shadow') {
          // Fratture cristalline angolate
          const diag = Math.abs(((x * 2 + y) % 64) - 32);
          if (diag < 3) {
            nx = 136;
            ny = 119;
          }
        }

        data[idx] = Math.max(118, Math.min(138, nx));
        data[idx + 1] = Math.max(118, Math.min(138, ny));
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    tex.wrapU = Texture.WRAP_ADDRESSMODE;
    tex.wrapV = Texture.WRAP_ADDRESSMODE;
    tex.uScale = 1.6;
    tex.vScale = 4.5;
    tex.update();
    return tex;
  }

  /**
   * Texture panoramica dipinta a 1024x512 per la cupola del cielo:
   * gradiente atmosferico ricco + disco solare/eclissi + nuvole + catene montuose e silhouette tematiche.
   */
  private createSkyTexture(biome: BiomeId): DynamicTexture {
    const w = 1024;
    const h = 512;
    const tex = new DynamicTexture(`tex_sky_${biome}`, { width: w, height: h }, this.scene, true);
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D | null;
    if (!ctx) return tex;

    const cfg = BIOMES[biome];
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (biome === 'jungle') {
      grad.addColorStop(0, '#0b2226');
      grad.addColorStop(0.28, '#174843');
      grad.addColorStop(0.45, '#3d8267');
      grad.addColorStop(0.54, '#7ab88c');
      grad.addColorStop(0.68, cfg.fogColor);
      grad.addColorStop(1, cfg.fogColor);
    } else if (biome === 'volcano') {
      grad.addColorStop(0, '#120505');
      grad.addColorStop(0.3, '#360d0a');
      grad.addColorStop(0.46, '#9a2711');
      grad.addColorStop(0.55, '#ea580c');
      grad.addColorStop(0.68, cfg.fogColor);
      grad.addColorStop(1, cfg.fogColor);
    } else if (biome === 'sky') {
      grad.addColorStop(0, '#16457d');
      grad.addColorStop(0.28, '#2b6cb5');
      grad.addColorStop(0.46, '#6cb4e8');
      grad.addColorStop(0.56, '#bae6fd');
      grad.addColorStop(0.68, cfg.fogColor);
      grad.addColorStop(1, cfg.fogColor);
    } else if (biome === 'desert') {
      grad.addColorStop(0, '#1b2b48');
      grad.addColorStop(0.3, '#594a5e');
      grad.addColorStop(0.47, '#c77a3f');
      grad.addColorStop(0.56, '#f3c178');
      grad.addColorStop(0.68, cfg.fogColor);
      grad.addColorStop(1, cfg.fogColor);
    } else {
      grad.addColorStop(0, '#04010c');
      grad.addColorStop(0.3, '#190a36');
      grad.addColorStop(0.47, '#431772');
      grad.addColorStop(0.56, '#6b21a8');
      grad.addColorStop(0.68, cfg.fogColor);
      grad.addColorStop(1, cfg.fogColor);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Stelle discrete in quota (emisfero superiore uniforme a 360°)
    if (biome === 'shadow' || biome === 'jungle' || biome === 'desert') {
      ctx.fillStyle =
        biome === 'shadow' ? 'rgba(232, 121, 249, 0.72)' : 'rgba(255, 250, 230, 0.45)';
      for (let i = 0; i < 160; i++) {
        const sx = (i * 137 + 19) % w;
        const sy = (i * 61 + 11) % Math.floor(h * 0.42);
        const r = i % 3 === 0 ? 1.8 : 1.0;
        ctx.fillRect(sx, sy, r, r);
      }
    }

    // Nuvole morbide stratificate nel cielo superiore
    ctx.fillStyle =
      biome === 'volcano'
        ? 'rgba(42, 12, 8, 0.42)'
        : biome === 'shadow'
          ? 'rgba(72, 20, 120, 0.32)'
          : 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < 24; i++) {
      const cx = (i * 89 + 30) % w;
      const cy = h * 0.18 + ((i * 37) % Math.floor(h * 0.24));
      ctx.beginPath();
      ctx.ellipse(cx, cy, 68 + (i % 4) * 26, 12 + (i % 3) * 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Babylon CreateSphere ha v=0 al polo +Y (in invertY=true WebGL corrisponde al fondo canvas):
    // capovolgiamo V così canvas y=0 coincide con lo zenith +Y.
    tex.wrapU = Texture.WRAP_ADDRESSMODE;
    tex.wrapV = Texture.CLAMP_ADDRESSMODE;
    tex.vScale = -1;
    tex.vOffset = 1;
    tex.update();
    return tex;
  }

  public dispose(): void {
    for (const pack of this.cache.values()) {
      pack.diffuse.dispose();
      if (pack.terrainDiffuse instanceof DynamicTexture) {
        pack.terrainDiffuse.dispose();
      }
      pack.normal.dispose();
      pack.sky.dispose();
    }
    this.cache.clear();

    if (this.sharedCache) {
      this.sharedCache.heroOutfit.dispose();
      this.sharedCache.malakorArmor.dispose();
      this.sharedCache.barkWood.dispose();
      this.sharedCache.foliageCanopy.dispose();
      this.sharedCache.carvedStone.dispose();
      this.sharedCache.ancientGoldMetal.dispose();
      this.sharedCache.obsHazardSurface.dispose();
      this.sharedCache = null;
    }
  }
}

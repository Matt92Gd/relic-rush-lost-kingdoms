import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  VertexBuffer,
} from '@babylonjs/core';
import { TrackMath } from './TrackMath';
import { ProceduralTextures } from './ProceduralTextures';
import type { ModelAssetLoader } from './ModelAssetLoader';
import type { Lane, ObstaclePlacement, TrackSegmentData } from '../types/game.types';
import { SolvabilityValidator } from './SolvabilityValidator';

export interface ActiveObstacleInstance {
  placement: ObstaclePlacement;
  node: TransformNode;
  movingMesh?: Mesh;
  flameMesh?: Mesh;
  collapseNode?: TransformNode;
  collapseKind?: 'log' | 'pillar';
  collapseTriggered?: boolean;
  collapseSlammed?: boolean;
}

export interface CollisionCheckInput {
  playerLane: number;
  playerY: number;
  playerLocalZ: number;
  isSliding: boolean;
}

export interface CollisionOutcome {
  hit: boolean;
  lethal: boolean;
  obstacle?: ObstaclePlacement;
}

export class ObstacleSystem {
  private texStone: Texture | null = null;
  private texWood: Texture | null = null;
  private texMoss: Texture | null = null;
  private texGoldMetal: Texture | null = null;
  private texHazard: Texture | null = null;
  private matStone: StandardMaterial | null = null;
  private matWood: StandardMaterial | null = null;
  private matMetal: StandardMaterial | null = null;
  private matGold: StandardMaterial | null = null;
  private matFlame: StandardMaterial | null = null;
  private matHazardRock: StandardMaterial | null = null;
  private matMoss: StandardMaterial | null = null;
  private matWarning: StandardMaterial | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly modelLoader: ModelAssetLoader | null = null
  ) {
    this.initMaterials();
  }

  private initMaterials(): void {
    this.texStone = new Texture('/assets/textures/carved_stone.jpg', this.scene, false, true);
    this.texStone.wrapU = Texture.WRAP_ADDRESSMODE;
    this.texStone.wrapV = Texture.WRAP_ADDRESSMODE;
    this.texStone.uScale = 1.6;
    this.texStone.vScale = 1.6;

    this.texWood = new Texture('/assets/textures/bark_wood.jpg', this.scene, false, true);
    this.texWood.wrapU = Texture.WRAP_ADDRESSMODE;
    this.texWood.wrapV = Texture.WRAP_ADDRESSMODE;
    this.texWood.uScale = 1.4;
    this.texWood.vScale = 2.0;

    this.texMoss = new Texture('/assets/textures/foliage_canopy.jpg', this.scene, false, true);
    this.texMoss.wrapU = Texture.WRAP_ADDRESSMODE;
    this.texMoss.wrapV = Texture.WRAP_ADDRESSMODE;
    this.texMoss.uScale = 2.0;
    this.texMoss.vScale = 2.0;

    this.texGoldMetal = new Texture('/assets/textures/ancient_gold_metal.jpg', this.scene, false, true);
    this.texGoldMetal.wrapU = Texture.WRAP_ADDRESSMODE;
    this.texGoldMetal.wrapV = Texture.WRAP_ADDRESSMODE;
    this.texGoldMetal.uScale = 1.4;
    this.texGoldMetal.vScale = 1.4;

    this.texHazard = new Texture('/assets/textures/obs_hazard_surface.jpg', this.scene, false, true);
    this.texHazard.wrapU = Texture.WRAP_ADDRESSMODE;
    this.texHazard.wrapV = Texture.WRAP_ADDRESSMODE;
    this.texHazard.uScale = 1.4;
    this.texHazard.vScale = 1.4;

    this.matStone = new StandardMaterial('obs_stone', this.scene);
    this.matStone.diffuseTexture = this.texStone;
    this.matStone.diffuseColor = new Color3(0.9, 0.86, 0.8);
    this.matStone.specularColor = new Color3(0.24, 0.22, 0.18);

    this.matWood = new StandardMaterial('obs_wood', this.scene);
    this.matWood.diffuseTexture = this.texWood;
    this.matWood.diffuseColor = new Color3(0.96, 0.88, 0.78);
    this.matWood.specularColor = new Color3(0.1, 0.08, 0.06);

    this.matMoss = new StandardMaterial('obs_moss', this.scene);
    this.matMoss.diffuseTexture = this.texMoss;
    this.matMoss.diffuseColor = new Color3(0.88, 1.0, 0.88);
    this.matMoss.specularColor = new Color3(0.1, 0.14, 0.1);

    this.matMetal = new StandardMaterial('obs_metal', this.scene);
    this.matMetal.diffuseTexture = this.texGoldMetal;
    this.matMetal.diffuseColor = new Color3(0.82, 0.86, 0.92);
    this.matMetal.specularColor = new Color3(0.92, 0.94, 1.0);

    this.matGold = new StandardMaterial('obs_gold', this.scene);
    this.matGold.diffuseTexture = this.texGoldMetal;
    this.matGold.diffuseColor = new Color3(1.0, 0.82, 0.36);
    this.matGold.emissiveColor = new Color3(0.12, 0.07, 0.01);
    this.matGold.specularColor = new Color3(0.9, 0.78, 0.38);

    this.matHazardRock = new StandardMaterial('obs_hazard_rock', this.scene);
    this.matHazardRock.diffuseTexture = this.texHazard;
    this.matHazardRock.diffuseColor = new Color3(1.0, 0.92, 0.86);
    this.matHazardRock.emissiveColor = new Color3(0.24, 0.07, 0.01);
    this.matHazardRock.specularColor = new Color3(0.45, 0.25, 0.12);

    this.matFlame = new StandardMaterial('obs_flame', this.scene);
    this.matFlame.diffuseTexture = this.texHazard;
    this.matFlame.diffuseColor = new Color3(1.0, 0.52, 0.12);
    this.matFlame.emissiveColor = new Color3(0.92, 0.34, 0.03);
    this.matFlame.specularColor = new Color3(0.5, 0.3, 0.2);

    this.matWarning = new StandardMaterial('obs_warn', this.scene);
    this.matWarning.diffuseTexture = this.texHazard;
    this.matWarning.diffuseColor = new Color3(0.98, 0.32, 0.22);
    this.matWarning.emissiveColor = new Color3(0.55, 0.12, 0.04);
    this.matWarning.alpha = 0.76;
  }

  private applySphericalUVs(mesh: Mesh, repeat = 2.0): void {
    const pos = mesh.getVerticesData(VertexBuffer.PositionKind);
    const uvs = mesh.getVerticesData(VertexBuffer.UVKind);
    if (!pos || !uvs) return;
    for (let i = 0; i < pos.length; i += 3) {
      const len = Math.hypot(pos[i], pos[i + 1], pos[i + 2]) || 1;
      const idx = (i / 3) * 2;
      uvs[idx] = 0.5 + (Math.atan2(pos[i + 2], pos[i]) / (Math.PI * 2)) * repeat;
      uvs[idx + 1] = 0.5 + (pos[i + 1] / len) * 0.5 * repeat;
    }
    mesh.updateVerticesData(VertexBuffer.UVKind, uvs);
  }

  public static getObstacleCenterX(obs: ObstaclePlacement): number {
    if (
      obs.type === 'moving_barrier' ||
      obs.type === 'swinging_blade' ||
      obs.type === 'narrow_path' ||
      obs.type === 'chasm_pit' ||
      obs.type === 'broken_bridge' ||
      obs.widthLanes >= 3
    ) {
      return 0;
    }
    if (obs.widthLanes === 2) {
      // Allinea esattamente la mesh alle 2 corsie coperte da SolvabilityValidator ([-1,0] -> -0.95, [0,1] -> +0.95)
      return obs.lane === 1 ? 0.95 : -0.95;
    }
    return TrackMath.laneToOffset(obs.lane);
  }

  public buildObstaclesForSegment(
    seg: TrackSegmentData,
    root: TransformNode
  ): ActiveObstacleInstance[] {
    const instances: ActiveObstacleInstance[] = [];

    for (const obs of seg.obstacles) {
      const node = new TransformNode(`obs_${obs.id}`, this.scene);
      const x = ObstacleSystem.getObstacleCenterX(obs);
      node.position.set(x, 0, obs.localZ);
      node.parent = root;

      const instance: ActiveObstacleInstance = { placement: obs, node };
      this.createDetailedMesh(obs, node, instance);
      instances.push(instance);
    }

    return instances;
  }

  private createDetailedMesh(
    obs: ObstaclePlacement,
    parent: TransformNode,
    inst: ActiveObstacleInstance
  ): void {
    const spanWidth = obs.widthLanes === 3 ? 5.4 : obs.widthLanes === 2 ? 3.5 : 1.75;

    // Indicatore runico leggibile sul pavimento davanti a ogni trappola
    if (obs.type !== 'narrow_path') {
      const stripWidth =
        obs.type === 'moving_barrier' || obs.type === 'swinging_blade' ? 5.2 : spanWidth;
      const strip = MeshBuilder.CreateBox(
        `warn_${obs.id}`,
        {
          width: stripWidth,
          height: 0.05,
          depth: 0.24,
          faceUV: ProceduralTextures.buildBoxFaceUV(stripWidth, 0.05, 0.24, 1.2),
          wrap: true,
        },
        this.scene
      );
      strip.position.set(0, 0.03, -1.15);
      strip.material = this.matWarning;
      strip.parent = parent;
    }

    switch (obs.type) {
      case 'fallen_log': {
        const collapsePivot = new TransformNode(`log_piv_${obs.id}`, this.scene);
        const startAngle = obs.lane >= 0 ? -0.82 : 0.82;
        collapsePivot.position.set(0, 0.36 + Math.sin(Math.abs(startAngle)) * 0.72, 0);
        collapsePivot.rotation.z = startAngle; // Inclinato verso l'interno pista per evitare compenetrazioni
        collapsePivot.parent = parent;

        const log = MeshBuilder.CreateCylinder(
          `log_${obs.id}`,
          { height: spanWidth, diameterTop: 0.58, diameterBottom: 0.72, tessellation: 22 },
          this.scene
        );
        log.rotation.z = Math.PI / 2;
        log.position.set(0, 0, 0);
        log.material = this.matWood;
        log.parent = collapsePivot;

        // Anelli legnosi di taglio ai capi + fasciature di muschio texturizzate
        for (const s of [-1, 1]) {
          const cap = MeshBuilder.CreateCylinder(
            `log_cap_${obs.id}_${s}`,
            { height: 0.08, diameter: 0.54, tessellation: 18 },
            this.scene
          );
          cap.rotation.z = Math.PI / 2;
          cap.position.set(s * (spanWidth * 0.5 + 0.02), 0, 0);
          cap.material = this.matGold;
          cap.parent = collapsePivot;
        }

        const moss = MeshBuilder.CreateIcoSphere(
          `log_moss_${obs.id}`,
          { radius: 0.28, subdivisions: 3, flat: false },
          this.scene
        );
        this.applySphericalUVs(moss, 2.2);
        moss.position.set(-0.2, 0.25, 0.06);
        moss.scaling.set(1.5, 0.48, 0.95);
        moss.material = this.matMoss;
        moss.parent = collapsePivot;

        inst.collapseNode = collapsePivot;
        inst.collapseKind = 'log';
        inst.collapseTriggered = false;
        inst.collapseSlammed = false;
        break;
      }
      case 'low_wall': {
        // Muro basso scolpito con faceUV proporzionale e modanatura dorata cesellata in cima
        const wall = MeshBuilder.CreateBox(
          `lwall_${obs.id}`,
          {
            width: spanWidth,
            height: 0.68,
            depth: 0.68,
            faceUV: ProceduralTextures.buildBoxFaceUV(spanWidth, 0.68, 0.68, 1.4),
            wrap: true,
          },
          this.scene
        );
        wall.position.y = 0.34;
        wall.material = this.matStone;
        wall.parent = parent;

        const cornice = MeshBuilder.CreateBox(
          `lwall_cornice_${obs.id}`,
          {
            width: spanWidth + 0.14,
            height: 0.13,
            depth: 0.78,
            faceUV: ProceduralTextures.buildBoxFaceUV(spanWidth + 0.14, 0.13, 0.78, 1.1),
            wrap: true,
          },
          this.scene
        );
        cornice.position.y = 0.72;
        cornice.material = this.matGold;
        cornice.parent = parent;
        break;
      }
      case 'low_arch': {
        // Vera trave templare su due colonne proporzionata all'eroe per scivolata senza compenetrazioni
        const beam = MeshBuilder.CreateBox(
          `arch_beam_${obs.id}`,
          {
            width: spanWidth + 0.3,
            height: 0.56,
            depth: 0.78,
            faceUV: ProceduralTextures.buildBoxFaceUV(spanWidth + 0.3, 0.56, 0.78, 1.4),
            wrap: true,
          },
          this.scene
        );
        beam.position.y = 1.54;
        beam.material = this.matStone;
        beam.parent = parent;

        const trimTop = MeshBuilder.CreateBox(
          `arch_trim_${obs.id}`,
          {
            width: spanWidth + 0.45,
            height: 0.15,
            depth: 0.88,
            faceUV: ProceduralTextures.buildBoxFaceUV(spanWidth + 0.45, 0.15, 0.88, 1.2),
            wrap: true,
          },
          this.scene
        );
        trimTop.position.y = 1.88;
        trimTop.material = this.matGold;
        trimTop.parent = parent;

        // Punte scolpite rivolte verso il basso per segnalare il pericolo di colpo alto
        for (let t = -2; t <= 2; t++) {
          const tooth = MeshBuilder.CreateCylinder(
            `arch_tooth_${obs.id}_${t}`,
            { height: 0.24, diameterTop: 0.2, diameterBottom: 0.02, tessellation: 8 },
            this.scene
          );
          tooth.position.set((t * (spanWidth - 0.8)) / 4, 1.15, 0);
          tooth.material = this.matGold;
          tooth.parent = parent;
        }

        const gem = MeshBuilder.CreateSphere(`arch_gem_${obs.id}`, { diameter: 0.36, segments: 14 }, this.scene);
        gem.position.set(0, 1.54, -0.42);
        gem.material = this.matFlame;
        gem.parent = parent;

        for (const s of [-1, 1]) {
          const post = MeshBuilder.CreateCylinder(
            `arch_p_${obs.id}_${s}`,
            { height: 1.92, diameterTop: 0.38, diameterBottom: 0.54, tessellation: 20 },
            this.scene
          );
          post.position.set(s * (spanWidth / 2 - 0.15), 0.96, 0);
          post.material = this.matStone;
          post.parent = parent;
        }
        break;
      }
      case 'chasm_pit':
      case 'broken_bridge': {
        const edge = MeshBuilder.CreateBox(
          `pit_edge_${obs.id}`,
          {
            width: 5.8,
            height: 0.16,
            depth: 0.28,
            faceUV: ProceduralTextures.buildBoxFaceUV(5.8, 0.16, 0.28, 1.2),
            wrap: true,
          },
          this.scene
        );
        edge.position.set(0, 0.06, -1.65);
        edge.material = this.matHazardRock;
        edge.parent = parent;
        break;
      }
      case 'collapsed_pillar': {
        const collapsePivot = new TransformNode(`cpil_piv_${obs.id}`, this.scene);
        const startTilt = -0.58;
        collapsePivot.position.set(0, Math.sin(Math.abs(startTilt)) * 0.75, 0);
        collapsePivot.rotation.x = startTilt;
        collapsePivot.parent = parent;

        const pil = MeshBuilder.CreateCylinder(
          `cpil_${obs.id}`,
          { height: 2.15, diameterTop: 0.82, diameterBottom: 1.08, tessellation: 22 },
          this.scene
        );
        pil.position.y = 1.12;
        pil.rotation.z = 0.07;
        pil.material = this.matStone;
        pil.parent = collapsePivot;

        const capRing = MeshBuilder.CreateTorus(
          `cpil_ring_${obs.id}`,
          { diameter: 0.9, thickness: 0.11, tessellation: 24 },
          this.scene
        );
        capRing.position.y = 2.12;
        capRing.material = this.matGold;
        capRing.parent = collapsePivot;

        inst.collapseNode = collapsePivot;
        inst.collapseKind = 'pillar';
        inst.collapseTriggered = false;
        inst.collapseSlammed = false;
        break;
      }
      case 'rolling_boulder': {
        const boulder = MeshBuilder.CreateIcoSphere(
          `boulder_${obs.id}`,
          { radius: 0.68, subdivisions: 2, flat: false },
          this.scene
        );
        const pos = boulder.getVerticesData(VertexBuffer.PositionKind);
        if (pos) {
          for (let i = 0; i < pos.length; i += 3) {
            const wobble =
              1 + Math.sin(pos[i] * 2.8 + pos[i + 1] * 2.4 + pos[i + 2] * 2.6) * 0.11;
            pos[i] *= wobble;
            pos[i + 1] *= wobble;
            pos[i + 2] *= wobble;
          }
          boulder.updateVerticesData(VertexBuffer.PositionKind, pos);
          this.applySphericalUVs(boulder, 2.0);
          boulder.createNormals(false);
        }
        boulder.position.y = 0.74;
        boulder.material = this.matHazardRock;
        boulder.parent = parent;

        const runeBand = MeshBuilder.CreateTorus(
          `boulder_band_${obs.id}`,
          { diameter: 1.34, thickness: 0.09, tessellation: 24 },
          this.scene
        );
        runeBand.rotation.x = Math.PI / 2;
        runeBand.material = this.matGold;
        runeBand.parent = boulder;
        inst.movingMesh = boulder;
        break;
      }
      case 'swinging_blade': {
        const pivot = MeshBuilder.CreateCylinder(
          `blade_piv_${obs.id}`,
          { height: 5.5, diameter: 0.3, tessellation: 18 },
          this.scene
        );
        pivot.rotation.z = Math.PI / 2;
        pivot.position.set(0, 3.05, 0);
        pivot.material = this.matGold;
        pivot.parent = parent;

        const arm = MeshBuilder.CreateCylinder(
          `blade_arm_${obs.id}`,
          { height: 2.15, diameter: 0.16, tessellation: 16 },
          this.scene
        );
        arm.position.set(0, 1.95, 0);
        arm.material = this.matGold;
        arm.parent = parent;

        const edge = MeshBuilder.CreateCylinder(
          `blade_edge_${obs.id}`,
          { height: 0.12, diameter: 1.38, tessellation: 24 },
          this.scene
        );
        edge.rotation.x = Math.PI / 2;
        edge.position.y = -0.95;
        edge.material = this.matMetal;
        edge.parent = arm;

        const rim = MeshBuilder.CreateTorus(
          `blade_rim_${obs.id}`,
          { diameter: 1.38, thickness: 0.08, tessellation: 24 },
          this.scene
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.y = -0.95;
        rim.material = this.matFlame;
        rim.parent = arm;
        inst.movingMesh = arm;
        break;
      }
      case 'pressure_trap': {
        const plate = MeshBuilder.CreateCylinder(
          `plate_${obs.id}`,
          { height: 0.14, diameter: 1.55, tessellation: 22 },
          this.scene
        );
        plate.position.y = 0.07;
        plate.material = this.matHazardRock;
        plate.parent = parent;

        const ring = MeshBuilder.CreateTorus(
          `plate_ring_${obs.id}`,
          { diameter: 1.56, thickness: 0.09, tessellation: 24 },
          this.scene
        );
        ring.position.y = 0.12;
        ring.material = this.matGold;
        ring.parent = parent;

        const spikes = MeshBuilder.CreateCylinder(
          `spikes_${obs.id}`,
          { height: 1.15, diameterTop: 0.03, diameterBottom: 0.55, tessellation: 14 },
          this.scene
        );
        spikes.position.y = 0.55;
        spikes.material = this.matMetal;
        spikes.parent = parent;
        inst.movingMesh = spikes;
        break;
      }
      case 'fire_jet': {
        const totemNode = this.modelLoader?.isReady('guardian_totem')
          ? this.modelLoader.instantiate('guardian_totem', `fj_totem_${obs.id}`, parent)
          : null;
        if (totemNode) {
          totemNode.scaling.setAll(0.75);
          totemNode.position.set(0, 0, 0.25);
        } else {
          const plinth = MeshBuilder.CreateCylinder(
            `vent_base_${obs.id}`,
            { height: 0.24, diameterTop: 1.15, diameterBottom: 1.38, tessellation: 16 },
            this.scene
          );
          plinth.position.y = 0.12;
          plinth.material = this.matHazardRock;
          plinth.parent = parent;

          const vent = MeshBuilder.CreateTorus(
            `vent_${obs.id}`,
            { diameter: 1.15, thickness: 0.2, tessellation: 24 },
            this.scene
          );
          vent.position.y = 0.24;
          vent.material = this.matGold;
          vent.parent = parent;
        }

        const flame = MeshBuilder.CreateCylinder(
          `flame_${obs.id}`,
          { height: 2.45, diameterTop: 0.82, diameterBottom: 0.34, tessellation: 18 },
          this.scene
        );
        const flameBaseY = totemNode ? 0.55 : 0.24;
        flame.position.y = flameBaseY + 1.225;
        flame.metadata = { baseY: flameBaseY };
        flame.material = this.matFlame;
        flame.parent = parent;
        inst.flameMesh = flame;
        break;
      }
      case 'crumbling_tile': {
        const tile = MeshBuilder.CreateBox(
          `tile_${obs.id}`,
          {
            width: 1.75,
            height: 0.22,
            depth: 1.75,
            faceUV: ProceduralTextures.buildBoxFaceUV(1.75, 0.22, 1.75, 1.3),
            wrap: true,
          },
          this.scene
        );
        tile.position.y = 0.09;
        tile.material = this.matHazardRock;
        tile.parent = parent;
        inst.movingMesh = tile;
        break;
      }
      case 'volcanic_rock': {
        const rock = MeshBuilder.CreateIcoSphere(
          `vrock_${obs.id}`,
          { radius: 0.68, subdivisions: 2, flat: false },
          this.scene
        );
        const pos = rock.getVerticesData(VertexBuffer.PositionKind);
        if (pos) {
          for (let i = 0; i < pos.length; i += 3) {
            const w = 1 + Math.cos(pos[i] * 3.1 + pos[i + 1] * 2.5) * 0.15;
            pos[i] *= w;
            pos[i + 1] *= w * 1.12;
            pos[i + 2] *= w;
          }
          rock.updateVerticesData(VertexBuffer.PositionKind, pos);
          this.applySphericalUVs(rock, 2.0);
          rock.createNormals(false);
        }
        rock.position.y = 0.84;
        rock.material = this.matHazardRock;
        rock.parent = parent;
        break;
      }
      case 'moving_barrier': {
        const barrier = MeshBuilder.CreateCapsule(
          `mbar_${obs.id}`,
          { height: 1.65, radius: 0.44, tessellation: 20 },
          this.scene
        );
        barrier.position.y = 0.82;
        barrier.material = this.matStone;
        barrier.parent = parent;

        if (this.modelLoader?.isReady('temple_idol')) {
          const idol = this.modelLoader.instantiate('temple_idol', `mbar_idol_${obs.id}`, parent);
          if (idol) {
            idol.position.y = 0;
            idol.scaling.setAll(0.68);
            barrier.isVisible = false;
            idol.parent = barrier;
            idol.position.y = -0.82;
          }
        }

        const ring = MeshBuilder.CreateTorus(
          `mbar_r_${obs.id}`,
          { diameter: 1.2, thickness: 0.1, tessellation: 24 },
          this.scene
        );
        ring.position.y = 0.25;
        ring.material = this.matGold;
        ring.parent = barrier;
        inst.movingMesh = barrier;
        break;
      }
      case 'rotating_mechanism': {
        const hub = MeshBuilder.CreateCylinder(
          `rhub_${obs.id}`,
          { height: 1.05, diameter: 0.72, tessellation: 22 },
          this.scene
        );
        hub.position.y = 0.52;
        hub.material = this.matGold;
        hub.parent = parent;

        const arm = MeshBuilder.CreateCapsule(
          `rarm_${obs.id}`,
          { height: 3.4, radius: 0.2, tessellation: 18 },
          this.scene
        );
        arm.rotation.z = Math.PI / 2;
        arm.position.y = 0.74;
        arm.material = this.matHazardRock;
        arm.parent = parent;

        const collar = MeshBuilder.CreateTorus(
          `rcap_${obs.id}`,
          { diameter: 0.85, thickness: 0.08, tessellation: 20 },
          this.scene
        );
        collar.position.y = 0.74;
        collar.material = this.matMetal;
        collar.parent = parent;

        inst.movingMesh = arm;
        break;
      }
      case 'narrow_path': {
        for (const side of [-1, 1]) {
          const block = MeshBuilder.CreateCylinder(
            `nblock_${obs.id}_${side}`,
            { height: 1.75, diameterTop: 0.72, diameterBottom: 1.2, tessellation: 18 },
            this.scene
          );
          block.position.set(side * 1.9, 0.88, 0);
          block.material = this.matStone;
          block.parent = parent;
        }
        break;
      }
    }
  }

  public updateAnimations(
    instances: ActiveObstacleInstance[],
    timeSec: number,
    dt: number,
    playerWorldPos?: Vector3,
    onSetPieceSlam?: () => void
  ): void {
    for (const inst of instances) {
      const obs = inst.placement;
      if (obs.destroyed) {
        inst.node.setEnabled(false);
        continue;
      }
      const phase = obs.dynamicPhase ?? 0;

      // Crolli cinematografici in tempo reale quando il giocatore si avvicina a < 28m
      if (inst.collapseNode && !inst.collapseSlammed) {
        if (!inst.collapseTriggered) {
          if (!playerWorldPos) {
            inst.collapseTriggered = true;
          } else {
            const worldPos = inst.node.getAbsolutePosition();
            if (Vector3.Distance(worldPos, playerWorldPos) < 28) {
              inst.collapseTriggered = true;
            }
          }
        }
        if (inst.collapseTriggered) {
          if (inst.collapseKind === 'log') {
            const rz = inst.collapseNode.rotation.z;
            const step = dt * 5.2;
            const nextRz = Math.abs(rz) <= step ? 0 : rz - Math.sign(rz) * step;
            inst.collapseNode.rotation.z = nextRz;
            inst.collapseNode.position.y = 0.36 + Math.sin(Math.abs(nextRz)) * 0.72;
            if (nextRz === 0) {
              inst.collapseSlammed = true;
              onSetPieceSlam?.();
            }
          } else {
            const rx = inst.collapseNode.rotation.x;
            const step = dt * 3.2;
            const nextRx = Math.abs(rx) <= step ? 0 : rx - Math.sign(rx) * step;
            inst.collapseNode.rotation.x = nextRx;
            inst.collapseNode.position.y = Math.sin(Math.abs(nextRx)) * 0.75;
            if (nextRx === 0) {
              inst.collapseSlammed = true;
              onSetPieceSlam?.();
            }
          }
        }
      }

      if (obs.type === 'rolling_boulder' && inst.movingMesh) {
        inst.movingMesh.rotation.x += dt * 6;
      } else if (obs.type === 'swinging_blade' && inst.movingMesh) {
        const swing = Math.sin(timeSec * 2.6 + phase);
        inst.movingMesh.position.x = swing * 1.65;
        inst.movingMesh.rotation.z = swing * 0.22;
        obs.lane = Math.round(swing) as Lane;
      } else if (obs.type === 'moving_barrier' && inst.movingMesh) {
        const sweep = Math.sin(timeSec * 2.1 + phase);
        inst.movingMesh.position.x = sweep * 1.9;
        obs.lane = Math.round(sweep) as Lane;
      } else if (obs.type === 'rotating_mechanism' && inst.movingMesh) {
        inst.movingMesh.rotation.y = timeSec * 2.4 + phase;
      } else if (obs.type === 'fire_jet' && inst.flameMesh) {
        const pulse = Math.sin(timeSec * 3.0 + phase);
        const active = pulse > -0.15;
        const sy = active ? 0.75 + Math.max(0, pulse) * 0.5 : 0.08;
        const flameBaseY = (inst.flameMesh.metadata as { baseY?: number } | null)?.baseY ?? 0.24;
        inst.flameMesh.scaling.y = sy;
        inst.flameMesh.position.y = flameBaseY + 1.225 * sy;
        inst.flameMesh.isVisible = active;
      } else if (obs.type === 'crumbling_tile' && inst.movingMesh && obs.triggered) {
        inst.movingMesh.position.y -= dt * 3.5;
      }
    }
  }

  public static evaluateCollision(
    obs: ObstaclePlacement,
    input: CollisionCheckInput,
    timeSec: number = 0
  ): CollisionOutcome {
    if (obs.destroyed) return { hit: false, lethal: false };

    const zHalf = obs.type === 'chasm_pit' || obs.type === 'broken_bridge' ? 1.45 : 0.52;
    if (Math.abs(input.playerLocalZ - obs.localZ) > zHalf) {
      return { hit: false, lethal: false };
    }

    if (obs.type === 'chasm_pit' || obs.type === 'broken_bridge') {
      if (input.playerY < 0.38) {
        return { hit: true, lethal: true, obstacle: obs };
      }
      return { hit: false, lethal: false };
    }

    if (obs.type === 'narrow_path') {
      if (Math.abs(input.playerLane) > 0.48) {
        return { hit: true, lethal: true, obstacle: obs };
      }
      return { hit: false, lethal: false };
    }

    const covered = SolvabilityValidator.getCoveredLanes(obs.lane, obs.widthLanes);
    const matchesLane = covered.some((l) => Math.abs(input.playerLane - l) < 0.45);
    if (!matchesLane) {
      return { hit: false, lethal: false };
    }

    if (obs.type === 'fire_jet') {
      const pulse = Math.sin(timeSec * 3.0 + (obs.dynamicPhase ?? 0));
      if (pulse <= -0.15) return { hit: false, lethal: false };
    }

    if (obs.type === 'low_arch') {
      if (input.isSliding) return { hit: false, lethal: false };
      if (input.playerY > obs.height - 0.12) return { hit: false, lethal: false };
      return { hit: true, lethal: true, obstacle: obs };
    }

    if (input.playerY >= obs.height - 0.25) {
      return { hit: false, lethal: false };
    }

    const isStumbleOnly =
      obs.type === 'fallen_log' || obs.type === 'crumbling_tile' || obs.type === 'pressure_trap';

    return {
      hit: true,
      lethal: !isStumbleOnly,
      obstacle: obs,
    };
  }

  public dispose(): void {
    this.texStone?.dispose();
    this.texWood?.dispose();
    this.texMoss?.dispose();
    this.texGoldMetal?.dispose();
    this.texHazard?.dispose();
    this.matStone?.dispose();
    this.matWood?.dispose();
    this.matMoss?.dispose();
    this.matMetal?.dispose();
    this.matGold?.dispose();
    this.matHazardRock?.dispose();
    this.matFlame?.dispose();
    this.matWarning?.dispose();
    void Vector3;
  }
}

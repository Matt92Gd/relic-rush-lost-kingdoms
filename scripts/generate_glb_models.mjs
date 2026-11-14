import fs from 'node:fs';
import path from 'node:path';

/**
 * Generatore procedurale di veri modelli 3D binari glTF 2.0 (.glb) con geometrie scolpite,
 * normali, UV e materiali PBR conformi allo standard Khronos glTF 2.0.
 */

class MeshBuilder3D {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.uvs = [];
    this.indices = [];
  }

  get vertexCount() {
    return this.positions.length / 3;
  }

  addTriangle(p0, p1, p2, u0 = [0, 0], u1 = [1, 0], u2 = [0.5, 1]) {
    const ux = p1[0] - p0[0];
    const uy = p1[1] - p0[1];
    const uz = p1[2] - p0[2];
    const vx = p2[0] - p0[0];
    const vy = p2[1] - p0[1];
    const vz = p2[2] - p0[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;

    const base = this.vertexCount;
    this.positions.push(...p0, ...p1, ...p2);
    this.normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    this.uvs.push(...u0, ...u1, ...u2);
    this.indices.push(base, base + 1, base + 2);
  }

  addQuad(p0, p1, p2, p3, uScale = 1, vScale = 1) {
    this.addTriangle(p0, p1, p2, [0, 0], [uScale, 0], [uScale, vScale]);
    this.addTriangle(p0, p2, p3, [0, 0], [uScale, vScale], [0, vScale]);
  }

  addLatheRing(profile, segments = 24, offsetY = 0, rotY = 0) {
    const rings = [];
    const cR = Math.cos(rotY);
    const sR = Math.sin(rotY);

    for (let j = 0; j < profile.length; j++) {
      const [rad, y] = profile[j];
      const ring = [];
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const lx = Math.cos(a) * rad;
        const lz = Math.sin(a) * rad;
        const wx = lx * cR - lz * sR;
        const wz = lx * sR + lz * cR;
        ring.push([wx, y + offsetY, wz]);
      }
      rings.push(ring);
    }

    for (let j = 0; j < rings.length - 1; j++) {
      const r0 = rings[j];
      const r1 = rings[j + 1];
      for (let i = 0; i < segments; i++) {
        const p00 = r0[i];
        const p10 = r0[i + 1];
        const p11 = r1[i + 1];
        const p01 = r1[i];
        const u0 = i / segments;
        const u1 = (i + 1) / segments;
        const v0 = j / (rings.length - 1);
        const v1 = (j + 1) / (rings.length - 1);
        this.addTriangle(p00, p01, p11, [u0, v0], [u0, v1], [u1, v1]);
        this.addTriangle(p00, p11, p10, [u0, v0], [u1, v1], [u1, v0]);
      }
    }
  }

  addPrismCrystal({
    sides = 6,
    radiusBottom = 0.22,
    radiusMid = 0.19,
    heightBody = 0.8,
    heightTip = 0.35,
    offset = [0, 0, 0],
    tiltX = 0,
    tiltZ = 0,
    yaw = 0,
  }) {
    const transform = (pt) => {
      let [x, y, z] = pt;
      // Rotate Y (yaw)
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      [x, z] = [x * cy - z * sy, x * sy + z * cy];
      // Rotate X (tiltX)
      const cx = Math.cos(tiltX);
      const sx = Math.sin(tiltX);
      [y, z] = [y * cx - z * sx, y * sx + z * cx];
      // Rotate Z (tiltZ)
      const cz = Math.cos(tiltZ);
      const sz = Math.sin(tiltZ);
      [x, y] = [x * cz - y * sz, x * sz + y * cz];
      return [x + offset[0], y + offset[1], z + offset[2]];
    };

    const botRing = [];
    const midRing = [];
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      botRing.push(transform([Math.cos(a) * radiusBottom, 0, Math.sin(a) * radiusBottom]));
      midRing.push(transform([Math.cos(a) * radiusMid, heightBody, Math.sin(a) * radiusMid]));
    }
    const tip = transform([0, heightBody + heightTip, 0]);
    const centerBot = transform([0, 0, 0]);

    for (let i = 0; i < sides; i++) {
      const u0 = i / sides;
      const u1 = (i + 1) / sides;
      // Side facet
      this.addTriangle(botRing[i], midRing[i], midRing[i + 1], [u0, 0], [u0, 0.7], [u1, 0.7]);
      this.addTriangle(botRing[i], midRing[i + 1], botRing[i + 1], [u0, 0], [u1, 0.7], [u1, 0]);
      // Pyramid tip facet
      this.addTriangle(midRing[i], tip, midRing[i + 1], [u0, 0.7], [(u0 + u1) * 0.5, 1], [u1, 0.7]);
      // Bottom cap
      this.addTriangle(botRing[i], botRing[i + 1], centerBot, [0.5, 0.5], [1, 0.5], [0.5, 0]);
    }
  }

  addBeveledBox(w, h, d, cx = 0, cy = 0, cz = 0) {
    const hw = w * 0.5;
    const hh = h * 0.5;
    const hd = d * 0.5;
    const v = [
      [cx - hw, cy - hh, cz + hd], // 0 Front-Bot-L
      [cx + hw, cy - hh, cz + hd], // 1 Front-Bot-R
      [cx + hw, cy + hh, cz + hd], // 2 Front-Top-R
      [cx - hw, cy + hh, cz + hd], // 3 Front-Top-L
      [cx - hw, cy - hh, cz - hd], // 4 Back-Bot-L
      [cx + hw, cy - hh, cz - hd], // 5 Back-Bot-R
      [cx + hw, cy + hh, cz - hd], // 6 Back-Top-R
      [cx - hw, cy + hh, cz - hd], // 7 Back-Top-L
    ];
    // +Z front
    this.addQuad(v[0], v[1], v[2], v[3], w, h);
    // -Z back
    this.addQuad(v[5], v[4], v[7], v[6], w, h);
    // +X right
    this.addQuad(v[1], v[5], v[6], v[2], d, h);
    // -X left
    this.addQuad(v[4], v[0], v[3], v[7], d, h);
    // +Y top
    this.addQuad(v[3], v[2], v[6], v[7], w, d);
    // -Y bottom
    this.addQuad(v[4], v[5], v[1], v[0], w, d);
  }

  addTorusRing(
    majorR = 0.42,
    minorR = 0.048,
    majorSegs = 24,
    minorSegs = 12,
    tiltX = 0,
    tiltZ = 0,
    offsetY = 0
  ) {
    const cx = Math.cos(tiltX);
    const sx = Math.sin(tiltX);
    const cz = Math.cos(tiltZ);
    const sz = Math.sin(tiltZ);

    const transform = (pt) => {
      let [x, y, z] = pt;
      [y, z] = [y * cx - z * sx, y * sx + z * cx];
      [x, y] = [x * cz - y * sz, x * sz + y * cz];
      return [x, y + offsetY, z];
    };

    const rings = [];
    for (let i = 0; i <= majorSegs; i++) {
      const u = (i / majorSegs) * Math.PI * 2;
      const cu = Math.cos(u);
      const su = Math.sin(u);
      const ring = [];
      for (let j = 0; j <= minorSegs; j++) {
        const v = (j / minorSegs) * Math.PI * 2;
        const cv = Math.cos(v);
        const sv = Math.sin(v);
        const r = majorR + minorR * cv;
        ring.push(transform([r * cu, minorR * sv, r * su]));
      }
      rings.push(ring);
    }

    for (let i = 0; i < majorSegs; i++) {
      for (let j = 0; j < minorSegs; j++) {
        const p00 = rings[i][j];
        const p10 = rings[i + 1][j];
        const p11 = rings[i + 1][j + 1];
        const p01 = rings[i][j + 1];
        const u0 = i / majorSegs;
        const u1 = (i + 1) / majorSegs;
        const v0 = j / minorSegs;
        const v1 = (j + 1) / minorSegs;
        this.addTriangle(p00, p10, p11, [u0, v0], [u1, v0], [u1, v1]);
        this.addTriangle(p00, p11, p01, [u0, v0], [u1, v1], [u0, v1]);
      }
    }
  }
}

function buildGLB(meshesSpec) {
  const binChunks = [];
  let byteOffset = 0;

  const bufferViews = [];
  const accessors = [];
  const gltfMeshes = [];
  const gltfNodes = [];
  const gltfMaterials = [];

  const align4 = (n) => (n + 3) & ~3;

  const pushTypedArray = (typedArray, target) => {
    const buf = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
    const viewIndex = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: buf.byteLength,
      target,
    });
    binChunks.push(buf);
    byteOffset += buf.byteLength;
    const padded = align4(byteOffset);
    if (padded > byteOffset) {
      binChunks.push(Buffer.alloc(padded - byteOffset, 0));
      byteOffset = padded;
    }
    return viewIndex;
  };

  const computeMinMax3 = (arr) => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < arr.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        if (arr[i + k] < min[k]) min[k] = arr[i + k];
        if (arr[i + k] > max[k]) max[k] = arr[i + k];
      }
    }
    return { min, max };
  };

  for (let idx = 0; idx < meshesSpec.length; idx++) {
    const spec = meshesSpec[idx];
    const posArr = new Float32Array(spec.mesh.positions);
    const nrmArr = new Float32Array(spec.mesh.normals);
    const uvArr = new Float32Array(spec.mesh.uvs);
    const idxArr = new Uint32Array(spec.mesh.indices);

    const posView = pushTypedArray(posArr, 34962);
    const nrmView = pushTypedArray(nrmArr, 34962);
    const uvView = pushTypedArray(uvArr, 34962);
    const idxView = pushTypedArray(idxArr, 34963);

    const { min, max } = computeMinMax3(posArr);
    const vCount = posArr.length / 3;

    const posAcc = accessors.length;
    accessors.push({
      bufferView: posView,
      componentType: 5126,
      count: vCount,
      type: 'VEC3',
      min,
      max,
    });

    const nrmAcc = accessors.length;
    accessors.push({
      bufferView: nrmView,
      componentType: 5126,
      count: vCount,
      type: 'VEC3',
    });

    const uvAcc = accessors.length;
    accessors.push({
      bufferView: uvView,
      componentType: 5126,
      count: vCount,
      type: 'VEC2',
    });

    const idxAcc = accessors.length;
    accessors.push({
      bufferView: idxView,
      componentType: 5125,
      count: idxArr.length,
      type: 'SCALAR',
    });

    const matIndex = gltfMaterials.length;
    gltfMaterials.push({
      name: spec.material.name,
      pbrMetallicRoughness: {
        baseColorFactor: spec.material.baseColor,
        metallicFactor: spec.material.metallic,
        roughnessFactor: spec.material.roughness,
      },
      emissiveFactor: spec.material.emissive ?? [0, 0, 0],
      doubleSided: true,
    });

    gltfMeshes.push({
      name: spec.name,
      primitives: [
        {
          attributes: {
            POSITION: posAcc,
            NORMAL: nrmAcc,
            TEXCOORD_0: uvAcc,
          },
          indices: idxAcc,
          material: matIndex,
        },
      ],
    });

    gltfNodes.push({
      name: spec.name,
      mesh: idx,
    });
  }

  const gltfJson = {
    asset: {
      version: '2.0',
      generator: 'RelicRush-GLB-Generator-1.0',
    },
    scene: 0,
    scenes: [
      {
        name: 'AssetScene',
        nodes: gltfNodes.map((_, i) => i),
      },
    ],
    nodes: gltfNodes,
    meshes: gltfMeshes,
    materials: gltfMaterials,
    buffers: [{ byteLength: byteOffset }],
    bufferViews,
    accessors,
  };

  let jsonBuf = Buffer.from(JSON.stringify(gltfJson), 'utf8');
  const jsonPaddedLen = align4(jsonBuf.byteLength);
  if (jsonPaddedLen > jsonBuf.byteLength) {
    jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jsonPaddedLen - jsonBuf.byteLength, 0x20)]);
  }

  const binBuf = Buffer.concat(binChunks);
  const totalLength = 12 + 8 + jsonBuf.byteLength + 8 + binBuf.byteLength;

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4); // version 2
  header.writeUInt32LE(totalLength, 8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonBuf.byteLength, 0);
  jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binBuf.byteLength, 0);
  binChunkHeader.writeUInt32LE(0x004e4942, 4); // "BIN\0"

  return Buffer.concat([header, jsonChunkHeader, jsonBuf, binChunkHeader, binBuf]);
}

function createRelicCoinGLB() {
  // Moneta sacra scolpita con doppio bordo in rilievo e disco centrale in gemma d'oro
  const rim = new MeshBuilder3D();
  // Ruotata verticalmente lungo Y: costruita su piano XY usando lathe intorno a Y poi ruotata? Più semplice:
  // Costruiamo l'anello piatto in XZ e lasciamo che il loader o nodi ruotino, oppure ruotiamo X +90deg direttamente nei vertici!
  const lathe = new MeshBuilder3D();
  lathe.addLatheRing(
    [
      [0.01, -0.04],
      [0.16, -0.055],
      [0.24, -0.032],
      [0.31, -0.068],
      [0.36, -0.068],
      [0.39, -0.035],
      [0.39, 0.035],
      [0.36, 0.068],
      [0.31, 0.068],
      [0.24, 0.032],
      [0.16, 0.055],
      [0.01, 0.04],
    ],
    24,
    0,
    0
  );

  // Ruota di 90 gradi su X così la moneta sta in piedi rivolta verso +Z
  for (let i = 0; i < lathe.positions.length; i += 3) {
    const y = lathe.positions[i + 1];
    const z = lathe.positions[i + 2];
    lathe.positions[i + 1] = z;
    lathe.positions[i + 2] = -y;

    const ny = lathe.normals[i + 1];
    const nz = lathe.normals[i + 2];
    lathe.normals[i + 1] = nz;
    lathe.normals[i + 2] = -ny;
  }

  // Stella/rombo scolpito centrale
  const emblem = new MeshBuilder3D();
  emblem.addPrismCrystal({
    sides: 4,
    radiusBottom: 0.14,
    radiusMid: 0.08,
    heightBody: 0.04,
    heightTip: 0.05,
    offset: [0, 0, 0.025],
    tiltX: Math.PI / 2,
  });
  emblem.addPrismCrystal({
    sides: 4,
    radiusBottom: 0.14,
    radiusMid: 0.08,
    heightBody: 0.04,
    heightTip: 0.05,
    offset: [0, 0, -0.025],
    tiltX: -Math.PI / 2,
  });

  void rim;
  return buildGLB([
    {
      name: 'RelicCoinRim',
      mesh: lathe,
      material: {
        name: 'GoldSculpted',
        baseColor: [0.98, 0.78, 0.22, 1.0],
        metallic: 0.88,
        roughness: 0.22,
        emissive: [0.16, 0.1, 0.01],
      },
    },
    {
      name: 'RelicCoinCenter',
      mesh: emblem,
      material: {
        name: 'AmberRuby',
        baseColor: [1.0, 0.56, 0.12, 1.0],
        metallic: 0.45,
        roughness: 0.18,
        emissive: [0.35, 0.12, 0.02],
      },
    },
  ]);
}

function createTempleIdolGLB() {
  const stoneBody = new MeshBuilder3D();
  stoneBody.addBeveledBox(1.15, 0.28, 1.15, 0, 0.14, 0);
  stoneBody.addBeveledBox(0.92, 0.22, 0.92, 0, 0.39, 0);
  stoneBody.addLatheRing(
    [
      [0.42, 0.5],
      [0.36, 0.9],
      [0.44, 1.35],
      [0.38, 1.65],
      [0.48, 1.9],
      [0.36, 2.25],
      [0.01, 2.38],
    ],
    8,
    0,
    Math.PI / 8
  );

  const goldCrest = new MeshBuilder3D();
  goldCrest.addBeveledBox(0.98, 0.14, 0.98, 0, 1.92, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    goldCrest.addPrismCrystal({
      sides: 4,
      radiusBottom: 0.08,
      radiusMid: 0.05,
      heightBody: 0.22,
      heightTip: 0.16,
      offset: [Math.cos(a) * 0.34, 2.1, Math.sin(a) * 0.34],
      tiltZ: -Math.cos(a) * 0.38,
      tiltX: Math.sin(a) * 0.38,
    });
  }

  return buildGLB([
    {
      name: 'IdolStoneBody',
      mesh: stoneBody,
      material: {
        name: 'TempleBasalt',
        baseColor: [0.46, 0.44, 0.4, 1.0],
        metallic: 0.12,
        roughness: 0.68,
      },
    },
    {
      name: 'IdolGoldCrown',
      mesh: goldCrest,
      material: {
        name: 'SacredBronze',
        baseColor: [0.92, 0.7, 0.24, 1.0],
        metallic: 0.85,
        roughness: 0.28,
        emissive: [0.1, 0.06, 0.01],
      },
    },
  ]);
}

function createCrystalClusterGLB() {
  const rockBase = new MeshBuilder3D();
  rockBase.addLatheRing(
    [
      [0.72, -0.08],
      [0.64, 0.14],
      [0.48, 0.28],
      [0.01, 0.32],
    ],
    9,
    0,
    0
  );

  const crystals = new MeshBuilder3D();
  const specs = [
    { h: 1.05, r: 0.22, off: [0, 0.14, 0], tx: 0.04, tz: -0.05 },
    { h: 0.78, r: 0.17, off: [-0.28, 0.1, 0.14], tx: 0.26, tz: 0.32 },
    { h: 0.82, r: 0.18, off: [0.28, 0.1, -0.1], tx: -0.22, tz: -0.34 },
    { h: 0.62, r: 0.15, off: [0.16, 0.08, 0.28], tx: 0.35, tz: -0.18 },
    { h: 0.58, r: 0.14, off: [-0.18, 0.08, -0.26], tx: -0.34, tz: 0.2 },
  ];
  specs.forEach((s, idx) => {
    crystals.addPrismCrystal({
      sides: 6,
      radiusBottom: s.r,
      radiusMid: s.r * 0.82,
      heightBody: s.h,
      heightTip: s.h * 0.38,
      offset: s.off,
      tiltX: s.tx,
      tiltZ: s.tz,
      yaw: idx * 0.7,
    });
  });

  return buildGLB([
    {
      name: 'CrystalRockBase',
      mesh: rockBase,
      material: {
        name: 'ObsidianSocket',
        baseColor: [0.22, 0.24, 0.28, 1.0],
        metallic: 0.15,
        roughness: 0.75,
      },
    },
    {
      name: 'CrystalSpires',
      mesh: crystals,
      material: {
        name: 'RunicQuartz',
        baseColor: [0.2, 0.92, 0.85, 1.0],
        metallic: 0.28,
        roughness: 0.15,
        emissive: [0.06, 0.32, 0.28],
      },
    },
  ]);
}

function createPowerUpCoreGLB() {
  const coreCrystal = new MeshBuilder3D();
  coreCrystal.addPrismCrystal({
    sides: 6,
    radiusBottom: 0.24,
    radiusMid: 0.18,
    heightBody: 0.14,
    heightTip: 0.24,
    offset: [0, 0, 0],
  });
  coreCrystal.addPrismCrystal({
    sides: 6,
    radiusBottom: 0.24,
    radiusMid: 0.18,
    heightBody: 0.14,
    heightTip: 0.24,
    offset: [0, 0, 0],
    tiltX: Math.PI,
  });

  const gyroRings = new MeshBuilder3D();
  gyroRings.addTorusRing(0.42, 0.045, 24, 12, 0.62, 0.48, 0);
  gyroRings.addTorusRing(0.42, 0.045, 24, 12, -0.62, 0.48, 0);
  gyroRings.addBeveledBox(0.14, 0.14, 0.14, 0.44, 0, 0);
  gyroRings.addBeveledBox(0.14, 0.14, 0.14, -0.44, 0, 0);

  return buildGLB([
    {
      name: 'PowerUpCoreCrystal',
      mesh: coreCrystal,
      material: {
        name: 'PowerCoreCrystal',
        baseColor: [0.95, 0.98, 1.0, 1.0],
        metallic: 0.25,
        roughness: 0.12,
        emissive: [0.35, 0.45, 0.55],
      },
    },
    {
      name: 'PowerUpGyroRings',
      mesh: gyroRings,
      material: {
        name: 'SacredBronze',
        baseColor: [0.95, 0.75, 0.24, 1.0],
        metallic: 0.88,
        roughness: 0.24,
        emissive: [0.12, 0.08, 0.02],
      },
    },
  ]);
}

function createGuardianTotemGLB() {
  const stoneBody = new MeshBuilder3D();
  stoneBody.addBeveledBox(1.18, 0.24, 1.18, 0, 0.12, 0);
  stoneBody.addBeveledBox(0.92, 0.22, 0.92, 0, 0.34, 0);
  stoneBody.addLatheRing(
    [
      [0.44, 0.42],
      [0.39, 0.78],
      [0.46, 1.06],
      [0.42, 1.38],
      [0.48, 1.54],
      [0.01, 1.62],
    ],
    8,
    0,
    Math.PI / 8
  );

  const bronzeWings = new MeshBuilder3D();
  bronzeWings.addBeveledBox(1.06, 0.12, 0.98, 0, 1.02, 0);
  bronzeWings.addBeveledBox(0.98, 0.14, 0.92, 0, 1.5, 0);
  for (const side of [-1, 1]) {
    bronzeWings.addPrismCrystal({
      sides: 4,
      radiusBottom: 0.14,
      radiusMid: 0.09,
      heightBody: 0.42,
      heightTip: 0.28,
      offset: [side * 0.42, 1.12, 0],
      tiltZ: -side * 0.62,
      tiltX: -0.15,
    });
  }

  const glowingEyes = new MeshBuilder3D();
  for (const side of [-1, 1]) {
    glowingEyes.addPrismCrystal({
      sides: 4,
      radiusBottom: 0.1,
      radiusMid: 0.06,
      heightBody: 0.06,
      heightTip: 0.09,
      offset: [side * 0.18, 1.24, -0.4],
      tiltX: -Math.PI / 2,
    });
  }
  glowingEyes.addBeveledBox(0.32, 0.14, 0.1, 0, 0.88, -0.42);

  return buildGLB([
    {
      name: 'GuardianTotemStone',
      mesh: stoneBody,
      material: {
        name: 'TempleBasalt',
        baseColor: [0.42, 0.4, 0.38, 1.0],
        metallic: 0.12,
        roughness: 0.72,
      },
    },
    {
      name: 'GuardianTotemBronze',
      mesh: bronzeWings,
      material: {
        name: 'SacredBronze',
        baseColor: [0.95, 0.72, 0.22, 1.0],
        metallic: 0.86,
        roughness: 0.26,
        emissive: [0.1, 0.06, 0.01],
      },
    },
    {
      name: 'GuardianTotemRunes',
      mesh: glowingEyes,
      material: {
        name: 'RunicQuartz',
        baseColor: [1.0, 0.48, 0.14, 1.0],
        metallic: 0.25,
        roughness: 0.18,
        emissive: [0.95, 0.35, 0.08],
      },
    },
  ]);
}

function buildCelestialSpire() {
  const marbleColumn = new MeshBuilder3D();
  // Base ottagonale + colonna scanalata + capitello marmoreo
  marbleColumn.addLatheRing(
    [
      [0.82, -0.05],
      [0.78, 0.25],
      [0.58, 0.42],
      [0.42, 0.65],
      [0.34, 1.55],
      [0.29, 2.55],
      [0.32, 3.35],
      [0.56, 3.62],
      [0.64, 3.82],
      [0.01, 3.88],
    ],
    8,
    0,
    Math.PI / 8
  );
  marbleColumn.addBeveledBox(1.36, 0.22, 1.36, 0, 0.11, 0);
  marbleColumn.addBeveledBox(1.06, 0.16, 1.06, 0, 3.74, 0);

  const goldAstrolabe = new MeshBuilder3D();
  goldAstrolabe.addBeveledBox(1.16, 0.09, 1.16, 0, 3.86, 0);
  goldAstrolabe.addBeveledBox(0.76, 0.1, 0.76, 0, 1.55, 0);
  goldAstrolabe.addTorusRing(0.84, 0.06, 24, 12, 0.55, 0.35, 4.65);
  goldAstrolabe.addTorusRing(0.68, 0.05, 24, 12, -0.65, 0.48, 4.65);

  const aetherCrystal = new MeshBuilder3D();
  aetherCrystal.addPrismCrystal({
    sides: 6,
    radiusBottom: 0.28,
    radiusMid: 0.22,
    heightBody: 0.52,
    heightTip: 0.42,
    offset: [0, 4.55, 0],
  });
  aetherCrystal.addPrismCrystal({
    sides: 6,
    radiusBottom: 0.28,
    radiusMid: 0.22,
    heightBody: 0.4,
    heightTip: 0.34,
    offset: [0, 4.55, 0],
    tiltX: Math.PI,
  });

  return buildGLB([
    {
      name: 'CelestialMarbleBody',
      mesh: marbleColumn,
      material: {
        name: 'TempleBasalt',
        baseColor: [0.88, 0.92, 0.98, 1.0],
        metallic: 0.1,
        roughness: 0.35,
      },
    },
    {
      name: 'CelestialGoldRings',
      mesh: goldAstrolabe,
      material: {
        name: 'GoldSculpted',
        baseColor: [0.98, 0.82, 0.32, 1.0],
        metallic: 0.9,
        roughness: 0.2,
        emissive: [0.14, 0.1, 0.02],
      },
    },
    {
      name: 'CelestialAetherCrystal',
      mesh: aetherCrystal,
      material: {
        name: 'AetherCrystal',
        baseColor: [0.22, 0.74, 0.98, 1.0],
        metallic: 0.2,
        roughness: 0.14,
        emissive: [0.12, 0.45, 0.72],
      },
    },
  ]);
}

function buildDesertObelisk() {
  const sandstoneShaft = new MeshBuilder3D();
  // Plinto a gradoni + fusto piramidale rastremato a 4 facce
  sandstoneShaft.addBeveledBox(1.58, 0.28, 1.58, 0, 0.14, 0);
  sandstoneShaft.addBeveledBox(1.28, 0.26, 1.28, 0, 0.41, 0);
  sandstoneShaft.addLatheRing(
    [
      [0.64, 0.54],
      [0.54, 1.55],
      [0.44, 2.55],
      [0.34, 3.55],
      [0.27, 4.25],
      [0.01, 4.3],
    ],
    4,
    0,
    Math.PI / 4
  );

  const goldBandsAndTip = new MeshBuilder3D();
  goldBandsAndTip.addBeveledBox(0.94, 0.12, 0.94, 0, 1.55, 0);
  goldBandsAndTip.addBeveledBox(0.76, 0.12, 0.76, 0, 2.85, 0);
  goldBandsAndTip.addPrismCrystal({
    sides: 4,
    radiusBottom: 0.28,
    radiusMid: 0.22,
    heightBody: 0.18,
    heightTip: 0.65,
    offset: [0, 4.22, 0],
    yaw: Math.PI / 4,
  });

  const solarCore = new MeshBuilder3D();
  solarCore.addTorusRing(0.56, 0.055, 24, 12, Math.PI / 2, 0, 3.55);
  solarCore.addPrismCrystal({
    sides: 4,
    radiusBottom: 0.16,
    radiusMid: 0.12,
    heightBody: 0.14,
    heightTip: 0.18,
    offset: [0, 3.55, -0.34],
    tiltX: -Math.PI / 2,
  });

  return buildGLB([
    {
      name: 'DesertSandstoneBody',
      mesh: sandstoneShaft,
      material: {
        name: 'TempleBasalt',
        baseColor: [0.85, 0.68, 0.42, 1.0],
        metallic: 0.08,
        roughness: 0.76,
      },
    },
    {
      name: 'DesertGoldTrim',
      mesh: goldBandsAndTip,
      material: {
        name: 'GoldSculpted',
        baseColor: [0.98, 0.78, 0.25, 1.0],
        metallic: 0.88,
        roughness: 0.22,
        emissive: [0.16, 0.1, 0.02],
      },
    },
    {
      name: 'DesertSolarAmber',
      mesh: solarCore,
      material: {
        name: 'SolarAmber',
        baseColor: [0.98, 0.65, 0.15, 1.0],
        metallic: 0.3,
        roughness: 0.16,
        emissive: [0.65, 0.35, 0.05],
      },
    },
  ]);
}

function buildShadowMonolith() {
  const obsidianSpire = new MeshBuilder3D();
  obsidianSpire.addBeveledBox(1.42, 0.3, 1.42, 0, 0.15, 0);
  obsidianSpire.addLatheRing(
    [
      [0.62, 0.3],
      [0.52, 1.25],
      [0.58, 2.1],
      [0.38, 3.05],
      [0.24, 3.95],
      [0.01, 4.35],
    ],
    6,
    0,
    Math.PI / 6
  );

  const eclipseHalo = new MeshBuilder3D();
  eclipseHalo.addTorusRing(0.88, 0.07, 28, 12, Math.PI / 2, 0.22, 3.45);
  eclipseHalo.addBeveledBox(1.12, 0.12, 1.12, 0, 1.25, 0);

  const voidCrystals = new MeshBuilder3D();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    voidCrystals.addPrismCrystal({
      sides: 6,
      radiusBottom: 0.18,
      radiusMid: 0.12,
      heightBody: 0.72,
      heightTip: 0.36,
      offset: [Math.cos(a) * 0.48, 0.42, Math.sin(a) * 0.48],
      tiltZ: -Math.cos(a) * 0.34,
      tiltX: Math.sin(a) * 0.34,
      yaw: a,
    });
  }
  voidCrystals.addPrismCrystal({
    sides: 6,
    radiusBottom: 0.2,
    radiusMid: 0.14,
    heightBody: 0.55,
    heightTip: 0.38,
    offset: [0, 4.45, 0],
  });

  return buildGLB([
    {
      name: 'ShadowObsidianSpire',
      mesh: obsidianSpire,
      material: {
        name: 'ObsidianDark',
        baseColor: [0.16, 0.12, 0.26, 1.0],
        metallic: 0.28,
        roughness: 0.42,
      },
    },
    {
      name: 'ShadowEclipseHalo',
      mesh: eclipseHalo,
      material: {
        name: 'SacredBronze',
        baseColor: [0.46, 0.32, 0.54, 1.0],
        metallic: 0.82,
        roughness: 0.3,
        emissive: [0.08, 0.04, 0.14],
      },
    },
    {
      name: 'ShadowVoidCrystals',
      mesh: voidCrystals,
      material: {
        name: 'VoidCrystal',
        baseColor: [0.75, 0.32, 0.98, 1.0],
        metallic: 0.25,
        roughness: 0.14,
        emissive: [0.48, 0.14, 0.78],
      },
    },
  ]);
}

const outDir = path.resolve(process.cwd(), 'public', 'assets', 'models');
fs.mkdirSync(outDir, { recursive: true });

const files = [
  ['relic_coin.glb', createRelicCoinGLB()],
  ['temple_idol.glb', createTempleIdolGLB()],
  ['crystal_cluster.glb', createCrystalClusterGLB()],
  ['powerup_core.glb', createPowerUpCoreGLB()],
  ['guardian_totem.glb', createGuardianTotemGLB()],
  ['celestial_spire.glb', buildCelestialSpire()],
  ['desert_obelisk.glb', buildDesertObelisk()],
  ['shadow_monolith.glb', buildShadowMonolith()],
];

for (const [filename, buf] of files) {
  const full = path.join(outDir, filename);
  fs.writeFileSync(full, buf);
  console.log(`Generated ${full} (${buf.byteLength} bytes)`);
}

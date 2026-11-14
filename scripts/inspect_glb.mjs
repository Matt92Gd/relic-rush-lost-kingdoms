// Ispeziona un file .glb: nodi, skin, animazioni (nome + durata) e materiali
import { readFileSync } from 'node:fs';

for (const file of process.argv.slice(2)) {
  const buf = readFileSync(file);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const anims = (json.animations || []).map((a) => {
    let maxT = 0;
    for (const s of a.samplers) {
      const acc = json.accessors[s.input];
      if (acc.max) maxT = Math.max(maxT, acc.max[0]);
    }
    return `${a.name}(${maxT.toFixed(2)}s)`;
  });
  console.log(`== ${file}`);
  console.log(`meshes=${(json.meshes || []).length} skins=${(json.skins || []).length} joints=${json.skins?.[0]?.joints.length ?? 0} nodes=${json.nodes.length}`);
  console.log(`mesh names: ${(json.meshes || []).map((m) => m.name).join(', ')}`);
  console.log(`materials: ${(json.materials || []).map((m) => m.name).join(', ')} images=${(json.images || []).length}`);
  console.log(`animations (${anims.length}): ${anims.join(', ')}`);
  const nodeNames = json.nodes.map((n) => n.name);
  console.log(`hand/attach nodes: ${nodeNames.filter((n) => /hand|slot|head|chest/i.test(n || '')).join(', ')}`);
}

// Downloads the background-removal model + ONNX runtime into public/bg-removal so
// the app can run cut-outs entirely self-hosted (no runtime CDN calls).
// Usage: bun scripts/fetch-bg-model.mjs   (or node >= 18)
import { mkdir, writeFile, access, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(join(root, 'node_modules/@imgly/background-removal/package.json'), 'utf8'));
const version = pkg.version;
const base = `https://staticimgly.com/@imgly/background-removal-data/${version}/dist/`;
const outDir = join(root, 'public/bg-removal');
const KEEP = [
  '/models/isnet_fp16',
  '/onnxruntime-web/ort-wasm-simd-threaded.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.mjs',
  '/onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs',
];

const exists = (p) => access(p).then(() => true, () => false);

await mkdir(outDir, { recursive: true });
const all = await (await fetch(base + 'resources.json')).json();
const resources = Object.fromEntries(Object.entries(all).filter(([k]) => KEEP.includes(k)));

for (const [key, res] of Object.entries(resources)) {
  for (const chunk of res.chunks) {
    const dest = join(outDir, chunk.name);
    if (await exists(dest)) continue;
    const r = await fetch(base + chunk.name);
    if (!r.ok) throw new Error(`Failed ${chunk.name}: ${r.status}`);
    await writeFile(dest, Buffer.from(await r.arrayBuffer()));
    process.stdout.write('.');
  }
  console.log(` ${key}`);
}
await writeFile(join(outDir, 'resources.json'), JSON.stringify(resources));
console.log(`bg-removal ${version} assets ready in public/bg-removal`);

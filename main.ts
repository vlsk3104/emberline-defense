// Emberline Defense's entrypoint (Node 22, standard library only). The game
// is this directory's game/ folder: plain static files a desktop browser
// loads offline (game/index.html and its ES modules, no library and no
// network request), and this program hands it in. It copies game/ and
// screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// The build-inventory section below is this entry's own addition: before
// and after the dossier is generated it walks game/, screenshots/ and the
// entry's root files, printing every file's byte size and SHA-256, so a
// plain run proves exactly what was handed in and that a re-run is
// byte-for-byte deterministic.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// ---------------------------------------------------------------------------
// Build inventory (self-authored for Emberline Defense): a deterministic,
// sorted walk of the entry that fingerprints every file it ships.
// ---------------------------------------------------------------------------

/** Every regular file under `dir`, as absolute paths, sorted by path. */
function walkFiles(dir: string): string[] {
  const found: string[] = [];
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkFiles(full));
    else if (entry.isFile()) found.push(full);
  }
  return found.sort();
}

/** One inventory line: relative path, byte size and SHA-256 of the bytes. */
function inventoryLine(root: string, file: string): string {
  const bytes = readFileSync(file);
  const digest = createHash('sha256').update(bytes).digest('hex');
  return `  ${relative(root, file)}  ${bytes.length} bytes  sha256:${digest}`;
}

/** Print the inventory of the source entry (game/, screenshots/, root files). */
function printSourceInventory(label: string): void {
  console.log(`Emberline Defense build inventory (${label}):`);
  const sections: Array<[string, string]> = [
    ['game', join(here, 'game')],
    ['screenshots', join(here, 'screenshots')],
  ];
  let totalFiles = 0;
  let totalBytes = 0;
  for (const [name, dir] of sections) {
    const files = walkFiles(dir);
    console.log(` [${name}/] ${files.length} files`);
    for (const file of files) {
      console.log(inventoryLine(here, file));
      totalFiles += 1;
      totalBytes += statSync(file).size;
    }
  }
  const rootFiles = readdirSync(here, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name !== 'dossier.json')
    .map((e) => join(here, e.name))
    .sort();
  console.log(` [root] ${rootFiles.length} files`);
  for (const file of rootFiles) {
    console.log(inventoryLine(here, file));
    totalFiles += 1;
    totalBytes += statSync(file).size;
  }
  console.log(`  total: ${totalFiles} files, ${totalBytes} bytes`);
}

/** Fingerprint the generated output tree the same way, dossier included. */
function printOutputInventory(): void {
  const files = walkFiles(out);
  console.log(`Generated output inventory (${files.length} files):`);
  for (const file of files) console.log(inventoryLine(out, file));
}

printSourceInventory('before generation');

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

printSourceInventory('after generation');
printOutputInventory();

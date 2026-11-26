// Aurora Run — Sky Courier: the hand-in program (Node 22, standard library
// only). The game itself is plain static files under game/ — an index.html
// that opens in desktop Chrome and plays offline — plus 3 or 4 screenshots
// of the game running, taken by its maker. This program's whole job is to
// gather those two folders from beside itself into the output directory and
// write dossier.json there, the summary the judge reads, using the vendored
// make.fun library. It does nothing else: no network, no build step, no
// generated files, so running it twice writes the same bytes twice.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the folder this file lives in; the output directory
// is /output inside the grader, or wherever MAKEFUN_OUTPUT_DIR points.
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
// game/ is copied whole: index.html, style.css and src/*.js, nothing more.
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
// screenshots/ likewise, if present (it always is in a finished entry).
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps mirror the scorer's own limits, so an entry this program accepts
// is one the scorer accepts: at most 4 screenshots, each at most 256 KiB;
// game/ at most 993 files and directories and 48 MiB in all; no path under
// game/ over 1000 bytes; and the dossier text capped at 160 KiB, so the
// judge's outline stays readable. buildDossier writes the dossier byte for
// byte from the copied files, which is what the gate compares against.
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

// Baut die Web-Oberfläche nach web/dist: Bibliothek bündeln, Beispielrahmen in die Seite einsetzen.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';

mkdirSync('web/dist', { recursive: true });
await build({ entryPoints: ['src/index.ts'], bundle: true, format: 'esm', outfile: 'web/dist/bikegeo.js', target: 'es2022' });
const frames = readFileSync('src/data/frames.example.json', 'utf8');
const html = readFileSync('web/index.html', 'utf8').replace('/*__FRAMES__*/[]', frames.trim());
writeFileSync('web/dist/index.html', html);
copyFileSync('web/fitting.js', 'web/dist/fitting.js');
console.log('web/dist gebaut');

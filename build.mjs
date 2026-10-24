// Construit l'appli LG webOS : interface Ciné (version « appli », serveur au choix) + fichiers webOS → .ipk
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cine = path.resolve(here, '..', 'cine-web');
const app = path.join(here, 'app');
const KEEP = new Set(['appinfo.json', 'icon.png', 'largeIcon.png', 'splash.png', 'banner.png']);

execSync('npm run build:app', { cwd: cine, stdio: 'inherit' });

// Remplace l'interface dans le dossier de l'appli (les fichiers propres à webOS restent).
for (const f of fs.readdirSync(app)) if (!KEEP.has(f)) fs.rmSync(path.join(app, f), { recursive: true, force: true });
for (const f of fs.readdirSync(path.join(cine, 'dist-app'))) {
  if (f === 'apps' || f === 'manifest.webmanifest') continue;
  fs.cpSync(path.join(cine, 'dist-app', f), path.join(app, f), { recursive: true });
}

// Ouverte depuis les fichiers de l'appli (file://) : pas d'attribut « crossorigin » (il bloquerait le
// chargement), pas de manifeste web.
const index = path.join(app, 'index.html');
fs.writeFileSync(
  index,
  fs.readFileSync(index, 'utf8').replace(/ crossorigin(="[^"]*")?/g, '').replace(/\s*<link rel="manifest"[^>]*>/, ''),
);

// Même numéro de version que Ciné.
const version = JSON.parse(fs.readFileSync(path.join(cine, 'package.json'), 'utf8')).version;
const info = JSON.parse(fs.readFileSync(path.join(app, 'appinfo.json'), 'utf8'));
info.version = version;
fs.writeFileSync(path.join(app, 'appinfo.json'), JSON.stringify(info, null, 2) + '\n');

fs.rmSync(path.join(here, 'dist'), { recursive: true, force: true });
execSync('npx ares-package app -o dist', { cwd: here, stdio: 'inherit' });
console.log(`\nAppli LG prête : dist/${info.id}_${version}_all.ipk`);

// Copies the single-file build into docs/ so GitHub Pages always serves the
// latest game at a permanent URL (no sandbox required).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const docs = path.join(root, 'docs');
fs.mkdirSync(docs, { recursive: true });
for (const f of ['index.html', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest']) {
  if (fs.existsSync(path.join(dist, f))) fs.copyFileSync(path.join(dist, f), path.join(docs, f));
}
fs.writeFileSync(path.join(docs, '.nojekyll'), '');
console.log('✔ docs/ updated for GitHub Pages');

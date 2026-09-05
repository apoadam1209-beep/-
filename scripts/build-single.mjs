// Post-build step: fold the CSS and the JS bundle straight into index.html so
// the game is one self-contained file. No separate asset requests can fail,
// and the result can be opened offline by double-clicking it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

// --- inline the stylesheet --------------------------------------------------
html = html.replace(/<link[^>]+rel="stylesheet"[^>]+href="\.?\/?(assets\/[^"]+\.css)"[^>]*>/g, (_m, href) => {
  const css = fs.readFileSync(path.join(dist, href), 'utf8');
  return `<style>\n${css}\n</style>`;
});

// --- inline the module bundle -----------------------------------------------
html = html.replace(/<script[^>]+type="module"[^>]+src="\.?\/?(assets\/[^"]+\.js)"[^>]*><\/script>/g, (_m, src) => {
  const js = fs.readFileSync(path.join(dist, src), 'utf8');
  return `<script type="module">\n${js}\n</script>`;
});

// --- inline the app icon so the single file needs nothing else ---------------
const iconPath = path.join(dist, 'icon-192.png');
if (fs.existsSync(iconPath)) {
  const dataUri = `data:image/png;base64,${fs.readFileSync(iconPath).toString('base64')}`;
  html = html.replace(/href="\.?\/?icon-512\.png"/g, `href="${dataUri}"`);
}

// --- last-resort styling if anything above ever fails ------------------------
const guard = `<style id="boot-guard">
  .hidden{display:none!important}
  html,body{margin:0;height:100%;background:#04060f;color:#eaf6ff;overflow:hidden;font-family:system-ui,sans-serif}
  #game-canvas{position:absolute;inset:0;width:100%;height:100%}
  #hud,.screen{position:absolute;inset:0}
</style>`;
html = html.replace('</head>', `${guard}\n</head>`);

// --- noscript / failure notice ----------------------------------------------
html = html.replace('</body>', `<noscript><div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#04060f;color:#fff;font:600 18px system-ui;text-align:center;padding:24px;z-index:999">XENO RUN needs JavaScript enabled.</div></noscript>
</body>`);

fs.writeFileSync(path.join(dist, 'index.html'), html);
fs.writeFileSync(path.join(root, 'xeno-run.html'), html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`✔ single-file build: dist/index.html and xeno-run.html (${kb} kB, zero external requests)`);

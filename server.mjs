import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const port = Number(process.env.PORT || 5173);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  res.setHeader("Cache-Control", "no-store");

  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const rel = urlPath === "/" ? "/index.html" : urlPath;
  const file = path.join(root, path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, ""));

  const send = (status, body, type) => {
    res.statusCode = status;
    res.setHeader("Content-Type", type);
    res.end(body);
  };

  fs.readFile(file, (err, data) => {
    if (!err) {
      send(200, data, mime[path.extname(file)] || "application/octet-stream");
      return;
    }
    fs.readFile(path.join(root, "index.html"), (err2, html) => {
      if (err2) {
        send(404, "not found", "text/plain; charset=utf-8");
        return;
      }
      send(200, html, "text/html; charset=utf-8");
    });
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`رنين البلّور listening on 0.0.0.0:${port}`);
});

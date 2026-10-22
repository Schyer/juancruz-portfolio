// Servidor para probar el sitio y el panel en tu compu: `npm run dev` → http://localhost:3000
// Usa los mismos archivos de /api que corren en Vercel, pero guarda todo en .local-blob/
import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 3000);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".ico": "image/x-icon"
};

async function serveStatic(req, res, pathname) {
  let file = path.join(ROOT, decodeURIComponent(pathname));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    let st = await fs.stat(file);
    if (st.isDirectory()) { file = path.join(file, "index.html"); st = await fs.stat(file); }
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range;
    if (range && type.startsWith("video/")) {
      const [s, e] = range.replace("bytes=", "").split("-");
      const start = Number(s), end = e ? Number(e) : st.size - 1;
      res.writeHead(206, { "content-type": type, "content-range": `bytes ${start}-${end}/${st.size}`, "accept-ranges": "bytes", "content-length": end - start + 1 });
      const fh = await fs.open(file);
      return Readable.from(fh.createReadStream({ start, end })).pipe(res);
    }
    res.writeHead(200, { "content-type": type, "content-length": st.size, "accept-ranges": "bytes" });
    (await fs.open(file)).createReadStream().pipe(res);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("No encontrado");
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const m = url.pathname.match(/^\/api\/([a-z0-9-]+)$/i);
  if (!m) return serveStatic(req, res, url.pathname);
  try {
    const mod = await import(pathToFileURL(path.join(ROOT, "api", `${m[1]}.js`)).href);
    const handler = mod[req.method];
    if (!handler) return res.writeHead(405).end();
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : Readable.toWeb(req),
      duplex: "half"
    });
    const response = await handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error(e);
    res.writeHead(e.code === "ERR_MODULE_NOT_FOUND" ? 404 : 500).end(String(e.message));
  }
}).listen(PORT, () => console.log(`Sitio: http://localhost:${PORT}  ·  Panel: http://localhost:${PORT}/admin  (contraseña de prueba: juan2026)`));

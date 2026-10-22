// Almacenamiento del contenido y los archivos que sube Juan.
// - En Vercel: usa Vercel Blob (necesita la variable BLOB_READ_WRITE_TOKEN, que se crea sola al conectar el Blob store).
// - En tu compu (npm run dev): guarda todo en la carpeta .local-blob para poder probar sin cuenta.
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const mode = process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local";
const LOCAL_DIR = path.join(process.cwd(), ".local-blob");
const KEEP_VERSIONS = 3; // versiones anteriores del contenido que se guardan por las dudas

export async function readContent() {
  if (mode === "local") {
    try {
      return JSON.parse(await fs.readFile(path.join(LOCAL_DIR, "content.json"), "utf8"));
    } catch {
      return null;
    }
  }
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: "data/content-" });
  if (!blobs.length) return null;
  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const r = await fetch(blobs[0].url, { cache: "no-store" });
  return r.ok ? r.json() : null;
}

export async function writeContent(data) {
  const body = JSON.stringify(data);
  if (mode === "local") {
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_DIR, "content.json"), body);
    return;
  }
  const { put, list, del } = await import("@vercel/blob");
  // Cada guardado es un archivo nuevo (evita el caché de la CDN); se borran los más viejos
  await put(`data/content-${Date.now()}.json`, body, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: true
  });
  const { blobs } = await list({ prefix: "data/content-" });
  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const old = blobs.slice(KEEP_VERSIONS).map((b) => b.url);
  if (old.length) await del(old);
}

// Solo se borran archivos subidos desde el panel (carpeta uploads/), nunca los del sitio
export function isUploadedFile(url) {
  if (typeof url !== "string") return false;
  if (mode === "local") return url.startsWith("/.local-blob/uploads/");
  return /^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\/uploads\//i.test(url);
}

export async function deleteFiles(urls) {
  const targets = urls.filter(isUploadedFile);
  if (!targets.length) return;
  if (mode === "local") {
    await Promise.all(
      targets.map((u) => fs.unlink(path.join(LOCAL_DIR, "uploads", path.basename(u))).catch(() => {}))
    );
    return;
  }
  const { del } = await import("@vercel/blob");
  await del(targets);
}

// Solo para modo local: guarda el archivo y devuelve su URL
export async function saveLocalFile(filename, buffer) {
  const dir = path.join(LOCAL_DIR, "uploads");
  await fs.mkdir(dir, { recursive: true });
  const safe = filename.replace(/[^a-z0-9._-]/gi, "-").slice(-80);
  const name = `${crypto.randomBytes(6).toString("hex")}-${safe}`;
  await fs.writeFile(path.join(dir, name), buffer);
  return `/.local-blob/uploads/${name}`;
}

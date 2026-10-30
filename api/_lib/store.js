// Almacenamiento del contenido y los archivos que sube Juan.
// - En Vercel: usa Cloudflare R2 (variables R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET y R2_PUBLIC_URL).
// - En tu compu (npm run dev): guarda todo en la carpeta .local-blob para poder probar sin cuenta.
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { r2Configured, publicBase, getObject, putObject, deleteObject } from "./r2.js";

export const mode = r2Configured() ? "r2" : "local";
const LOCAL_DIR = path.join(process.cwd(), ".local-blob");
const CONTENT_KEY = "data/content.json";

export async function readContent() {
  if (mode === "local") {
    try {
      return JSON.parse(await fs.readFile(path.join(LOCAL_DIR, "content.json"), "utf8"));
    } catch {
      return null;
    }
  }
  const txt = await getObject(CONTENT_KEY);
  return txt ? JSON.parse(txt) : null;
}

export async function writeContent(data) {
  const body = JSON.stringify(data);
  if (mode === "local") {
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_DIR, "content.json"), body);
    return;
  }
  await putObject(CONTENT_KEY, body, "application/json");
}

// Solo se borran archivos subidos desde el panel (carpeta uploads/), nunca los del sitio
export function isUploadedFile(url) {
  if (typeof url !== "string") return false;
  if (mode === "local") return url.startsWith("/.local-blob/uploads/");
  return url.startsWith(publicBase() + "/uploads/");
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
  await Promise.all(
    targets.map((u) => deleteObject(decodeURIComponent(u.slice(publicBase().length + 1))).catch(() => {}))
  );
}

// Nombre único para un archivo nuevo (carpeta uploads/)
export function newUploadKey(filename) {
  const safe = String(filename || "archivo").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-70) || "archivo";
  return `uploads/${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safe}`;
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

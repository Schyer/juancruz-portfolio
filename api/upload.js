// POST /api/upload → permite que el panel suba videos e imágenes
// - Cloudflare R2: devuelve un link temporal y el navegador sube el archivo directo (no pasa por la función).
// - Local: el archivo llega en el cuerpo del pedido.
import { isAuthorized, expectedPassword, json, missingConfig } from "./_lib/auth.js";
import { mode, saveLocalFile, newUploadKey } from "./_lib/store.js";
import { presignPut, publicBase, encodeKey } from "./_lib/r2.js";

const ALLOWED = ["video/mp4", "video/quicktime", "video/webm", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB por archivo

export async function POST(request) {
  if (!expectedPassword()) return missingConfig();
  if (!(await isAuthorized(request))) return json({ error: "Contraseña incorrecta." }, 401);

  if (mode === "local") {
    const type = request.headers.get("content-type") || "";
    if (!ALLOWED.includes(type.split(";")[0])) return json({ error: "Formato no permitido." }, 415);
    const buf = Buffer.from(await request.arrayBuffer());
    if (buf.length > MAX_BYTES) return json({ error: "El archivo supera los 500 MB." }, 413);
    const name = decodeURIComponent(request.headers.get("x-filename") || "archivo");
    return json({ url: await saveLocalFile(name, buf) });
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: "Datos inválidos." }, 400); }
  const type = String(body?.type || "").split(";")[0];
  if (!ALLOWED.includes(type)) return json({ error: "Formato no permitido." }, 415);
  if (Number(body?.size) > MAX_BYTES) return json({ error: "El archivo supera los 500 MB." }, 413);
  const key = newUploadKey(body?.filename);
  return json({ uploadUrl: presignPut(key), url: `${publicBase()}/${encodeKey(key)}`, contentType: type });
}

// POST /api/upload → permite que el panel suba videos e imágenes directo a Vercel Blob
// (los archivos no pasan por la función, así no hay límite de 4,5 MB)
import { isAuthorized, expectedPassword, json, missingConfig } from "./_lib/auth.js";
import { mode, saveLocalFile } from "./_lib/store.js";

const ALLOWED = ["video/mp4", "video/quicktime", "video/webm", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB por archivo

export async function POST(request) {
  if (!expectedPassword()) return missingConfig();

  // Modo local: el archivo llega directo en el cuerpo
  if (mode === "local") {
    if (!(await isAuthorized(request))) return json({ error: "Contraseña incorrecta." }, 401);
    const type = request.headers.get("content-type") || "";
    if (!ALLOWED.includes(type.split(";")[0])) return json({ error: "Formato no permitido." }, 415);
    const buf = Buffer.from(await request.arrayBuffer());
    if (buf.length > MAX_BYTES) return json({ error: "El archivo supera los 500 MB." }, 413);
    const name = decodeURIComponent(request.headers.get("x-filename") || "archivo");
    return json({ url: await saveLocalFile(name, buf) });
  }

  // Vercel Blob: se genera un token de subida solo si la contraseña es correcta
  const { handleUpload } = await import("@vercel/blob/client");
  let body;
  try { body = await request.json(); } catch { return json({ error: "Datos inválidos." }, 400); }
  if (body?.type === "blob.generate-client-token" && !(await isAuthorized(request))) {
    return json({ error: "Contraseña incorrecta." }, 401);
  }
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("uploads/")) throw new Error("Ruta no permitida");
        return { allowedContentTypes: ALLOWED, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true };
      }
    });
    return json(result);
  } catch (e) {
    return json({ error: e.message || "No se pudo subir el archivo." }, 400);
  }
}

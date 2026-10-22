import { createHash, timingSafeEqual } from "node:crypto";
import { mode } from "./store.js";

// Contraseña del panel: variable de entorno ADMIN_PASSWORD en Vercel.
// En modo local (sin Vercel) la contraseña de prueba es "juan2026".
export function expectedPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return mode === "local" ? "juan2026" : null;
}

export function passwordFrom(request) {
  const h = request.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}

const hash = (s) => createHash("sha256").update(String(s)).digest();

export async function isAuthorized(request) {
  const expected = expectedPassword();
  const given = passwordFrom(request);
  if (!expected || !given) return false;
  const ok = timingSafeEqual(hash(given), hash(expected));
  if (!ok) await new Promise((r) => setTimeout(r, 700)); // frena intentos por fuerza bruta
  return ok;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export function missingConfig() {
  return json({ error: "Falta configurar ADMIN_PASSWORD en Vercel (Settings → Environment Variables)." }, 500);
}

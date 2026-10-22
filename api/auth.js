// POST /api/auth → valida la contraseña del panel
import { isAuthorized, expectedPassword, json, missingConfig } from "./_lib/auth.js";
import { mode } from "./_lib/store.js";

export async function POST(request) {
  if (!expectedPassword()) return missingConfig();
  if (!(await isAuthorized(request))) return json({ error: "Contraseña incorrecta." }, 401);
  return json({ ok: true, storage: mode });
}

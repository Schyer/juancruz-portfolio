// GET /api/content → contenido que cargó Juan desde el panel (o {} si todavía no cargó nada)
import { readContent } from "./_lib/store.js";
import { json } from "./_lib/auth.js";

export async function GET() {
  try {
    return json((await readContent()) || {});
  } catch (e) {
    console.error(e);
    return json({}, 200);
  }
}

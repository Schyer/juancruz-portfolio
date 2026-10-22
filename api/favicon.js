// GET /api/favicon                     → favicon SVG con el color principal elegido en el panel
// GET /api/favicon?format=png&size=180 → PNG (ícono del celular); size: 32, 180 o 192
import { readContent } from "./_lib/store.js";
import { svg, png } from "./_lib/logo.js";

const DEFAULT = "#0404E2";
// 5 minutos de caché: después de publicar un color nuevo, el favicon se actualiza solo
const CACHE = "public, max-age=300, s-maxage=300, stale-while-revalidate=86400";

export async function GET(request) {
  let color = DEFAULT;
  try {
    const c = await readContent();
    if (c?.theme?.primary && /^#[0-9a-f]{6}$/i.test(c.theme.primary)) color = c.theme.primary;
  } catch {}
  const url = new URL(request.url);
  if (url.searchParams.get("format") === "png") {
    const size = [32, 180, 192].includes(Number(url.searchParams.get("size"))) ? Number(url.searchParams.get("size")) : 180;
    return new Response(png(color, size, size < 100), { headers: { "content-type": "image/png", "cache-control": CACHE } });
  }
  return new Response(svg(color), { headers: { "content-type": "image/svg+xml", "cache-control": CACHE } });
}

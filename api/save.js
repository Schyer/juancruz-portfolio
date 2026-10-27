// POST /api/save → guarda el contenido (videos, etiquetas, descripciones) y limpia archivos que ya no se usan
import { isAuthorized, expectedPassword, json, missingConfig } from "./_lib/auth.js";
import { readContent, writeContent, deleteFiles } from "./_lib/store.js";

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const url = (v) => {
  const s = str(v, 600);
  return /^(https:\/\/|\/?media\/|\/\.local-blob\/)/.test(s) ? s : "";
};
const RATIOS = ["16/9", "9/16", "1/1", "4/5"];

function clean(input) {
  const out = {};
  if (input.hero) {
    out.hero = { video: url(input.hero.video), poster: url(input.hero.poster) };
  }
  if (input.showreel) {
    out.showreel = {
      video: url(input.showreel.video),
      poster: url(input.showreel.poster),
      label: str(input.showreel.label, 80),
      linked: input.showreel.linked === true
    };
  }
  if (input.theme) {
    const hex = (v) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : null);
    const t = { primary: hex(input.theme.primary), deep: hex(input.theme.deep), light: hex(input.theme.light) };
    if (t.primary && t.deep && t.light) {
      out.theme = t;
      // colores del tema oscuro (opcionales)
      const dark = { darkBg: hex(input.theme.darkBg), darkInk: hex(input.theme.darkInk), darkAccent: hex(input.theme.darkAccent) };
      if (dark.darkBg && dark.darkInk && dark.darkAccent) Object.assign(out.theme, dark);
    }
  }
  if (input.contact) {
    const email = str(input.contact.email, 120);
    out.contact = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
      whatsapp: { display: str(input.contact.whatsapp, 30), message: str(input.contact.message, 300) }
    };
  }
  const cleanList = (list) => list.slice(0, 40).map((w) => ({
      title: str(w.title, 120),
      text: str(w.text, 600),
      tags: (Array.isArray(w.tags) ? w.tags : []).map((t) => str(t, 40)).filter(Boolean).slice(0, 8),
      year: str(w.year, 12),
      video: url(w.video),
      poster: url(w.poster),
      ratio: RATIOS.includes(w.ratio) ? w.ratio : "16/9"
    })).filter((w) => w.video);
  if (Array.isArray(input.works)) out.works = cleanList(input.works);
  if (Array.isArray(input.reels)) out.reels = cleanList(input.reels);
  return out;
}

const urlsIn = (c) => {
  if (!c) return [];
  const list = [c.hero?.video, c.hero?.poster, c.showreel?.video, c.showreel?.poster];
  [...(c.works || []), ...(c.reels || [])].forEach((w) => list.push(w.video, w.poster));
  return list.filter(Boolean);
};

export async function POST(request) {
  if (!expectedPassword()) return missingConfig();
  if (!(await isAuthorized(request))) return json({ error: "Contraseña incorrecta." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Datos inválidos." }, 400); }
  const next = clean(body || {});
  const prev = await readContent().catch(() => null);
  await writeContent({ ...next, updatedAt: new Date().toISOString() });
  // Archivos subidos que dejaron de usarse (video reemplazado o trabajo eliminado)
  const keep = new Set(urlsIn(next));
  const extra = Array.isArray(body.discard) ? body.discard : [];
  await deleteFiles([...urlsIn(prev), ...extra].filter((u) => !keep.has(u))).catch((e) => console.error(e));
  return json({ ok: true, content: next });
}

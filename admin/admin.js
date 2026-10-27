// Panel de contenido — Juan Cruz
const $ = (s, r = document) => r.querySelector(s);
const MAX_MB = 500;
const BLOB_CLIENT = "https://esm.sh/@vercel/blob@2.8.0/client";

let password = "";
let storage = "local";
let state = { hero: {}, showreel: {}, works: [], reels: [], contact: {}, theme: {}, sections: {} };
const DEFAULT_SECTIONS = { reels: "Content (YT Shorts / TT / Reels)", works: "Content (16:9)" };
const LISTS = {
  works: { box: "#works", empty: "Todavía no hay trabajos horizontales. Agregá el primero con el botón de abajo.", item: "trabajo" },
  reels: { box: "#reels", empty: "Todavía no hay reels. Agregá el primero con el botón de abajo.", item: "reel" }
};
const isVerticalRatio = (r) => r === "9/16" || r === "4/5";
const DEFAULT_THEME = { primary: "#0404E2", deep: "#0303B5", light: "#4040FB", darkBg: "#05052E", darkInk: "#F5F5FA", darkAccent: "#7B7BFF" };
let dirty = false;
let uploading = 0;
const sessionUploads = new Set(); // archivos subidos en esta sesión (para limpiar los que no se usen)

/* ---------- utilidades ---------- */
const src = (u) => (!u ? "" : /^(https?:|\/|blob:)/.test(u) ? u : "/" + u);
const ss = {
  get: (k) => { try { return sessionStorage.getItem(k) || ""; } catch { return ""; } },
  set: (k, v) => { try { v ? sessionStorage.setItem(k, v) : sessionStorage.removeItem(k); } catch {} }
};
let toastTimer;
function toast(msg, error = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.toggle("error", error);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}
function setDirty(v = true) { dirty = v; updateBar(); }
function updateBar() {
  const bar = $(".bar"), btn = $("#publish"), st = $("#status");
  bar.classList.toggle("is-dirty", dirty);
  bar.classList.toggle("is-busy", uploading > 0);
  if (uploading > 0) st.textContent = uploading === 1 ? "Subiendo 1 archivo…" : `Subiendo ${uploading} archivos…`;
  else st.textContent = dirty ? "Tenés cambios sin publicar" : "Todo publicado";
  btn.disabled = !dirty || uploading > 0;
}
addEventListener("beforeunload", (e) => { if (dirty || uploading) { e.preventDefault(); e.returnValue = ""; } });

async function api(path, opts = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: { "content-type": "application/json", authorization: `Bearer ${password}`, ...(opts.headers || {}) }
  });
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error(data.error || `Error ${r.status}`), { status: r.status });
  return data;
}

/* ---------- login ---------- */
async function login(pw, silent = false) {
  password = pw;
  try {
    const res = await api("/api/auth", { method: "POST" });
    storage = res.storage;
    ss.set("jc-pw", pw);
    $("#login").hidden = true;
    $("#app").hidden = false;
    await loadContent();
  } catch (e) {
    password = "";
    ss.set("jc-pw", "");
    if (!silent) $("#loginError").textContent = e.status === 401 ? "La contraseña no es correcta." : e.message;
  }
}
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#loginBtn");
  btn.disabled = true; btn.textContent = "Entrando…";
  $("#loginError").textContent = "";
  await login($("#pw").value);
  btn.disabled = false; btn.textContent = "Entrar";
});
$("#logout").addEventListener("click", () => {
  if (dirty && !confirmInline()) return;
  ss.set("jc-pw", "");
  location.reload();
});
function confirmInline() {
  // sin diálogos del navegador: se avisa y se pide un segundo click
  const b = $("#logout");
  if (b.dataset.armed) return true;
  b.dataset.armed = "1";
  b.textContent = "¿Salir sin publicar?";
  setTimeout(() => { delete b.dataset.armed; b.textContent = "Salir"; }, 3000);
  return false;
}

/* ---------- carga del contenido ---------- */
async function loadContent() {
  const d = window.SITE || {};
  let remote = {};
  try { remote = await (await fetch("/api/content", { cache: "no-store" })).json(); } catch {}
  state = {
    hero: { ...(d.hero || {}), ...(remote.hero?.video ? remote.hero : {}) },
    showreel: { ...(d.showreel || {}), ...(remote.showreel?.video ? remote.showreel : {}) },
    works: Array.isArray(remote.works) && (remote.works.length || Array.isArray(remote.reels)) ? remote.works : structuredClone(d.works || []),
    reels: Array.isArray(remote.reels) ? remote.reels : [],
    sections: { ...DEFAULT_SECTIONS, ...(d.sections || {}), ...(remote.sections || {}) },
    contact: {
      email: remote.contact?.email || d.email || "",
      whatsapp: remote.contact?.whatsapp?.display || d.whatsapp?.display || "",
      message: remote.contact?.message ?? d.whatsapp?.message ?? ""
    },
    theme: { ...DEFAULT_THEME, ...(d.theme || {}), ...(remote.theme || {}) }
  };
  if (typeof state.showreel.linked !== "boolean") state.showreel.linked = state.hero.video === state.showreel.video;
  // datos viejos: los videos verticales que estaban en trabajos pasan a la sección Reels
  state.reels.push(...state.works.filter((w) => isVerticalRatio(w.ratio)));
  state.works = state.works.filter((w) => !isVerticalRatio(w.ratio));
  renderSlots();
  renderWorks();
  $("#nameReels").value = state.sections.reels || "";
  $("#nameWorks").value = state.sections.works || "";
  renderContact();
  renderColors();
  refreshLogo();
  setDirty(false);
}

/* ---------- videos principales ---------- */
function setSlotVideo(slotId, url) {
  const v = $(`#${slotId} video`);
  if (v.getAttribute("src") !== src(url)) { v.src = src(url); v.play().catch(() => {}); }
}
function renderSlots() {
  // si está vinculado, el showreel siempre usa el mismo video que el inicio
  if (state.showreel.linked) state.showreel = { ...state.showreel, video: state.hero.video, poster: state.hero.poster };
  setSlotVideo("slotHero", state.hero.video);
  setSlotVideo("slotShowreel", state.showreel.video);
  $("#sameVideo").checked = !!state.showreel.linked;
  $("#srLabel").value = state.showreel.label || "";
}
$("#srLabel").addEventListener("input", (e) => { state.showreel.label = e.target.value; setDirty(); });
$("#sameVideo").addEventListener("change", (e) => {
  state.showreel.linked = e.target.checked;
  renderSlots();
  setDirty();
  if (!e.target.checked) toast("Listo. Ahora tocá \"Cambiar video\" en el showreel para elegir otro.");
});

/* ---------- colores ---------- */
// Recarga la "JC" del panel con el color guardado (evita que el navegador muestre una vieja)
function refreshLogo() {
  const v = (state.theme.primary || "").slice(1);
  document.querySelectorAll('img[src^="/api/favicon"]').forEach((i) => (i.src = `/api/favicon?v=${v}`));
  const l = document.querySelector('link[rel="icon"]');
  if (l) l.href = `/api/favicon?v=${v}`;
}
const COLOR_KEYS = { colPrimary: "primary", colDeep: "deep", colLight: "light", colDarkBg: "darkBg", colDarkInk: "darkInk", colDarkAccent: "darkAccent" };
const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v);
function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function renderColors() {
  Object.entries(COLOR_KEYS).forEach(([id, key]) => {
    $("#" + id).value = state.theme[key].toLowerCase();
    $(`.hex[data-for=${id}]`).value = state.theme[key].toUpperCase();
  });
  const pv = $("#colPreview").style;
  pv.setProperty("--p", state.theme.primary);
  pv.setProperty("--d", state.theme.deep);
  pv.setProperty("--l", state.theme.light);
  // contraste del principal contra el fondo del sitio (#F3F3EF)
  const ratio = (luminance("#F3F3EF") + 0.05) / (luminance(state.theme.primary) + 0.05);
  $("#colWarn").hidden = ratio >= 3;
  // tema oscuro
  const t = state.theme;
  const dv = $("#colPreviewDark").style;
  dv.setProperty("--bgd", t.darkBg);
  dv.setProperty("--ink-d", t.darkInk);
  dv.setProperty("--acc", t.darkAccent);
  dv.setProperty("--on-acc", luminance(t.darkAccent) > 0.35 ? t.darkBg : "#FFFFFF");
  const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const warns = [];
  if (contrast(t.darkInk, t.darkBg) < 4.5) warns.push("El texto se lee poco sobre el fondo oscuro.");
  if (contrast(t.darkAccent, t.darkBg) < 3) warns.push("El acento se lee poco sobre el fondo oscuro. Probá uno más claro.");
  $("#colWarnDark").textContent = warns.join(" ");
  $("#colWarnDark").hidden = !warns.length;
}
Object.entries(COLOR_KEYS).forEach(([id, key]) => {
  $("#" + id).addEventListener("input", (e) => { state.theme[key] = e.target.value.toUpperCase(); renderColors(); setDirty(); });
  const hex = $(`.hex[data-for=${id}]`);
  hex.addEventListener("input", () => {
    let v = hex.value.trim();
    if (v && v[0] !== "#") v = "#" + v;
    if (isHex(v)) { state.theme[key] = v.toUpperCase(); renderColors(); setDirty(); }
  });
  hex.addEventListener("blur", () => { hex.value = state.theme[key].toUpperCase(); });
});
$("#colReset").addEventListener("click", () => { state.theme = { ...DEFAULT_THEME }; renderColors(); setDirty(); });

/* ---------- nombres de las secciones ---------- */
[["nameReels", "reels"], ["nameWorks", "works"]].forEach(([id, key]) => {
  $("#" + id).addEventListener("input", (e) => { state.sections[key] = e.target.value; setDirty(); });
  $("#" + id).addEventListener("blur", (e) => {
    if (!e.target.value.trim()) { state.sections[key] = DEFAULT_SECTIONS[key]; e.target.value = DEFAULT_SECTIONS[key]; }
  });
});

/* ---------- contacto ---------- */
function renderContact() {
  $("#cEmail").value = state.contact.email || "";
  $("#cPhone").value = state.contact.whatsapp || "";
  $("#cMsg").value = state.contact.message || "";
  updateWaPreview();
}
function updateWaPreview() {
  const digits = (state.contact.whatsapp || "").replace(/\D/g, "");
  const link = $("#cWaTest");
  link.href = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(state.contact.message || "")}` : "#";
  link.hidden = !digits;
}
[["cEmail", "email"], ["cPhone", "whatsapp"], ["cMsg", "message"]].forEach(([id, key]) => {
  $("#" + id).addEventListener("input", (e) => { state.contact[key] = e.target.value; updateWaPreview(); setDirty(); });
});

/* ---------- elegir y subir archivos ---------- */
function pickVideo() {
  return new Promise((resolve) => {
    const inp = $("#filePick");
    inp.value = "";
    inp.onchange = () => resolve(inp.files[0] || null);
    inp.click();
  });
}

function checkFile(file) {
  if (!file) return false;
  if (!file.type.startsWith("video/")) { toast("Elegí un archivo de video (MP4, MOV o WEBM).", true); return false; }
  if (file.size > MAX_MB * 1024 * 1024) { toast(`El video pesa más de ${MAX_MB} MB. Exportalo más liviano y probá de nuevo.`, true); return false; }
  return true;
}

// Saca un cuadro del video para usarlo como portada y detecta si es vertical
// Dibuja el cuadro actual del video (lado más largo: 1280 px)
function frameToCanvas(v) {
  const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
  const cv = document.createElement("canvas");
  cv.width = Math.round(v.videoWidth * scale);
  cv.height = Math.round(v.videoHeight * scale);
  cv.getContext("2d").drawImage(v, 0, 0, cv.width, cv.height);
  return cv;
}
// Brillo promedio de un cuadro (para no elegir portadas negras de un fundido)
function brightness(cv) {
  const s = document.createElement("canvas");
  s.width = 32; s.height = 32;
  const c = s.getContext("2d");
  c.drawImage(cv, 0, 0, 32, 32);
  const d = c.getImageData(0, 0, 32, 32).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
  return sum / (d.length / 4);
}
const ratioOf = (v) => {
  const r = v.videoWidth / v.videoHeight;
  return r < 0.7 ? "9/16" : r < 0.9 ? "4/5" : r < 1.15 ? "1/1" : "16/9";
};
const seekTo = (v, t) => new Promise((res) => { v.onseeked = () => res(); v.currentTime = t; });

// Saca una portada del video: prueba varios momentos y se queda con el primero que no sea oscuro
function makePoster(file) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto";
    v.src = URL.createObjectURL(file);
    const timer = setTimeout(() => resolve(null), 20000);
    v.onerror = () => { clearTimeout(timer); resolve(null); };
    v.onloadedmetadata = async () => {
      const d = v.duration || 4;
      let best = null, bestB = -1;
      for (const f of [0.2, 0.35, 0.5, 0.1, 0.65]) {
        await seekTo(v, d * f);
        const cv = frameToCanvas(v), b = brightness(cv);
        if (b > bestB) { best = cv; bestB = b; }
        if (b > 35) break;
      }
      clearTimeout(timer);
      best.toBlob((blob) => resolve(blob ? { blob, ratio: ratioOf(v), preview: v.src } : null), "image/jpeg", 0.82);
    };
  });
}

const safeName = (n) => n.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-60) || "archivo";

async function uploadFile(file, name, onProgress) {
  if (storage === "local") {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open("POST", "/api/upload");
      x.setRequestHeader("authorization", `Bearer ${password}`);
      x.setRequestHeader("content-type", file.type || "application/octet-stream");
      x.setRequestHeader("x-filename", encodeURIComponent(name));
      x.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
      x.onload = () => {
        let d = {};
        try { d = JSON.parse(x.responseText); } catch {}
        x.status < 300 && d.url ? resolve(d.url) : reject(new Error(d.error || "No se pudo subir el archivo."));
      };
      x.onerror = () => reject(new Error("Se cortó la conexión mientras se subía el archivo."));
      x.send(file);
    });
  }
  const { upload } = await import(BLOB_CLIENT);
  const res = await upload(`uploads/${Date.now()}-${name}`, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
    headers: { authorization: `Bearer ${password}` },
    contentType: file.type,
    multipart: file.size > 20 * 1024 * 1024,
    onUploadProgress: ({ percentage }) => onProgress(percentage)
  });
  return res.url;
}

// Sube video + portada y muestra el progreso sobre la tarjeta
async function uploadVideo(file, card) {
  const prog = $(".progress", card), bar = $("i", prog), label = $("span", prog);
  const show = (p, text) => { bar.style.width = p + "%"; label.textContent = text || `Subiendo… ${Math.round(p)}%`; };
  card.classList.add("is-uploading");
  uploading++; updateBar();
  try {
    show(0, "Preparando…");
    const poster = await makePoster(file);
    const base = safeName(file.name.replace(/\.[^.]+$/, ""));
    const ext = (file.name.match(/\.[a-z0-9]+$/i) || [".mp4"])[0].toLowerCase();
    const videoUrl = await uploadFile(file, base + ext, (p) => show(p * 0.95));
    sessionUploads.add(videoUrl);
    let posterUrl = "";
    if (poster) {
      show(96, "Guardando portada…");
      posterUrl = await uploadFile(new File([poster.blob], base + ".jpg", { type: "image/jpeg" }), base + ".jpg", () => {});
      sessionUploads.add(posterUrl);
    }
    show(100, "¡Listo!");
    return { video: videoUrl, poster: posterUrl, ratio: poster?.ratio || "16/9" };
  } finally {
    card.classList.remove("is-uploading");
    uploading--; updateBar();
  }
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-pick]");
  if (!btn) return;
  const which = btn.dataset.pick; // hero | showreel
  const file = await pickVideo();
  if (!checkFile(file)) return;
  const card = btn.closest(".slot");
  try {
    const up = await uploadVideo(file, card);
    state[which] = { ...state[which], video: up.video, poster: up.poster };
    if (which === "showreel") state.showreel.linked = false; // eligió un video propio para el showreel
    renderSlots();
    setDirty();
    toast("Video subido. Tocá Publicar cambios para que se vea en el sitio.");
  } catch (err) {
    toast(err.message || "No se pudo subir el video.", true);
  }
});

/* ---------- trabajos ---------- */
function chipsField(work, onChange) {
  const box = document.createElement("div");
  box.className = "chips";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Escribí una etiqueta y tocá Enter";
  input.setAttribute("aria-label", "Agregar etiqueta");
  const draw = () => {
    [...box.querySelectorAll(".chip")].forEach((c) => c.remove());
    (work.tags || []).forEach((t, i) => {
      const c = document.createElement("span");
      c.className = "chip";
      c.textContent = t;
      const x = document.createElement("button");
      x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", `Quitar ${t}`);
      x.onclick = () => { work.tags.splice(i, 1); draw(); onChange(); };
      c.appendChild(x);
      box.insertBefore(c, input);
    });
  };
  const add = () => {
    const parts = input.value.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    work.tags = [...(work.tags || []), ...parts].slice(0, 8);
    input.value = "";
    draw(); onChange();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    else if (e.key === "Backspace" && !input.value && work.tags?.length) { work.tags.pop(); draw(); onChange(); }
  });
  input.addEventListener("blur", add);
  box.addEventListener("click", () => input.focus());
  box.appendChild(input);
  draw();
  return box;
}

function workCard(w, i, key = "works") {
  const list = state[key];
  const isReel = key === "reels";
  const card = document.createElement("article");
  card.className = "work";
  const id = `${key}${i}`;
  card.innerHTML = `
    <div class="work__side">
      <div class="work__media ${w.ratio === "9/16" || w.ratio === "4/5" ? "is-vertical" : ""}">
        <video muted loop playsinline preload="metadata"></video>
        <div class="progress"><i></i><span></span></div>
      </div>
      <div class="poster-pick" hidden>
        <p class="small">Mové la barra hasta el cuadro que quieras usar como portada.</p>
        <input type="range" min="0" max="1000" value="200" aria-label="Momento del video para la portada">
        <div class="poster-pick__btns">
          <button type="button" class="btn btn--primary" data-act="poster-use">Usar este cuadro</button>
          <button type="button" class="btn btn--ghost" data-act="poster-cancel">Cancelar</button>
        </div>
      </div>
      <div class="work__side-btns">
        <button type="button" class="btn btn--ghost" data-act="video">Cambiar video</button>
        <button type="button" class="btn btn--ghost" data-act="poster">Elegir portada</button>
      </div>
    </div>
    <div class="work__fields">
      <div class="work__row">
        <div><label for="${id}t">Título</label><input id="${id}t" type="text" maxlength="120" data-f="title"></div>
        <div><label for="${id}y">Año</label><input id="${id}y" type="text" maxlength="12" data-f="year" inputmode="numeric"></div>
      </div>
      <label for="${id}d">Descripción</label>
      <textarea id="${id}d" maxlength="600" data-f="text" placeholder="Qué hiciste y para quién"></textarea>
      ${isReel ? `<p class="small">En el sitio se ve el título en el carrusel; la descripción aparece al abrir el reel.</p>` : `<label>Etiquetas</label>
      <div class="tags-slot"></div>
      <p class="small">Hasta 8. Por ejemplo: Edición, Reels, Motion.</p>`}
      <div class="work__actions">
        <div class="work__order">
          <span class="work__num">#${i + 1}</span>
          <button type="button" class="btn btn--ghost" data-act="up" ${i === 0 ? "disabled" : ""} aria-label="Subir">↑</button>
          <button type="button" class="btn btn--ghost" data-act="down" ${i === list.length - 1 ? "disabled" : ""} aria-label="Bajar">↓</button>
        </div>
        <button type="button" class="btn btn--danger" data-act="del">Eliminar</button>
      </div>
    </div>`;
  const v = card.querySelector("video");
  v.src = src(w.video) + (w.poster ? "" : "#t=0.5");
  if (w.poster) v.poster = src(w.poster);
  card.addEventListener("mouseenter", () => v.play().catch(() => {}));
  card.addEventListener("mouseleave", () => v.pause());
  card.querySelectorAll("[data-f]").forEach((el) => {
    el.value = w[el.dataset.f] || "";
    el.addEventListener("input", () => { w[el.dataset.f] = el.value; setDirty(); });
  });
  card.querySelector(".tags-slot")?.replaceWith(chipsField(w, () => setDirty()));
  card.addEventListener("click", async (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;
    if (act === "up" || act === "down") {
      const j = act === "up" ? i - 1 : i + 1;
      [list[i], list[j]] = [list[j], list[i]];
      renderList(key); setDirty();
    } else if (act === "del") {
      const b = e.target.closest("[data-act]");
      if (!b.dataset.armed) {
        b.dataset.armed = "1"; b.textContent = "¿Seguro? Tocá de nuevo";
        setTimeout(() => { delete b.dataset.armed; b.textContent = "Eliminar"; }, 3000);
        return;
      }
      list.splice(i, 1);
      renderList(key); setDirty();
      toast(`${isReel ? "Reel eliminado" : "Trabajo eliminado"}. Publicá para confirmarlo.`);
    } else if (act === "poster") {
      openPosterPicker(card, w);
    } else if (act === "poster-cancel") {
      closePosterPicker(card);
    } else if (act === "poster-use") {
      const pv = card._pv;
      if (!pv) return;
      const btn = e.target.closest("[data-act]");
      btn.disabled = true; btn.textContent = "Guardando…";
      try {
        const cv = frameToCanvas(pv);
        const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.82));
        const name = safeName((w.title || "portada").slice(0, 40)) + "-portada.jpg";
        uploading++; updateBar();
        const url = await uploadFile(new File([blob], name, { type: "image/jpeg" }), name, () => {}).finally(() => { uploading--; updateBar(); });
        sessionUploads.add(url);
        w.poster = url;
        renderList(key); setDirty();
        toast("Portada nueva lista. Tocá Publicar cambios.");
      } catch (err) {
        btn.disabled = false; btn.textContent = "Usar este cuadro";
        toast(err.message || "No se pudo guardar la portada.", true);
      }
    } else if (act === "video") {
      const file = await pickVideo();
      if (!checkFile(file)) return;
      try {
        const up = await uploadVideo(file, card);
        Object.assign(w, up);
        if (placeByOrientation(w, key)) return;
        renderList(key); setDirty();
        toast("Video reemplazado. Tocá Publicar cambios.");
      } catch (err) { toast(err.message || "No se pudo subir el video.", true); }
    }
  });
  return card;
}

/* ---------- elegir portada desde el video ---------- */
function openPosterPicker(card, w) {
  const media = card.querySelector(".work__media");
  const pick = card.querySelector(".poster-pick");
  const range = pick.querySelector("input");
  // video aparte con permiso para leer sus cuadros (Vercel Blob lo permite)
  const pv = document.createElement("video");
  pv.crossOrigin = "anonymous";
  pv.muted = true; pv.playsInline = true; pv.preload = "auto";
  pv.className = "poster-pick__video";
  pv.src = src(w.video);
  media.appendChild(pv);
  card._pv = pv;
  pick.hidden = false;
  card.querySelector(".work__side-btns").hidden = true;
  pv.onloadedmetadata = () => { pv.currentTime = (range.value / 1000) * pv.duration; };
  pv.onerror = () => { toast("No se pudo abrir el video para elegir la portada.", true); closePosterPicker(card); };
  range.oninput = () => { if (pv.duration) pv.currentTime = (range.value / 1000) * pv.duration; };
}
function closePosterPicker(card) {
  card._pv?.remove();
  card._pv = null;
  card.querySelector(".poster-pick").hidden = true;
  card.querySelector(".work__side-btns").hidden = false;
}

function renderList(key) {
  const box = $(LISTS[key].box);
  box.innerHTML = "";
  if (!state[key].length) {
    box.innerHTML = `<p class="empty">${LISTS[key].empty}</p>`;
    return;
  }
  state[key].forEach((w, i) => box.appendChild(workCard(w, i, key)));
}
function renderWorks() { renderList("works"); renderList("reels"); }

// Si el video no coincide con la sección (un vertical en Trabajos o un horizontal en Reels), lo mueve a la correcta
function placeByOrientation(w, key) {
  const target = isVerticalRatio(w.ratio) ? "reels" : "works";
  if (target === key) return false;
  state[key].splice(state[key].indexOf(w), 1);
  state[target].unshift(w);
  renderWorks(); setDirty();
  toast(target === "reels" ? "Ese video es vertical: lo pasé a la sección Reels." : "Ese video es horizontal: lo pasé a Trabajos.");
  setTimeout(() => $(`${LISTS[target].box} .work`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
  return true;
}

document.querySelectorAll("[data-add]").forEach((btn) => btn.addEventListener("click", async () => {
  const key = btn.dataset.add;
  const file = await pickVideo();
  if (!checkFile(file)) return;
  const w = { title: file.name.replace(/\.[^.]+$/, ""), text: "", tags: [], year: String(new Date().getFullYear()), video: "", poster: "", ratio: key === "reels" ? "9/16" : "16/9" };
  state[key].unshift(w);
  renderList(key);
  const card = $(`${LISTS[key].box} .work`);
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  try {
    Object.assign(w, await uploadVideo(file, card));
    if (placeByOrientation(w, key)) return;
    renderList(key); setDirty();
    $(`${LISTS[key].box} .work input[data-f=title]`)?.select();
    toast(key === "reels" ? "Reel subido. Completá el título y la descripción." : "Video subido. Completá el título, la descripción y las etiquetas.");
  } catch (err) {
    state[key].splice(state[key].indexOf(w), 1);
    renderList(key);
    toast(err.message || "No se pudo subir el video.", true);
  }
}));

/* ---------- publicar ---------- */
$("#publish").addEventListener("click", async () => {
  const btn = $("#publish");
  const missing = state.works.findIndex((w) => !w.title?.trim());
  if (missing >= 0) { toast(`Al trabajo #${missing + 1} le falta el título.`, true); return; }
  const missingReel = state.reels.findIndex((w) => !w.title?.trim());
  if (missingReel >= 0) { toast(`Al reel #${missingReel + 1} le falta el título.`, true); return; }
  if (state.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.contact.email.trim())) { toast("El mail no parece válido. Revisalo en Contacto.", true); return; }
  if (state.contact.whatsapp && state.contact.whatsapp.replace(/\D/g, "").length < 8) { toast("El número de WhatsApp parece incompleto. Incluí el código de país (+54 9…).", true); return; }
  btn.disabled = true; btn.textContent = "Publicando…";
  const used = new Set([state.hero.video, state.hero.poster, state.showreel.video, state.showreel.poster, ...state.works.flatMap((w) => [w.video, w.poster]), ...state.reels.flatMap((w) => [w.video, w.poster])]);
  const discard = [...sessionUploads].filter((u) => !used.has(u));
  try {
    await api("/api/save", { method: "POST", body: JSON.stringify({ ...state, discard }) });
    discard.forEach((u) => sessionUploads.delete(u));
    setDirty(false);
    refreshLogo();
    toast("¡Listo! Los cambios ya se ven en el sitio.");
  } catch (err) {
    if (err.status === 401) { toast("Tu sesión venció. Volvé a entrar.", true); ss.set("jc-pw", ""); setTimeout(() => location.reload(), 1500); }
    else toast(err.message || "No se pudo publicar. Probá de nuevo.", true);
  } finally {
    btn.textContent = "Publicar cambios";
    updateBar();
  }
});

/* ---------- inicio ---------- */
const saved = ss.get("jc-pw");
if (saved) login(saved, true);

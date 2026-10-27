/* =========================================================
   Juan Cruz — interacciones y animaciones
   ========================================================= */
(async () => {
  const S = window.SITE;

  /* ---------------- CONTENIDO CARGADO DESDE EL PANEL ---------------- */
  // Lo que Juan sube en /admin vive en el backend; si no responde, quedan los valores de content.js
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 3000);
    const r = await fetch("/api/content", { cache: "no-store", signal: ctl.signal });
    clearTimeout(to);
    if (r.ok) {
      const remote = await r.json();
      if (remote && typeof remote === "object") {
        if (remote.hero && remote.hero.video) S.hero = { ...S.hero, ...remote.hero };
        if (remote.showreel && remote.showreel.video) S.showreel = { ...S.showreel, ...remote.showreel };
        // trabajos horizontales y reels se cargan por separado desde el panel
        if (Array.isArray(remote.reels)) S.reels = remote.reels;
        if (remote.sections) S.sections = { ...S.sections, ...remote.sections };
        if (Array.isArray(remote.works) && (remote.works.length || Array.isArray(remote.reels))) S.works = remote.works;
        if (remote.contact) {
          if (remote.contact.email) S.email = remote.contact.email;
          const wa = remote.contact.whatsapp || {};
          const digits = (wa.display || "").replace(/\D/g, "");
          if (digits.length >= 8) S.whatsapp = { ...S.whatsapp, display: wa.display, number: digits };
          if (typeof wa.message === "string") S.whatsapp = { ...S.whatsapp, message: wa.message };
        }
        if (remote.theme && /^#[0-9a-f]{6}$/i.test(remote.theme.primary || "")) S.theme = { ...S.theme, ...remote.theme };
      }
    }
  } catch (e) { /* sin backend: se usan los valores por defecto */ }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = matchMedia("(hover: none)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------------- COLORES (desde el panel) ---------------- */
  const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => "#" + hexToRgb(a).map((v, i) => Math.round(v + (hexToRgb(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
  const isHexColor = (v) => /^#[0-9a-f]{6}$/i.test(v || "");
  const pick = (v, d) => (isHexColor(v) ? v : d);
  const THEME = {
    primary: pick(S.theme?.primary, "#0404E2"),
    deep: pick(S.theme?.deep, "#0303B5"),
    light: pick(S.theme?.light, "#4040FB"),
    darkBg: pick(S.theme?.darkBg, "#05052E"),
    darkInk: pick(S.theme?.darkInk, "#F5F5FA"),
    darkAccent: pick(S.theme?.darkAccent, "#7B7BFF")
  };
  const lum = (hex) => {
    const c = hexToRgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  THEME.soft = mix(THEME.primary, "#F3F3EF", 0.88);
  // texto sobre el acento oscuro: oscuro si el acento es claro, blanco si es intenso
  THEME.darkOnAccent = lum(THEME.darkAccent) > 0.35 ? THEME.darkBg : "#FFFFFF";
  const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";
  const accentNow = () => (isDark() ? THEME.darkAccent : THEME.primary);
  {
    const r = document.documentElement.style;
    r.setProperty("--c-primary", THEME.primary);
    r.setProperty("--c-deep", THEME.deep);
    r.setProperty("--c-light", THEME.light);
    r.setProperty("--c-soft", THEME.soft);
    r.setProperty("--dk-bg", THEME.darkBg);
    r.setProperty("--dk-ink", THEME.darkInk);
    r.setProperty("--dk-accent", THEME.darkAccent);
    r.setProperty("--dk-on-accent", THEME.darkOnAccent);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark() ? THEME.darkBg : THEME.primary);
    // el color va en la dirección del favicon para que el navegador no muestre uno viejo guardado
    const v = THEME.primary.slice(1);
    document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((l) => {
      const u = new URL(l.getAttribute("href"), location.href);
      u.searchParams.set("v", v);
      l.href = u.pathname + u.search;
    });
    try { localStorage.setItem("jc-theme", JSON.stringify(THEME)); } catch (e) {}
  }
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------------- RENDER CONTENIDO ---------------- */
  $("#roles").innerHTML = S.roles.map(esc).join(" <i>|</i> ");
  $("#headline").innerHTML = S.headline.map((l) => `<span>${esc(l)}</span>`).join("");
  $("#bio").textContent = S.bio;
  $("#available").textContent = S.available;
  $("#railName").textContent = S.name;
  // "Escribime" lleva a la sección de contacto (mailto no anda si la compu no tiene un programa de mail configurado)
  $("#railMail").href = "#contacto";
  $("#railMail").addEventListener("click", (e) => {
    e.preventDefault();
    $("#contacto").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    const links = $(".contact__links");
    links.classList.remove("flash"); void links.offsetWidth; links.classList.add("flash");
  });
  $("#footerName").textContent = `© ${new Date().getFullYear()} ${S.fullName} — ${S.roles.join(" & ")}`;
  $("#mailLink").textContent = S.email;
  // En compu abre Gmail en una pestaña nueva; en el celular abre la app de mail
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(S.email)}&su=${encodeURIComponent("Consulta desde tu portfolio")}`;
  if (isTouch) $("#mailLink").href = `mailto:${S.email}`;
  else { $("#mailLink").href = gmail; $("#mailLink").target = "_blank"; $("#mailLink").rel = "noopener"; }

  // WhatsApp
  const waUrl = `https://wa.me/${S.whatsapp.number}?text=${encodeURIComponent(S.whatsapp.message)}`;
  $("#waFloat").href = waUrl;
  $("#waContact").href = waUrl;
  $("#waOpen").href = waUrl;
  $("#waNumber").textContent = S.whatsapp.display;

  // Video del hero (el mismo del showreel, salvo que se cambie desde el panel)
  const heroVid = $(".hero__video");
  heroVid.src = S.hero.video;
  if (S.hero.poster) heroVid.poster = S.hero.poster;

  $("#nameMask").textContent = S.fullName;

  // Frase con palabras que aparecen al scrollear
  const splitWords = (txt, cls = "") =>
    txt.split(/\s+/).map((w) => `<span class="wd ${cls}">${esc(w)}</span>`).join(" ");
  $("#statement").innerHTML = splitWords(S.statement.strong) + " " + splitWords(S.statement.soft, "soft");
  $("#processTitle").innerHTML = splitWords(S.processTitle.strong) + " " + splitWords(S.processTitle.soft, "soft");

  // Servicios
  $("#services").innerHTML = S.services
    .map(
      (s, i) => `
    <article class="svc">
      <div>
        <span class="svc__num">0${i + 1}</span>
        <h3 class="svc__title" data-scramble>${esc(s.title)}</h3>
        <p class="svc__text">${esc(s.text)}</p>
      </div>
      <div class="svc__tags">${s.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      <pre class="ascii" data-icon="${s.icon}" aria-hidden="true"></pre>
    </article>`
    )
    .join("");

  // Marquee (duplicado para loop infinito)
  const mq = S.marquee.map((m) => `<span>${esc(m)}</span>`).join("");
  $("#marquee").innerHTML = mq + mq;

  // Showreel
  const srv = $("#showreelVideo");
  srv.src = S.showreel.video;
  if (S.showreel.poster) srv.poster = S.showreel.poster;
  $("#showreelLabel").textContent = S.showreel.label;

  // Trabajos: los horizontales van en la grilla y los verticales en el carrusel de Reels
  const RATIOS = { "16/9": 16 / 9, "1/1": 1, "4/5": 4 / 5, "9/16": 9 / 16 };
  const ratioOf = (w) => (RATIOS[w.ratio] ? w.ratio : "16/9");
  const allWorks = S.works || [];
  const horizontals = allWorks.filter((w) => RATIOS[ratioOf(w)] >= 1);
  // los reels del panel primero; si quedó algún vertical en trabajos (datos viejos), también va al carrusel
  const verticals = [...(S.reels || []), ...allWorks.filter((w) => RATIOS[ratioOf(w)] < 1)];
  const mediaHTML = (w, ratio, eager = false) => `
      <div class="work__media" style="aspect-ratio:${ratio}">
        ${w.poster ? `<img src="${esc(w.poster)}" alt="${esc(w.title)}" loading="${eager ? "eager" : "lazy"}" decoding="async">` : ""}
        <video src="${esc(w.video)}${w.poster ? "" : "#t=0.5"}" muted loop playsinline preload="${w.poster ? "none" : "metadata"}" ${w.poster ? "" : 'style="opacity:1"'}></video>
        <span class="work__cursor">Ver video ↗</span>
      </div>`;

  $("#works").innerHTML = horizontals
    .map(
      (w) => `
    <article class="work" data-video="${esc(w.video)}">
      ${mediaHTML(w, ratioOf(w))}
      <div class="work__info">
        <div>
          <h3 class="work__title" data-scramble>${esc(w.title)}</h3>
          <p class="work__text">${esc(w.text || "")}</p>
          <div class="work__tags">${(w.tags || []).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
        </div>
        <span class="work__year">${esc(w.year || "")}</span>
      </div>
    </article>`
    )
    .join("");
  if (!horizontals.length) $("#trabajos").hidden = true;

  // Nombres de las secciones: "Content (16:9)" → título "Content" y "(16:9)" más chico al lado
  const setSectionName = (titleEl, metaEl, text) => {
    const m = String(text || "").trim().match(/^(.*?)\s*(\(.*\))$/);
    titleEl.textContent = (m ? m[1] : text) || "Content";
    metaEl.textContent = m ? m[2] : "";
    metaEl.hidden = !m;
  };
  setSectionName($("#worksTitle"), $("#worksMeta"), S.sections?.works || "Content (16:9)");
  setSectionName($("#reelsTitle"), $("#reelsMeta"), S.sections?.reels || "Content (YT Shorts / TT / Reels)");

  // Reels: solo título y año, para que el carrusel quede limpio (la descripción aparece al abrirlo)
  $("#reelsTrack").innerHTML = verticals
    .map(
      (w, i) => `
    <article class="work reel" data-video="${esc(w.video)}" data-title="${esc(w.title)}" data-text="${esc(w.text || "")}" data-tags="${esc((w.tags || []).join("|"))}">
      ${mediaHTML(w, "9/16", true)}
      <div class="reel__info">
        <span class="reel__num">${String(i + 1).padStart(2, "0")}</span>
        <h3 class="reel__title">${esc(w.title)}</h3>
      </div>
    </article>`
    )
    .join("");
  if (verticals.length) $("#reels").hidden = false;
  // "Ver trabajos" y el link del menú llevan a la primera sección de videos que haya
  const firstContent = verticals.length ? "#reels" : "#trabajos";
  $$('a[href="#trabajos"]').forEach((a) => (a.href = firstContent));

  // Proceso
  $("#process").innerHTML = S.process
    .map(
      (p) => `
    <div class="step">
      <button class="step__head" aria-expanded="false">
        <span class="step__num">${esc(p.step)}</span>
        <span class="step__title">${esc(p.title)}</span>
        <span class="step__meta">${esc(p.meta)}</span>
        <span class="step__plus"></span>
      </button>
      <div class="step__body"><div><p>${esc(p.text)}</p></div></div>
      <span class="step__line"></span>
    </div>`
    )
    .join("");

  /* ---------------- SCRAMBLE DE TEXTO ---------------- */
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz#%&*+=<>/?";
  function scramble(el, dur = 900) {
    if (reduce) return;
    const final = el.dataset.final ?? el.textContent;
    el.dataset.final = final;
    const chars = [...final];
    const at = chars.map((_, i) => (i / chars.length) * 0.65 + Math.random() * 0.35);
    const t0 = performance.now();
    cancelAnimationFrame(el._raf);
    const tick = (now) => {
      const p = clamp((now - t0) / dur);
      let html = "";
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        if (c === " " || p >= at[i]) html += esc(c);
        else if (p > at[i] - 0.35) html += `<span style="color:var(--blue);opacity:.7">${GLYPHS[(Math.random() * GLYPHS.length) | 0]}</span>`;
        else html += `<span style="opacity:0">${esc(c)}</span>`;
      }
      el.innerHTML = html;
      if (p < 1) el._raf = requestAnimationFrame(tick);
      else el.textContent = final;
    };
    el._raf = requestAnimationFrame(tick);
  }

  /* ---------------- ASCII: FORMAS QUE SE FORMAN ---------------- */
  // Mide el tamaño real de un carácter para que las formas no se deformen
  function cellSize(pre) {
    const probe = document.createElement("span");
    probe.textContent = "%%%%%%%%%%";
    pre.appendChild(probe);
    const r = probe.getBoundingClientRect();
    pre.removeChild(probe);
    return { cw: r.width / 10 || 5, ch: r.height || 8 };
  }

  const ICONS = {
    calendar(c, W, H) {
      const lw = W * 0.075;
      c.lineWidth = lw;
      c.strokeRect(W * 0.12, H * 0.2, W * 0.76, H * 0.68);
      c.fillRect(W * 0.12, H * 0.2, W * 0.76, H * 0.16);
      c.fillRect(W * 0.28, H * 0.08, lw, H * 0.18);
      c.fillRect(W * 0.66, H * 0.08, lw, H * 0.18);
      for (let r = 0; r < 2; r++)
        for (let k = 0; k < 3; k++) {
          const x = W * (0.24 + k * 0.2), y = H * (0.48 + r * 0.2);
          if (r === 1 && k === 1) c.fillRect(x - 2, y - 2, W * 0.14, H * 0.13);
          else c.fillRect(x, y, W * 0.09, H * 0.08);
        }
    },
    camera(c, W, H) {
      c.lineWidth = W * 0.075;
      c.strokeRect(W * 0.08, H * 0.28, W * 0.56, H * 0.46);
      c.beginPath();
      c.moveTo(W * 0.68, H * 0.44); c.lineTo(W * 0.93, H * 0.3); c.lineTo(W * 0.93, H * 0.72); c.lineTo(W * 0.68, H * 0.58);
      c.closePath(); c.fill();
      c.beginPath(); c.arc(W * 0.24, H * 0.44, W * 0.055, 0, 7); c.fill();
      c.fillRect(W * 0.32, H * 0.84, W * 0.2, H * 0.06);
    },
    timeline(c, W, H) {
      const rows = [[0.06, 0.26, 0.36, 0.2, 0.62, 0.3], [0.06, 0.4, 0.5, 0.42], [0.06, 0.14, 0.24, 0.3, 0.6, 0.14, 0.8, 0.14]];
      rows.forEach((segs, r) => {
        const y = H * (0.28 + r * 0.2);
        for (let i = 0; i < segs.length; i += 2) c.fillRect(W * segs[i], y, W * segs[i + 1] - 3, H * 0.11);
      });
      c.fillRect(W * 0.55, H * 0.14, W * 0.045, H * 0.78);
      c.beginPath(); c.moveTo(W * 0.48, H * 0.06); c.lineTo(W * 0.67, H * 0.06); c.lineTo(W * 0.575, H * 0.18); c.closePath(); c.fill();
    },
    chart(c, W, H) {
      const b = [0.32, 0.46, 0.38, 0.62];
      b.forEach((h, i) => c.fillRect(W * (0.12 + i * 0.2), H * (0.88 - h), W * 0.12, H * h));
      c.fillRect(W * 0.06, H * 0.88, W * 0.88, H * 0.05);
      c.lineWidth = W * 0.05;
      c.beginPath(); c.moveTo(W * 0.12, H * 0.42); c.lineTo(W * 0.38, H * 0.3); c.lineTo(W * 0.56, H * 0.38); c.lineTo(W * 0.84, H * 0.1); c.stroke();
      c.beginPath(); c.moveTo(W * 0.92, H * 0.04); c.lineTo(W * 0.72, H * 0.06); c.lineTo(W * 0.88, H * 0.22); c.closePath(); c.fill();
    },
    mono(c, W, H) {
      c.font = `800 ${H * 1.05}px Geist, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "alphabetic";
      const initials = S.fullName.split(" ").map((p) => p[0]).join("").toUpperCase();
      c.fillText(initials, W / 2, H * 0.88);
    }
  };

  // Rasteriza un dibujo en una grilla de valores 0..1
  function rasterize(drawFn, cols, rows, cw, ch) {
    const k = 4, W = cols * cw * k, H = rows * ch * k;
    const cv = document.createElement("canvas");
    cv.width = Math.ceil(W); cv.height = Math.ceil(H);
    const c = cv.getContext("2d");
    c.fillStyle = c.strokeStyle = "#000";
    drawFn(c, W, H);
    const data = c.getImageData(0, 0, cv.width, cv.height).data;
    const out = new Float32Array(cols * rows);
    const sx = cw * k, sy = ch * k;
    for (let r = 0; r < rows; r++)
      for (let q = 0; q < cols; q++) {
        let sum = 0, n = 0;
        for (let y = Math.floor(r * sy); y < (r + 1) * sy; y += 2)
          for (let x = Math.floor(q * sx); x < (q + 1) * sx; x += 2) { sum += data[(y * cv.width + x) * 4 + 3]; n++; }
        out[r * cols + q] = sum / n / 255;
      }
    return out;
  }

  const NOISE = "!<>-_\\/[]{}=+*^?#%01";
  function makeAscii(pre, drawFn, cols, rows) {
    const { cw, ch } = cellSize(pre);
    const grid = rasterize(drawFn, cols, rows, cw, ch);
    const target = [...grid].map((v) =>
      v > 0.5 ? "%%%%#%%%#%"[(Math.random() * 10) | 0] : v > 0.22 ? "+=*#"[(Math.random() * 4) | 0] : v > 0.07 ? "-:."[(Math.random() * 3) | 0] : " "
    );
    const toText = (arr) => {
      let s = "";
      for (let r = 0; r < rows; r++) s += arr.slice(r * cols, (r + 1) * cols).join("") + (r < rows - 1 ? "\n" : "");
      return s;
    };
    const api = {
      visible: false,
      final() { pre.textContent = toText(target); },
      form(dur = 1300) {
        if (reduce) return api.final();
        const settle = target.map((_, i) => ((i / cols | 0) / rows) * 0.35 + Math.random() * 0.65);
        const t0 = performance.now();
        cancelAnimationFrame(api.raf);
        const tick = (now) => {
          const p = clamp((now - t0) / dur);
          const frame = target.map((t, i) => {
            if (p >= settle[i]) return t;
            const near = settle[i] - p;
            if (t !== " " || Math.random() < 0.18 * (1 - p)) return near < 0.5 ? NOISE[(Math.random() * NOISE.length) | 0] : " ";
            return " ";
          });
          pre.textContent = toText(frame);
          if (p < 1) api.raf = requestAnimationFrame(tick);
          else api.final();
        };
        api.raf = requestAnimationFrame(tick);
      },
      shimmer() {
        // parpadeo sutil de caracteres, como si la forma "respirara"
        for (let n = 0; n < 4; n++) {
          const i = (Math.random() * target.length) | 0;
          if (target[i] === "%" || target[i] === "#") target[i] = target[i] === "%" ? "#" : "%";
        }
        if (!api.raf || pre.textContent.length) pre.textContent = toText(target);
      }
    };
    pre.textContent = toText(target.map(() => " "));
    return api;
  }

  const asciis = [];
  function buildAscii() {
    $$(".svc .ascii").forEach((pre) => {
      const a = makeAscii(pre, ICONS[pre.dataset.icon], 30, 20);
      a.el = pre;
      asciis.push(a);
      pre.closest(".svc").addEventListener("mouseenter", () => a.form(900));
    });
    const big = $("#asciiMono");
    const mono = makeAscii(big, ICONS.mono, innerWidth < 900 ? 52 : 56, 22);
    mono.el = big;
    asciis.push(mono);
    big.parentElement.addEventListener("mouseenter", () => mono.form(1100));

    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        const a = asciis.find((x) => x.el === e.target);
        if (!a) return;
        if (e.isIntersecting && !a.done) { a.done = true; a.form(); }
        a.visible = e.isIntersecting;
      });
    }, { threshold: 0.4 });
    asciis.forEach((a) => io.observe(a.el));
    if (!reduce) setInterval(() => asciis.forEach((a) => a.visible && a.done && a.shimmer()), 140);
  }

  /* ---------------- NOMBRE GIGANTE: letras que se forman + video adentro ---------------- */
  const hero = (() => {
    const box = $("#heroName"), cv = $("#nameCanvas"), c = cv.getContext("2d"), vid = $(".hero__video", box);
    const mk = document.createElement("canvas"), m = mk.getContext("2d"); // máscara con las letras
    const FONT = (px) => `800 ${px}px Geist, sans-serif`;
    let W = 0, H = 0, dpr = 1, letters = [], fs = 100, t0 = null, tint = 1, tintTarget = 1, running = true;
    const chars = [];

    function layout() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = box.clientWidth;
      const lines = innerWidth <= 900 ? S.name.split(" ") : [S.name];
      const ls = -0.06; // letter-spacing en em
      const measure = (line, size) => {
        c.font = FONT(size);
        let w = 0;
        for (const ch of line) w += c.measureText(ch).width + ls * size;
        return w - ls * size;
      };
      const widest = Math.max(...lines.map((l) => measure(l, 100)));
      fs = (100 * W) / widest * 0.99;
      const lh = fs * 0.8;
      H = Math.ceil(lh * lines.length + fs * 0.12);
      cv.width = mk.width = W * dpr; cv.height = mk.height = H * dpr; cv.style.height = H + "px";
      letters = [];
      c.font = FONT(fs);
      let idx = 0;
      lines.forEach((line, li) => {
        let x = 0;
        for (const ch of line) {
          const w = c.measureText(ch).width;
          if (ch !== " ") letters.push({ ch, x, y: lh * (li + 1) - fs * 0.02, i: idx++ });
          x += w + ls * fs;
        }
      });
    }

    function drawLetters(now) {
      const c = m;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      c.fillStyle = "#000";
      c.font = FONT(fs);
      c.textBaseline = "alphabetic";
      let allDone = true;
      for (const L of letters) {
        let p = 1;
        if (!reduce) {
          const el = t0 === null ? -1 : now - t0 - L.i * 60;
          p = clamp(el / 1100);
          if (p < 1) allDone = false;
        }
        if (p <= 0) continue;
        const e = 1 - Math.pow(1 - p, 4);
        c.globalAlpha = e;
        c.filter = e < 1 ? `blur(${(1 - e) * 14}px)` : "none";
        c.fillText(L.ch, L.x, L.y + (1 - e) * fs * 0.55);
      }
      c.globalAlpha = 1; c.filter = "none";
      return allDone;
    }

    function frame(now) {
      if (!running) return;
      tint += (tintTarget - tint) * 0.08;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalCompositeOperation = "source-over";
      c.clearRect(0, 0, W, H);
      // 1) fondo: video (blanco y negro con tinte azul) o azul plano
      if (vid.readyState >= 2) {
        const vr = vid.videoWidth / vid.videoHeight, r = W / H;
        let dw = W, dh = W / vr;
        if (dh < H) { dh = H; dw = H * vr; }
        c.filter = tint > 0.5 ? "grayscale(1) contrast(1.2)" : "none";
        c.drawImage(vid, (W - dw) / 2, (H - dh) / 2, dw, dh);
        c.filter = "none";
        if (tint > 0.01) {
          c.globalCompositeOperation = "lighten";
          c.globalAlpha = tint;
          c.fillStyle = accentNow();
          c.fillRect(0, 0, W, H);
          c.globalAlpha = 1;
        }
      } else {
        c.fillStyle = accentNow();
        c.fillRect(0, 0, W, H);
      }
      // 2) recorte con las letras (que se van formando)
      drawLetters(now);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = "destination-in";
      c.drawImage(mk, 0, 0);
      requestAnimationFrame(frame);
    }

    box.addEventListener("mouseenter", () => (tintTarget = 0));
    box.addEventListener("mouseleave", () => (tintTarget = 1));
    if (isTouch) box.addEventListener("click", () => (tintTarget = tintTarget ? 0 : 1));
    new IntersectionObserver(([e]) => {
      const was = running;
      running = e.isIntersecting;
      if (running) { vid.play().catch(() => {}); if (!was) requestAnimationFrame(frame); }
      else vid.pause();
    }).observe(box);

    return {
      init() { layout(); requestAnimationFrame(frame); },
      resize: layout,
      play() { t0 = performance.now(); }
    };
  })();
  const fitName = () => hero.resize();

  /* ---------------- LOADER DE PÍXELES ---------------- */
  function runLoader(done) {
    const cv = $("#loader");
    if (reduce) { cv.remove(); return done(); }
    cv.style.background = "transparent";
    const c = cv.getContext("2d");
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    c.scale(dpr, dpr);
    const size = Math.max(26, Math.round(W / 36));
    const cols = Math.ceil(W / size), rows = Math.ceil(H / size);
    const pal = [THEME.primary, THEME.primary, THEME.deep, THEME.light, mix(THEME.primary, THEME.light, 0.5), mix(THEME.light, "#FFFFFF", 0.45), mix(THEME.light, "#FFFFFF", 0.75)];
    const cells = [];
    for (let r = 0; r < rows; r++)
      for (let q = 0; q < cols; q++)
        cells.push({ x: q * size, y: r * size, th: (r / rows) * 0.55 + Math.random() * 0.45, col: pal[(Math.random() * pal.length) | 0] });
    const HOLD = 350, DUR = 1300;
    const t0 = performance.now();
    let fired = false;
    const tick = (now) => {
      const el = now - t0;
      const t = clamp((el - HOLD) / DUR);
      c.clearRect(0, 0, W, H);
      for (const k of cells) {
        if (k.th < t) continue;
        // los píxeles cercanos a desaparecer se aclaran
        c.fillStyle = k.th - t < 0.08 ? pal[5 + ((k.th * 100) | 0) % 2] : el < HOLD ? THEME.primary : k.col;
        c.fillRect(k.x, k.y, size + 0.5, size + 0.5);
      }
      if (!fired && t > 0.3) { fired = true; done(); }
      if (t < 1) requestAnimationFrame(tick);
      else cv.remove();
    };
    requestAnimationFrame(tick);
  }

  /* ---------------- SCROLL: palabras, showreel, líneas ---------------- */
  const wordBlocks = $$(".reveal-words");
  const frame = $("#showreelFrame");
  function onScroll() {
    const vh = innerHeight;
    wordBlocks.forEach((b) => {
      const r = b.getBoundingClientRect();
      const p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.3));
      const ws = b._w || (b._w = $$(".wd", b));
      ws.forEach((w, i) => w.classList.toggle("on", i / ws.length < p * 1.15));
    });
    if (!reduce) {
      const r = frame.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh * 0.85));
      const e = 1 - Math.pow(1 - p, 2);
      frame.style.clipPath = `inset(${(1 - e) * 12}% ${(1 - e) * 8}% ${(1 - e) * 12}% ${(1 - e) * 8}%)`;
    }
  }
  addEventListener("scroll", () => requestAnimationFrame(onScroll), { passive: true });

  /* ---------------- OBSERVADORES ---------------- */
  const once = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      if (el.hasAttribute("data-scramble")) scramble(el, 1000);
      if (el.classList.contains("step")) el.classList.add("seen");
      if (el.classList.contains("work")) el.classList.add("in");
      once.unobserve(el);
    });
  }, { threshold: 0.35 });

  // Videos: preview del showreel en loop mientras se ve; en mobile los trabajos se reproducen solos
  const vio = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      const v = e.target.tagName === "VIDEO" ? e.target : $("video", e.target);
      if (e.isIntersecting) { v.play().catch(() => {}); e.target.classList?.add("playing"); }
      else { v.pause(); e.target.classList?.remove("playing"); }
    });
  }, { threshold: 0.5 });

  /* ---------------- LIGHTBOX ---------------- */
  const lb = $("#lightbox"), lbv = $("#lbVideo");
  function openVideo(src, info) {
    lbv.src = src; lbv.muted = false;
    // los reels se abren en vertical, con su título y descripción al lado
    const cap = $("#lbCap");
    lb.classList.toggle("is-vertical", !!info);
    cap.hidden = !info;
    if (info) {
      $("h3", cap).textContent = info.title;
      $("p", cap).textContent = info.text;
      const tags = (info.tags || "").split("|").filter(Boolean);
      const box = $(".lightbox__tags", cap);
      box.innerHTML = tags.map((t) => `<span>${esc(t)}</span>`).join("");
      box.hidden = !tags.length;
    }
    document.body.classList.add("lb-open");
    lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
    lbv.play().catch(() => {});
  }
  function closeVideo() {
    document.body.classList.remove("lb-open");
    lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true");
    lbv.pause(); lbv.removeAttribute("src"); lbv.load();
  }
  $("#lbClose").onclick = closeVideo;
  lb.addEventListener("click", (e) => e.target === lb && closeVideo());
  addEventListener("keydown", (e) => e.key === "Escape" && (closeVideo(), document.body.classList.remove("menu-open")));
  $("#showreelPlay").onclick = () => openVideo(S.showreel.video);

  /* ---------------- TRABAJOS ---------------- */
  $$(".work").forEach((w) => {
    const v = $("video", w), cur = $(".work__cursor", w), media = $(".work__media", w);
    w.addEventListener("click", () =>
      openVideo(w.dataset.video, w.classList.contains("reel") ? { title: w.dataset.title, text: w.dataset.text, tags: w.dataset.tags } : null));
    // en celular los trabajos se reproducen al verse; los reels los maneja el carrusel (solo el del centro)
    if (isTouch) { if (!w.classList.contains("reel")) vio.observe(w); return; }
    w.addEventListener("mouseenter", () => { v.play().catch(() => {}); const t = $(".work__title", w); if (t) scramble(t, 600); });
    w.addEventListener("mouseleave", () => v.pause());
    media.addEventListener("mousemove", (e) => {
      const r = media.getBoundingClientRect();
      cur.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`;
    });
  });

  /* ---------------- TEMA CLARO / OSCURO ---------------- */
  (() => {
    const btns = $$("[data-theme-toggle]");
    const sync = () => btns.forEach((b) => {
      b.setAttribute("aria-pressed", isDark());
      b.setAttribute("aria-label", isDark() ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
    });
    const apply = (dark, remember = true) => {
      if (dark) document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
      if (remember) try { localStorage.setItem("jc-mode", dark ? "dark" : "light"); } catch (e) {}
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? THEME.darkBg : THEME.primary);
      sync();
    };
    btns.forEach((b) => b.addEventListener("click", (e) => {
      const dark = !isDark();
      // transición circular desde el botón, donde el navegador la soporta
      if (document.startViewTransition && !reduce) {
        const r = b.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        const root = document.documentElement.style;
        root.setProperty("--tx", x + "px"); root.setProperty("--ty", y + "px"); root.setProperty("--tr", rad + "px");
        document.startViewTransition(() => apply(dark));
      } else apply(dark);
    }));
    // sin elección manual, sigue el modo claro/oscuro del dispositivo (también si cambia con la página abierta)
    const mq = matchMedia("(prefers-color-scheme: dark)");
    let saved = null;
    try { saved = localStorage.getItem("jc-mode"); } catch (e) {}
    if (!saved) apply(mq.matches, false);
    mq.addEventListener?.("change", (e) => {
      let s = null;
      try { s = localStorage.getItem("jc-mode"); } catch (err) {}
      if (!s) apply(e.matches, false);
    });
    sync();
  })();

  /* ---------------- REELS (carrusel) ----------------
     "Coverflow" en compu y celular: el reel activo grande al centro y los demás más chicos detrás, a los costados.
     En celular se cambia deslizando con el dedo. */
  (() => {
    const track = $("#reelsTrack");
    if (!track || !verticals.length) return;
    const cards = $$(".reel", track);
    const prev = $("#reelsPrev"), next = $("#reelsNext"), count = $("#reelsCount"), nav = $(".reels__nav");
    const pad = (n) => String(n).padStart(2, "0");
    const wantsCoverflow = () => true;
    let cover = false, active = 0;

    /* --- modo coverflow --- */
    const layout = () => {
      const w = cards[0].offsetWidth;
      cards.forEach((c, i) => {
        const d = i - active, a = Math.abs(d);
        const scale = a === 0 ? 1 : a === 1 ? 0.8 : 0.62;
        const x = Math.sign(d) * (a === 0 ? 0 : a === 1 ? w * 0.64 : w * 1.1);
        const rot = a === 0 ? 0 : -Math.sign(d) * (a === 1 ? 14 : 22); // los de costado se inclinan hacia el centro
        c.style.transform = `perspective(1400px) translateX(${x}px) scale(${scale}) rotateY(${rot}deg)`;
        c.style.zIndex = String(10 - a);
        c.style.opacity = a > 2 ? "0" : "1";
        c.style.pointerEvents = a > 2 ? "none" : "";
        c.classList.toggle("is-active", d === 0);
        c.setAttribute("aria-hidden", a > 2 ? "true" : "false");
        const v = $("video", c);
        if (d === 0 && inView) v.play().catch(() => {}); else v.pause();
      });
      count.textContent = `${pad(active + 1)} / ${pad(cards.length)}`;
      prev.disabled = active === 0;
      next.disabled = active === cards.length - 1;
      nav.hidden = cards.length < 2;
    };
    const go = (i) => { active = Math.max(0, Math.min(cards.length - 1, i)); layout(); };

    /* --- modo carrusel (celular) --- */
    const step = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth);
    const update = () => {
      if (cover) return;
      const i = Math.round(track.scrollLeft / step());
      count.textContent = `${pad(Math.min(i + 1, cards.length))} / ${pad(cards.length)}`;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      nav.hidden = track.scrollWidth <= track.clientWidth + 4;
    };

    const setMode = () => {
      const want = wantsCoverflow();
      if (want === cover && track.dataset.ready) { cover ? layout() : update(); return; }
      cover = want;
      track.dataset.ready = "1";
      track.classList.toggle("is-coverflow", cover);
      if (cover) { track.scrollLeft = 0; layout(); }
      else {
        cards.forEach((c) => { c.style.transform = c.style.zIndex = c.style.opacity = c.style.pointerEvents = ""; c.classList.remove("is-active"); c.removeAttribute("aria-hidden"); });
        update();
      }
    };

    prev.onclick = () => (cover ? go(active - 1) : track.scrollBy({ left: -step(), behavior: reduce ? "auto" : "smooth" }));
    next.onclick = () => (cover ? go(active + 1) : track.scrollBy({ left: step(), behavior: reduce ? "auto" : "smooth" }));
    track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    addEventListener("resize", setMode);

    // el reel activo se reproduce solo (sin sonido) mientras la sección está en pantalla
    let inView = false;
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (cover) layout(); }, { threshold: 0.35 }).observe(track);

    // flechas del teclado cuando el carrusel tiene el foco
    track.tabIndex = 0;
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); next.click(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev.click(); }
    });

    // arrastrar con el mouse: en coverflow pasa al siguiente/anterior; en carrusel mueve la fila
    let down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" && !cover) return; // en celular el coverflow también se maneja deslizando
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
    });
    addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 6 && !moved) { moved = true; track.classList.add("is-dragging"); }
      if (moved && !cover) track.scrollLeft = startLeft - dx;
    });
    addEventListener("pointercancel", () => { down = false; track.classList.remove("is-dragging"); });
    addEventListener("pointerup", (e) => {
      if (!down) return;
      down = false;
      if (!moved) return;
      track.classList.remove("is-dragging");
      if (cover) {
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1));
      } else track.scrollTo({ left: Math.round(track.scrollLeft / step()) * step(), behavior: "smooth" });
    });
    // clicks: si se arrastró no hace nada; en coverflow, un reel de costado pasa al centro en vez de abrirse
    track.addEventListener("click", (e) => {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; return; }
      if (!cover) return;
      const card = e.target.closest(".reel");
      if (card && !card.classList.contains("is-active")) { e.stopPropagation(); e.preventDefault(); go(cards.indexOf(card)); }
    }, true);

    setMode();
  })();

  /* ---------------- PROCESO (acordeón) ---------------- */
  $$(".step").forEach((s) => {
    $(".step__head", s).addEventListener("click", () => {
      const open = s.classList.toggle("open");
      $(".step__head", s).setAttribute("aria-expanded", open);
      if (open) scramble($(".step__title", s), 500);
    });
  });

  /* ---------------- SERVICIOS en touch: tags visibles al entrar ---------------- */
  if (isTouch) {
    const tio = new IntersectionObserver((ents) => ents.forEach((e) => e.target.classList.toggle("in-touch", e.isIntersecting)), { threshold: 0.6 });
    $$(".svc").forEach((s) => tio.observe(s));
  }

  /* ---------------- MENÚ ---------------- */
  const toggleMenu = () => {
    const open = document.body.classList.toggle("menu-open");
    $("#menu").setAttribute("aria-hidden", !open);
    $("#menuBtn").setAttribute("aria-expanded", open);
    if (open) $$(".menu a").forEach((a, i) => setTimeout(() => scramble(a, 600), 150 + i * 60));
  };
  $("#menuBtn").onclick = toggleMenu;
  $("#menuBtnTop").onclick = toggleMenu;
  $$(".menu a").forEach((a) => a.addEventListener("click", () => document.body.classList.remove("menu-open")));

  /* ---------------- SCRAMBLE AL PASAR EL MOUSE ---------------- */
  $$("[data-scramble-hover]").forEach((el) => {
    const target = el.closest("a,button") || el;
    target.addEventListener("mouseenter", () => scramble(el, 500));
  });

  /* ---------------- COPIAR EMAIL ---------------- */
  $("#copyBtn").onclick = async () => {
    const b = $("#copyBtn");
    try { await navigator.clipboard.writeText(S.email); b.textContent = "¡Copiado!"; }
    catch { b.textContent = "Copialo a mano"; }
    b.dataset.final = b.textContent; scramble(b, 400);
    setTimeout(() => { b.textContent = "Copiar"; delete b.dataset.final; }, 1800);
  };

  /* ---------------- FAVICON: la "JC" de píxeles se forma en la pestaña ---------------- */
  function animateFavicon() {
    if (reduce) return;
    const map = "................|................|................|...####...#####.|...####..######.|.....##..##.....|.....##..##.....|.....##..##.....|.....##..##.....|.##..##..##.....|.##..##..##.....|.######..######.|..####....#####.|................|................|................".split("|");
    const px = [];
    map.forEach((row, y) => [...row].forEach((ch, x) => ch === "#" && px.push({ x, y, at: Math.random() })));
    const link = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
    if (!link) return;
    // al terminar queda la "JC" con el color elegido en el panel
    const original = "data:image/svg+xml," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" rx="3" fill="${THEME.primary}"/><g fill="#fff">${px.map((p) => `<rect x="${p.x}" y="${p.y}" width="1.02" height="1.02"/>`).join("")}</g></svg>`
    );
    const cv = document.createElement("canvas");
    cv.width = cv.height = 32;
    const c = cv.getContext("2d");
    let step = 0;
    const STEPS = 14;
    const id = setInterval(() => {
      step++;
      const t = step / STEPS;
      c.clearRect(0, 0, 32, 32);
      c.fillStyle = THEME.primary;
      c.beginPath(); c.roundRect ? c.roundRect(0, 0, 32, 32, 6) : c.rect(0, 0, 32, 32); c.fill();
      c.fillStyle = "#fff";
      px.forEach((p) => p.at < t && c.fillRect(p.x * 2, p.y * 2, 2, 2));
      link.href = cv.toDataURL("image/png");
      if (step >= STEPS) { clearInterval(id); link.href = original; }
    }, 90);
  }

  /* ---------------- ARRANQUE ---------------- */
  const start = () => {
    hero.init();
    buildAscii();
    $$("[data-scramble]").forEach((el) => {
      // se ocultan hasta que entran en pantalla para que "se formen"
      if (!reduce) el.style.visibility = "hidden";
      once.observe(el);
    });
    $$(".step,.work").forEach((el) => once.observe(el));
    vio.observe(srv);
    onScroll();
    runLoader(() => {
      document.body.classList.add("ready");
      hero.play();
      animateFavicon();
      document.body.classList.remove("is-loading");
    });
  };
  // al primer scramble se hace visible
  const _scr = scramble;
  scramble = function (el, d) { el.style.visibility = ""; return _scr(el, d); };

  addEventListener("resize", () => { fitName(); onScroll(); });
  // el canvas del nombre necesita Geist 800 cargada antes de medir
  const fontsReady = document.fonts
    ? Promise.all([document.fonts.load('800 100px "Geist"'), document.fonts.load('600 10px "Geist Mono"')]).then(() => document.fonts.ready)
    : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(start);
})();

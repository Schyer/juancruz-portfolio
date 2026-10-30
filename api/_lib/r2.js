// Cliente mínimo de Cloudflare R2 (API compatible con S3, firma SigV4). Sin dependencias.
import crypto from "node:crypto";

const cfg = () => ({
  account: process.env.R2_ACCOUNT_ID || "",
  key: process.env.R2_ACCESS_KEY_ID || "",
  secret: process.env.R2_SECRET_ACCESS_KEY || "",
  bucket: process.env.R2_BUCKET || "",
  publicUrl: (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "")
});

export const r2Configured = () => {
  const c = cfg();
  return !!(c.account && c.key && c.secret && c.bucket && c.publicUrl);
};
export const publicBase = () => cfg().publicUrl;

const sha256 = (d) => crypto.createHash("sha256").update(d).digest("hex");
const hmac = (k, d) => crypto.createHmac("sha256", k).update(d).digest();
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
export const encodeKey = (key) => key.split("/").map(enc).join("/");

function signingKey(secret, date) {
  return hmac(hmac(hmac(hmac("AWS4" + secret, date), "auto"), "s3"), "aws4_request");
}
const stamp = () => new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""); // 20260101T000000Z

function target(key) {
  const c = cfg();
  const host = `${c.account}.r2.cloudflarestorage.com`;
  return { host, path: `/${c.bucket}/${encodeKey(key)}`, c };
}

// Link temporal para que el navegador suba un archivo directo a R2 (PUT)
export function presignPut(key, expires = 900) {
  const { host, path, c } = target(key);
  const amz = stamp(), date = amz.slice(0, 8), scope = `${date}/auto/s3/aws4_request`;
  const q = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${c.key}/${scope}`,
    "X-Amz-Date": amz,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host"
  };
  const qs = Object.keys(q).sort().map((k) => `${enc(k)}=${enc(q[k])}`).join("&");
  const canonical = ["PUT", path, qs, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amz, scope, sha256(canonical)].join("\n");
  const sig = crypto.createHmac("sha256", signingKey(c.secret, date)).update(toSign).digest("hex");
  return `https://${host}${path}?${qs}&X-Amz-Signature=${sig}`;
}

// Pedido firmado desde el servidor (leer, escribir o borrar un objeto)
async function signed(method, key, body, extraHeaders = {}) {
  const { host, path, c } = target(key);
  const payload = body == null ? "" : body;
  const amz = stamp(), date = amz.slice(0, 8), scope = `${date}/auto/s3/aws4_request`;
  const hash = sha256(payload);
  const headers = { host, "x-amz-content-sha256": hash, "x-amz-date": amz, ...extraHeaders };
  const names = Object.keys(headers).map((h) => h.toLowerCase()).sort();
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()]));
  const canonical = [method, path, "", names.map((n) => `${n}:${lower[n]}\n`).join(""), names.join(";"), hash].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amz, scope, sha256(canonical)].join("\n");
  const sig = crypto.createHmac("sha256", signingKey(c.secret, date)).update(toSign).digest("hex");
  const auth = `AWS4-HMAC-SHA256 Credential=${c.key}/${scope}, SignedHeaders=${names.join(";")}, Signature=${sig}`;
  const { host: _h, ...send } = headers;
  return fetch(`https://${host}${path}`, { method, headers: { ...send, authorization: auth }, body: body == null ? undefined : body });
}

export async function getObject(key) {
  const r = await signed("GET", key);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`R2 GET ${r.status}`);
  return r.text();
}
export async function putObject(key, body, contentType) {
  const r = await signed("PUT", key, body, { "content-type": contentType });
  if (!r.ok) throw new Error(`R2 PUT ${r.status}: ${await r.text()}`);
}
export async function deleteObject(key) {
  const r = await signed("DELETE", key);
  if (!r.ok && r.status !== 404) throw new Error(`R2 DELETE ${r.status}`);
}

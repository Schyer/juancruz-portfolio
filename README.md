# Portfolio Juan Cruz

Sitio estático (HTML/CSS/JS) + panel `/admin` para que Juan suba sus videos.
Corre gratis en Vercel (plan Hobby) y guarda los videos en Cloudflare R2 (10 GB gratis, sin cobro por transferencia).

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html`, `styles.css`, `main.js` | El sitio |
| `content.js` | Textos y videos por defecto (lo que se ve si Juan todavía no cargó nada) |
| `media/` | Videos e imágenes que vienen con el sitio |
| `admin/` | Panel de contenido (`/admin`) |
| `api/` | Funciones del backend: `content` (leer), `auth` (login), `save` (publicar), `upload` (subir archivos) |
| `dev-server.mjs` | Servidor para probar todo en tu compu |

## Probar en tu compu

```bash
npm install
npm run dev
```

- Sitio: http://localhost:3000
- Panel: http://localhost:3000/admin (contraseña de prueba `juan2026`)

En local los archivos se guardan en la carpeta `.local-blob/` (no se sube a Vercel).

## Subir a Vercel (una sola vez)

1. Subí la carpeta a un repo de GitHub e importalo en Vercel (**Add New → Project**).
   Framework preset: **Other**. Sin build command, output directory vacío (raíz).
2. Creá el almacenamiento en Cloudflare (ver abajo) y cargá las variables en
   **Settings → Environment Variables** (Production, Preview y Development):

| Variable | Qué es |
|---|---|
| `ADMIN_PASSWORD` | Contraseña que le vas a dar a Juan |
| `R2_ACCOUNT_ID` | ID de la cuenta de Cloudflare |
| `R2_ACCESS_KEY_ID` | Access Key del token de R2 |
| `R2_SECRET_ACCESS_KEY` | Secret del token de R2 |
| `R2_BUCKET` | Nombre del bucket (ej. `videos-juan`) |
| `R2_PUBLIC_URL` | Dirección pública del bucket, sin barra final (ej. `https://pub-xxxx.r2.dev`) |

3. **Deployments → Redeploy** para que tome las variables.

## Crear el almacenamiento en Cloudflare R2

1. Cuenta gratis en cloudflare.com → **R2 Object Storage** → activar R2 (puede pedir una tarjeta; no se cobra mientras no se pasen los 10 GB).
2. **Create bucket** → nombre `videos-juan`.
3. En el bucket → **Settings → Public access → R2.dev subdomain → Allow**. Copiá la dirección `https://pub-xxxx.r2.dev` (es `R2_PUBLIC_URL`).
4. En el bucket → **Settings → CORS policy → Add** y pegá (cambiá el dominio por el del sitio):

```json
[
  {
    "AllowedOrigins": ["https://juanncruzz-portfolio.vercel.app", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

5. En **R2 → Manage R2 API Tokens → Create API token** → permiso **Object Read & Write**, limitado a ese bucket.
   Copiá el *Access Key ID* y el *Secret Access Key* (se muestran una sola vez) y el *Account ID*.

Listo: Juan entra a `tudominio.com/admin`, pone la contraseña y desde ahí:

- Cambia el video del inicio y del showreel (pueden ser el mismo).
- Agrega, ordena, edita o elimina reels y trabajos: video, título, descripción, etiquetas y año.
- Toca **Publicar cambios** y se ve al instante en el sitio.

La portada de cada video se genera sola. Los videos verticales (reels) se detectan solos.
Los archivos reemplazados o eliminados se borran del almacenamiento para no ocupar espacio.

## Videos livianos (para no gastar cupo)

- El panel **comprime el video en el navegador** antes de subirlo (máx. 1280 px de lado largo, H.264) cuando pesa más de 12 MB
  o es más grande que eso. Si el navegador no puede (por ejemplo Firefox viejo), sube el original sin avisar problemas.
  Funciona mejor en Chrome o Edge de computadora.
- En el sitio, los videos de preview (reels, showreel, trabajos) **no arrancan solos hasta que el visitante toca, hace click,
  usa una tecla o scroll con rueda**. Antes se ve solo la portada, así no se descarga video de más.

## Límites del plan gratuito

Cloudflare R2: 10 GB de almacenamiento gratis y sin cobro de transferencia (egress). Aun así conviene subir
videos exportados para web (1080p o 720p, H.264). El panel acepta hasta 500 MB por archivo.

## Cambiar textos fijos

Servicios, proceso, frase principal, email y WhatsApp están en `content.js`.

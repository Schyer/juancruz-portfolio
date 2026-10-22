# Portfolio Juan Cruz

Sitio estático (HTML/CSS/JS) + panel `/admin` para que Juan suba sus videos.
Corre gratis en Vercel (plan Hobby) usando Vercel Blob para guardar los videos.

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
2. En el proyecto: **Storage → Create Database → Blob** → conectalo al proyecto.
   Eso crea solo la variable `BLOB_READ_WRITE_TOKEN`.
3. **Settings → Environment Variables** → agregá `ADMIN_PASSWORD` con la contraseña que le vas a dar a Juan.
4. **Deployments → Redeploy** para que tome las variables.

Listo: Juan entra a `tudominio.com/admin`, pone la contraseña y desde ahí:

- Cambia el video del inicio y del showreel (pueden ser el mismo).
- Agrega, ordena, edita o elimina trabajos: video, título, descripción, etiquetas y año.
- Toca **Publicar cambios** y se ve al instante en el sitio.

La portada de cada video se genera sola. Los videos verticales (reels) se detectan solos.
Los archivos reemplazados o eliminados se borran del almacenamiento para no ocupar espacio.

## Límites del plan gratuito

Vercel Blob en Hobby tiene un cupo mensual de almacenamiento y transferencia. Conviene que Juan
exporte los videos para web (1080p o 720p, H.264, idealmente menos de 50–80 MB cada uno).
El panel acepta hasta 500 MB por archivo.

## Cambiar textos fijos

Servicios, proceso, frase principal, email y WhatsApp están en `content.js`.

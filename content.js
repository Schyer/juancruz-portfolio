/* =========================================================
   CONTENIDO DEL SITIO — Juan Cruz
   Todo el texto y los trabajos salen de acá.
   Estos son los valores por defecto. Lo que Juan cargue desde /admin
   (videos, etiquetas, descripciones) pisa estos valores al cargar la página.
   ========================================================= */
window.SITE = {
  name: "juan cruz",
  fullName: "Juan Cruz",
  email: "juancruzz2027@gmail.com",
  whatsapp: { display: "+54 9 11 4063-9945", number: "5491140639945", message: "Hola Juan! Vi tu portfolio y quería consultarte por un proyecto." },
  roles: ["Editor de video", "Content manager"],
  headline: ["Contenido que se planifica,", "se edita y se mide."],
  bio: "Acompaño a marcas y creadores desde la idea hasta el análisis: armo calendarios de contenido, grabo, edito y mido cada publicación.",

  hero: { video: "media/showreel.mp4", poster: "media/showreel.jpg" },
  available: "Disponible para proyectos",

  statement: {
    strong: "Ayudo a marcas y creadores a publicar con constancia:",
    soft: "planifico, grabo, edito y mido para que cada pieza tenga un propósito y un resultado."
  },

  services: [
    {
      title: "Calendario de contenido",
      text: "Organizo pilares, formatos y fechas en una grilla clara para que nunca falte qué publicar.",
      tags: ["Estrategia", "Grilla mensual", "Pilares"],
      icon: "calendar"
    },
    {
      title: "Grabación",
      text: "Guion, plan de rodaje y cámara para aprovechar cada jornada al máximo.",
      tags: ["Guion", "Cámara", "Dirección"],
      icon: "camera"
    },
    {
      title: "Postproducción",
      text: "Edición con ritmo, color, sonido, subtítulos y motion adaptados a cada red.",
      tags: ["Edición", "Color", "Motion"],
      icon: "timeline"
    },
    {
      title: "Análisis de métricas",
      text: "Reviso alcance, retención y engagement para decidir qué repetir y qué cambiar.",
      tags: ["Retención", "Reportes", "Optimización"],
      icon: "chart"
    }
  ],

  showreel: {
    video: "media/showreel.mp4",
    poster: "media/showreel.jpg",
    label: "Historias que retienen"
  },

  works: [
    {
      title: "Fecoteo Studio",
      text: "Video de bienvenida para un estudio de barbería: ritmo, collage de tomas y tipografía animada.",
      tags: ["Edición", "Motion", "Branding"],
      year: "2026",
      video: "media/fecoteo.mp4",
      poster: "media/fecoteo.jpg",
      ratio: "16/9"
    },
    {
      title: "Un día, un beat",
      text: "Serie de reels para un productor musical: proceso en el home studio contado en 40 segundos.",
      tags: ["Reels", "Grabación", "Subtítulos"],
      year: "2026",
      video: "media/un-dia-un-beat.mp4",
      poster: "media/un-dia-un-beat.jpg",
      ratio: "16/9"
    }
  ],

  processTitle: { strong: "Así trabajo,", soft: "de la idea al número." },
  process: [
    { step: "01", title: "Brief y estrategia", meta: "Semana 1", text: "Entiendo tu marca, tu público y tus objetivos. Definimos pilares de contenido y formatos." },
    { step: "02", title: "Calendario", meta: "Mensual", text: "Armo la grilla de publicaciones con fechas, copys y responsables, lista para aprobar." },
    { step: "03", title: "Grabación y edición", meta: "Semanal", text: "Producción ordenada por jornadas y postproducción con entregas listas para cada red." },
    { step: "04", title: "Métricas y ajuste", meta: "Cada mes", text: "Reporte simple de lo que funcionó y lo que no, con próximos pasos concretos." }
  ],

  marquee: ["Reels", "TikTok", "YouTube", "Calendarios", "Edición", "Color", "Motion", "Métricas"]
};

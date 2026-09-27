// Módulos sin tipos propios.

// Pannellum es un script global: al importarlo define window.pannellum (tipado en visor-tour.tsx).
declare module "pannellum/build/pannellum.js";

// Worker de pdf.js cargado en el hilo principal (ver src/lib/admin/imagenes.ts).
declare module "pdfjs-dist/build/pdf.worker.min.mjs";

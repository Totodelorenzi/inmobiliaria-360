# Imágenes del Edificio Mirador

Se dejan en la carpeta `demo-mirador-2/` (al lado del proyecto, no se sube a GitHub) y se cargan con
`npm run imagenes:mirador`. Sirve cualquier formato (jpg, png, webp). Lo que falta se saltea.

| Archivo | Qué es |
|---|---|
| `vista-1`, `vista-2` | Fachadas horizontales 16:9, edificio centrado (calle 1 y calle 2) |
| `planta-subsuelo`, `planta-pb`, `planta-1-2`, `planta-3-4`, `planta-5-7`, `planta-8` | Plantas vistas desde arriba, fondo oscuro liso |
| `maqueta-t1` … `maqueta-t5`, `maqueta-local` | Maqueta de cada tipología, mismo fondo |
| `t3-1-living`, `t3-2-cocina`, … | Renders de cada tipología: tipología, orden y nombre |
| `pileta-1`, `sum-1`, `gimnasio-1`, `lobby-1` | Imágenes de los espacios comunes |
| `cuadros/0001.jpg` … | Cuadros del video del giro (modo "secuencia", se activa en el panel) |

Tipologías: t1 monoambiente (B pisos 1–2), t2 1 dormitorio esquina frente (A y C pisos 1–2, A
pisos 3–4), t3 1 dormitorio esquina contrafrente (D y E pisos 1–2, C pisos 3–4), t4 3 dormitorios en
esquina (B pisos 3–4), t5 semipiso de 3 dormitorios (A y B pisos 5–7), local (Local 1 y 2).
Cada maqueta va dibujada como la unidad de la izquierda: las de la derecha (C, E, 5B–7B, Local 2)
se muestran espejadas solas.

El color de fondo de la página se toma solo del borde de las plantas. Si una planta o una fachada
cambia de encuadre, hay que volver a marcar sus zonas en el panel (Proyecto → Zonas).

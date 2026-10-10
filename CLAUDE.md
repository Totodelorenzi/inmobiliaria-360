@AGENTS.md

# inmobiliaria-360

**Al retomar una sesión: leé primero docs/PROGRESO.md** (estado y próximo paso).

## Aislamiento (regla más importante)

- El proyecto vive SOLO en `C:\Users\Mi PC\inmobiliaria-360`. En cada comando usá rutas absolutas o hacé cd a esta carpeta en el mismo comando. La ruta tiene un espacio: siempre entre comillas.
- Prohibido crear, modificar o borrar archivos en `obraiq-temp`, ObraIQ o cualquier otra carpeta. Prohibido tocar repos, proyectos de Supabase o de Vercel existentes.

## Contexto del proyecto

- Web white-label para inmobiliarias de Argentina: alquiler, venta y emprendimientos en pozo/construcción, con tour 360° (Pannellum) y planos navegables. Panel /admin pensado para el celular.
- Stack: Next.js 16.3.6 (App Router, `src/`, alias `@/*`), React 19.2.8, TypeScript estricto, Tailwind 4, Supabase (Postgres, Auth, Storage) con @supabase/ssr, deploy en Vercel.
- Next 16: el middleware es `proxy.ts`; `params` y `searchParams` son asíncronos; `revalidateTag` pide un segundo argumento. Ante una API dudosa, leé la doc puntual en `node_modules/next/dist/docs/`.
- Entorno: Windows + PowerShell, Node 24, npm 11. Sin Docker: el SQL y la RLS se validan con PGlite (`tests/db/`).
- Sin MCP de Supabase ni de Vercel: usar `npx supabase` y `npx vercel`. `gh` no está instalado; git ya autentica contra GitHub.
- El usuario no es técnico y revisa en los deploys de Vercel, no en local. Vos sí podés correr build, lint, tests y dev.

## Reglas de trabajo

### Eficiencia y tokens

- No releas archivos que ya leíste en la sesión salvo que hayan cambiado. Para archivos grandes, buscá con grep y leé solo el rango necesario.
- Recortá salidas largas: npm con `--no-fund --no-audit --loglevel=error`; logs y listados con `Select-Object -First/-Last` o `head/tail`; nunca vuelques package-lock ni carpetas enteras.
- Para cambios chicos editá la parte puntual; no reescribas archivos completos.
- Durante una etapa verificá solo lo que tocaste (tsc y eslint sobre esos archivos); el build completo y los tests, al cerrar cada etapa.
- Nada de explicaciones largas en el chat. Al cerrar cada etapa: máximo 5 líneas (qué quedó, qué se verificó, próximo paso).
- Mínimas dependencias: preferí librerías mantenidas y livianas; no agregues una librería para algo que se resuelve en 20 líneas.

### Decisiones

- Decidí vos con criterio profesional y registralo en docs/DECISIONES.md. No preguntes cosas que podés resolver.
- Si la especificación choca con la documentación de Next 16 o de una librería, gana la documentación y lo anotás.
- Si algo de la especificación es claramente mejorable (más simple, más robusto, más rápido), hacelo mejor y anotalo.
- Frená y preguntá SOLO para: logins en el navegador del usuario, pagos, permisos de cuentas o cualquier acción que afecte algo fuera de esta carpeta. Cuando frenes, dá instrucciones paso a paso para un usuario no técnico: dónde hacer clic, qué copiar, dónde pegarlo y cómo verificar que salió bien.

### Orden y resiliencia

- Commit al terminar cada etapa (y en medio si la etapa es larga), con mensajes descriptivos en español.
- Actualizá docs/PROGRESO.md en cada commit, así si la sesión se corta, la próxima retoma leyendo CLAUDE.md y docs/PROGRESO.md.
- Secretos: nunca en el repo. La secret/service role key de Supabase y la contraseña del admin solo en `.env.local` y en las variables de Vercel. Nunca en código de cliente.

### Tests contra la base real (regla obligatoria)

- La base de Supabase es una sola (local y producción usan la misma). Ningún test escribe en la demo (`horizonte`) ni en una inmobiliaria real.
- Todo test que escribe opera solo en la inmobiliaria de prueba de su corrida (`es_test = true`, subdominio `e2e-<corrida>`), que `tests/e2e/global-setup.ts` crea con una copia de la demo y `global-teardown.ts` borra entera. Los tests del panel entran con el admin de prueba de la corrida, nunca con el admin real.
- Toda escritura o borrado de limpieza pasa por `tests/e2e/proteccion.ts`, que aborta si el destino no es de prueba (tiene su test en `tests/unit/proteccion-e2e.test.ts`). No borrar archivos de Storage por URL desde los tests: las copias apuntan a archivos de la demo.
- Datos con identificadores únicos por corrida (`unico(info)` en `tests/e2e/utiles.ts`): tests en paralelo no se pisan.
- Los tests de solo lectura pueden mirar la demo (`tests/e2e/demo.spec.ts`) con `Sec-GPC: 1` y sin formularios: no registran visitas.

## Documentación (docs/)

- `PROGRESO.md`: checklist de etapas y próximo paso.
- `SPEC.md`: especificación del producto.
- `DECISIONES.md`: decisiones técnicas (qué y por qué).
- `SETUP-CUENTAS.md`: guía para que el usuario configure Supabase, GitHub y Vercel.
- `PROMPT-ORIGINAL.md`: el encargo completo (etapas, bloqueos, entrega final).

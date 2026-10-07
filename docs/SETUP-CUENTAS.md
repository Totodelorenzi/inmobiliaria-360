# Configuración de cuentas

Guía paso a paso. Hacé los pasos 1 a 4 cuando puedas, mientras yo sigo construyendo. El paso 5 va después del primer deploy: te aviso cuándo.

Al terminar cada paso, escribime en el chat lo que indica "Avisame", así sigo.

## Antes de empezar: dos cosas que vas a usar

**Abrir el archivo de configuración (`.env.local`):**

1. Abrí el Explorador de archivos y andá a `C:\Users\Mi PC\inmobiliaria-360`.
2. Clic derecho sobre el archivo `.env.local` → **Abrir con** → **Bloc de notas**.
3. Cada línea es `NOMBRE=valor`. Reemplazá la palabra `PLACEHOLDER` por el valor, **sin espacios y sin comillas**.
4. Guardá con **Ctrl + S**.

**Abrir PowerShell en la carpeta del proyecto:**

1. En el Explorador, entrá a `C:\Users\Mi PC\inmobiliaria-360`.
2. Hacé clic en la barra de direcciones (donde dice la ruta), escribí `powershell` y apretá **Enter**.
3. Se abre una ventana azul o negra. Para pegar un comando: copialo de acá y hacé **clic derecho** dentro de la ventana. Después apretá **Enter**.
4. Si la primera vez pregunta `Need to install the following packages ... Ok to proceed? (y)`, escribí `y` y apretá **Enter**.

---

## Paso 1: Supabase (base de datos)

> **Importante sobre el plan gratis:** Supabase permite **2 proyectos gratis activos por persona**, sumando todas tus organizaciones (los proyectos pausados no cuentan). Crear una organización nueva sirve para no mezclar con ObraIQ, pero **no suma cupo**. Si ObraIQ ya usa 2 proyectos activos, Supabase no te va a dejar crear este. En ese caso frená y avisame. La decisión es tuya: pausar un proyecto que no uses o pasar a un plan pago. Yo no toco ObraIQ.

**1.1 Crear la organización**

1. Entrá a https://supabase.com/dashboard e iniciá sesión.
2. Arriba a la izquierda, hacé clic en el nombre de tu organización actual → **New organization**.
3. Completá: Name `Inmobiliaria 360`, Type `Personal`, Plan `Free`. Clic en **Create organization**.

**1.2 Crear el proyecto**

1. Dentro de la organización nueva, clic en **New project**.
2. Project name: `inmobiliaria-360`.
3. Database password: clic en **Generate a password** y después en **Copy**. **Pegala ya mismo en `.env.local`**, en la línea `SUPABASE_DB_PASSWORD=`, y guardá.
4. Region: **South America (São Paulo)**. Si solo ves opciones generales, desplegá la lista y buscá "São Paulo" o `sa-east-1`.
5. Clic en **Create new project**. Tarda 1 o 2 minutos en quedar listo.

**1.3 Copiar los datos a `.env.local`**

Con el proyecto abierto, en el menú de la izquierda (abajo de todo) entrá a **Project Settings** (ícono de engranaje).

| Qué copiar | Dónde está en Supabase | Línea de `.env.local` |
|---|---|---|
| Project ID (un código de ~20 letras) | Project Settings → **General** → *Project ID* | `SUPABASE_PROJECT_REF=` |
| Project URL | Project Settings → **Data API** → *Project URL* | `NEXT_PUBLIC_SUPABASE_URL=` |
| Publishable key | Project Settings → **API Keys** → *Publishable key* → botón copiar | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` |
| Secret key | Project Settings → **API Keys** → *Secret keys* → clic en el ojo para revelar → copiar | `SUPABASE_SECRET_KEY=` |

- Si no encontrás la Project URL, armala vos: es `https://` + Project ID + `.supabase.co`.
- Si en API Keys no aparecen claves que empiecen con `sb_`, abrí la pestaña **Legacy API Keys**: usá `anon` como publishable y `service_role` como secret.
- En `ADMIN_EMAIL=` poné el mail con el que vas a entrar al panel de administración.

**Cómo verificar:** en `.env.local` ya no queda ningún `PLACEHOLDER`, la URL termina en `.supabase.co`, la publishable empieza con `sb_publishable_` (o `eyJ` si es legacy) y la secret con `sb_secret_` (o `eyJ`). Guardaste con Ctrl + S.

> La secret key y la contraseña dan acceso total a la base: **no las pegues en el chat**. Yo las leo del archivo.

**Avisame:** `listo paso 1`

---

## Paso 2: Supabase CLI (para que yo pueda cargar la base)

1. Abrí PowerShell en la carpeta del proyecto (ver "Antes de empezar").
2. Pegá este comando y apretá **Enter**:
   ```
   npx supabase login
   ```
3. Se abre el navegador. Si no se abre solo, apretá **Enter** en PowerShell o copiá el link que aparece. Autorizá el acceso con tu cuenta de Supabase.
4. Si la página te muestra un **código de verificación**, copialo, pegalo en PowerShell (clic derecho) y apretá **Enter**.
5. Verificá con:
   ```
   npx supabase projects list
   ```

**Cómo verificar:** aparece una tabla y una de las filas dice `inmobiliaria-360` con región São Paulo. También vas a ver tus otros proyectos: es normal, no los toco.

**Avisame:** `listo paso 2`

---

## Paso 3: GitHub (donde se guarda el código)

1. Entrá a https://github.com/new con tu cuenta.
2. **Owner:** tu usuario personal, no una organización (el plan gratis de Vercel no publica repos privados de organizaciones).
3. **Repository name:** `inmobiliaria-360`.
4. Marcá **Private**.
5. **No marques nada más:** sin README, sin .gitignore (None) y sin licencia (None).
6. Clic en **Create repository**.
7. En la página que aparece ("Quick setup"), con **HTTPS** seleccionado, copiá la dirección. Tiene esta forma: `https://github.com/TU-USUARIO/inmobiliaria-360.git`.

**Cómo verificar:** la página del repo dice que está vacío y muestra el candado de "Private".

**Avisame:** `listo paso 3: <pegá acá la dirección>`. Yo lo conecto y subo el código.

---

## Paso 4: Vercel (donde se publica la web)

1. Abrí PowerShell en la carpeta del proyecto.
2. Pegá este comando y apretá **Enter**:
   ```
   npx vercel login
   ```
3. Se abre el navegador (o PowerShell te muestra un link y un código). Iniciá sesión en Vercel. Si tu cuenta está vinculada a GitHub, usá **Continue with GitHub**. Si te pide confirmar un código, verificá que coincida con el de PowerShell y aceptá.
4. Verificá con:
   ```
   npx vercel whoami
   ```
   Tiene que mostrar tu nombre de usuario de Vercel.

**4.1 Darle acceso a Vercel al repo** (hacelo si en algún momento te digo que Vercel no ve el repositorio)

1. En GitHub, clic en tu foto (arriba a la derecha) → **Settings**.
2. En el menú de la izquierda: **Applications** → pestaña **Installed GitHub Apps** → **Vercel** → **Configure**.
3. En **Repository access**: si está en "Only select repositories", clic en **Select repositories** y agregá `inmobiliaria-360`.
4. Clic en **Save**.

**Cómo verificar:** en esa misma pantalla, `inmobiliaria-360` aparece en la lista de repos con acceso (o está marcado "All repositories").

**Avisame:** `listo paso 4` (y pegame lo que mostró `npx vercel whoami`).

---

## Paso 5: Direcciones de acceso en Supabase (ya hecho por código)

La Site URL (`https://inmobiliaria-360-kohl.vercel.app`), las Redirect URLs, el registro cerrado y las reglas de contraseña se configuraron desde `supabase/config.toml` con `npx supabase config push`. No hace falta tocar nada en el panel de Supabase.

**Cómo verificar (opcional):** en https://supabase.com/dashboard → proyecto `inmobiliaria-360` → **Authentication** → **URL Configuration** se ven la Site URL y las 3 Redirect URLs.

> Mails: el servicio que trae Supabase por defecto solo envía a los mails de los miembros de tu organización de Supabase y no permite usar las plantillas en español. Recuperar tu contraseña funciona. Para **invitar agentes** hace falta un servicio de mails propio (por ejemplo Resend, gratis hasta cierto volumen): cuando lo quieras, te paso los pasos.

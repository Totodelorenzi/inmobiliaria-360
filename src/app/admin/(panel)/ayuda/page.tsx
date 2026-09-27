import { Camera, DraftingCompass, Images, Lightbulb } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Encabezado, Pagina, Panel } from "@/components/admin/ui";
import { requerirSesion } from "@/lib/admin/sesion";

export const metadata: Metadata = { title: "Ayuda" };

function Pasos({ children }: { children: ReactNode }) {
  return <ol className="flex list-decimal flex-col gap-2 pl-5 marker:font-bold marker:text-brand-ink">{children}</ol>;
}

export default async function AyudaPage() {
  await requerirSesion();
  return (
    <Pagina className="max-w-3xl">
      <Encabezado titulo="Ayuda" descripcion="Guías cortas para cargar propiedades que se vendan solas." />
      <div className="flex flex-col gap-5">
        <Panel titulo="Cómo sacar las fotos 360°">
          <div id="fotos-360" className="flex scroll-mt-20 flex-col gap-4 leading-relaxed">
            <p className="flex items-start gap-2">
              <Camera className="mt-1 size-5 shrink-0 text-brand-ink" aria-hidden />
              <span>
                Necesitás una <strong>foto 360° por ambiente</strong>. Lo más simple y con mejor resultado es una cámara 360° (por ejemplo Insta360 o
                Ricoh Theta): se saca en un segundo y ya sale en el formato correcto. También sirve una app de celular que saque “fotos esféricas” o
                “360°”.
              </span>
            </p>
            <Pasos>
              <li>Prendé todas las luces, abrí cortinas y puertas, y ordená: la cámara ve todo, también lo que está detrás.</li>
              <li>
                Poné la cámara en el <strong>centro del ambiente</strong>, a la altura de los ojos (1,5 m). Usá un trípode o palo: la mano sale en la
                foto.
              </li>
              <li>Disparate con el temporizador o desde la app del celular y salí del ambiente (o escondete detrás de una puerta).</li>
              <li>
                Exportá la foto como <strong>JPG “equirectangular”</strong>: tiene que ser el doble de ancha que de alta (por ejemplo 6000×3000). Si
                no lo es, el panel te va a avisar.
              </li>
              <li>
                En el panel, paso <strong>Tour 360°</strong>: subí las fotos en el orden del recorrido (la primera es la entrada), poneles nombre
                (Living, Cocina…) y conectalas con <strong>puntos de paso</strong> tocando las puertas.
              </li>
              <li>Con “Usar esta vista como inicial” elegís hacia dónde mira cada ambiente al abrirse.</li>
            </Pasos>
            <p className="flex items-start gap-2 rounded-xl bg-surface p-3 text-sm">
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-brand-ink" aria-hidden />
              Evitá sacar a contraluz de una ventana y no te acerques a menos de 1 m de muebles o paredes: las uniones de la foto se notan más.
            </p>
          </div>
        </Panel>

        <Panel titulo="Cómo cargar los planos">
          <div id="planos" className="flex scroll-mt-20 flex-col gap-4 leading-relaxed">
            <p className="flex items-start gap-2">
              <DraftingCompass className="mt-1 size-5 shrink-0 text-brand-ink" aria-hidden />
              <span>
                Ideales para propiedades <strong>en pozo o en construcción</strong>, donde todavía no hay fotos. Sirven el PDF del arquitecto o una
                imagen (JPG o PNG).
              </span>
            </p>
            <Pasos>
              <li>
                En el paso <strong>Planos</strong>, tocá “Elegir planos”. Si subís un PDF con varias páginas, cada página queda como un plano
                (Planta baja, Primer piso…). Podés renombrarlos.
              </li>
              <li>
                Tocá sobre el plano para marcar cada ambiente con su nombre. Si ese ambiente tiene foto 360°, vinculala: en la web aparece el botón
                “Ver en 360°”.
              </li>
              <li>Revisá cómo se ve con “Ver en la web” una vez publicada: los planos se pueden agrandar con dos dedos.</li>
            </Pasos>
          </div>
        </Panel>

        <Panel titulo="Fotos comunes que venden">
          <p className="flex items-start gap-2 leading-relaxed">
            <Images className="mt-1 size-5 shrink-0 text-brand-ink" aria-hidden />
            <span>
              Sacalas con el celular en horizontal, de día y con luces prendidas. La primera (principal) es la que se ve en las tarjetas: elegí la
              mejor vista del living o del frente. Con 8 a 15 fotos alcanza. No hace falta achicarlas: el panel las optimiza solo.
            </span>
          </p>
        </Panel>

        <Panel titulo="Mails de invitación y de recuperar contraseña">
          <p className="leading-relaxed text-muted">
            El servicio de mails incluido en Supabase manda pocos mails por hora. Si una invitación no llega, esperá unos minutos y probá de nuevo, y
            revisá la carpeta de spam. Para muchos usuarios conviene configurar un servicio de mails propio (lo puede hacer quien administra el
            sistema).
          </p>
        </Panel>
      </div>
    </Pagina>
  );
}

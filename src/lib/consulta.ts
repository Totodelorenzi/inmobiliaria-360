export type DatosConsulta = {
  agencyId: string;
  propertyId: string | null;
  nombre: string;
  telefono: string;
  email: string;
  mensaje: string;
  /** Casilla de consentimiento (Ley 25.326). */
  acepto: boolean;
};

export type ErroresConsulta = Partial<Record<"nombre" | "contacto" | "email" | "mensaje" | "acepto" | "general", string>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Valida el formulario de consulta. Devuelve null si está todo bien. */
export function validarConsulta(d: DatosConsulta): ErroresConsulta | null {
  const errores: ErroresConsulta = {};
  if (!UUID.test(d.agencyId) || (d.propertyId && !UUID.test(d.propertyId))) {
    errores.general = "No pudimos identificar la propiedad. Recargá la página y probá de nuevo.";
  }
  if (d.nombre.length < 2) errores.nombre = "Escribí tu nombre.";
  else if (d.nombre.length > 120) errores.nombre = "El nombre es demasiado largo.";

  const digitos = d.telefono.replace(/\D/g, "").length;
  if (!d.telefono && !d.email) errores.contacto = "Dejanos un teléfono o un email para poder responderte.";
  else if (d.telefono && (digitos < 6 || digitos > 15)) errores.contacto = "Revisá el teléfono: tiene que tener entre 6 y 15 números.";

  if (d.email && (!EMAIL.test(d.email) || d.email.length > 200)) errores.email = "Revisá el email, parece incompleto.";
  if (d.mensaje.length > 2000) errores.mensaje = "El mensaje es muy largo (máximo 2000 caracteres).";
  if (!d.acepto) errores.acepto = "Para responderte necesitamos que aceptes el uso de tus datos.";

  return Object.keys(errores).length > 0 ? errores : null;
}

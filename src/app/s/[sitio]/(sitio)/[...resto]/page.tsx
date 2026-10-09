import { notFound } from "next/navigation";

// Cualquier dirección inexistente de una inmobiliaria: 404 con su marca (not-found de este grupo).
export default function NoExiste() {
  notFound();
}

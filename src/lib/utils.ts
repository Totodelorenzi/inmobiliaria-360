/** Une clases condicionales. Sin merge: los componentes evitan clases en conflicto. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

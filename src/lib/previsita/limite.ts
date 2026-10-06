/**
 * Límite de tasa en memoria (ventana fija). Vive por instancia del servidor: alcanza para frenar
 * abusos de un mismo navegador o IP; un límite global entre instancias requeriría un KV.
 */
export class Limitador {
  private ventanas = new Map<string, { inicio: number; cuenta: number }>();
  private readonly maximo: number;
  private readonly ventanaMs: number;

  // Campos explícitos (no "parameter properties"): Node ejecuta este archivo quitando solo los tipos.
  constructor(maximo: number, ventanaMs: number) {
    this.maximo = maximo;
    this.ventanaMs = ventanaMs;
  }

  /** true si la clave todavía puede hacer otro pedido en la ventana actual. */
  permitir(clave: string, ahora = Date.now()) {
    const actual = this.ventanas.get(clave);
    if (!actual || ahora - actual.inicio >= this.ventanaMs) {
      if (this.ventanas.size > 20_000) this.limpiar(ahora);
      this.ventanas.set(clave, { inicio: ahora, cuenta: 1 });
      return true;
    }
    actual.cuenta++;
    return actual.cuenta <= this.maximo;
  }

  private limpiar(ahora: number) {
    for (const [clave, v] of this.ventanas) if (ahora - v.inicio >= this.ventanaMs) this.ventanas.delete(clave);
  }
}

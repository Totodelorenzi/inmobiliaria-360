/**
 * Mide tiempo solo mientras la pestaña está visible. `tomar()` devuelve lo acumulado desde la
 * última toma (y sigue contando): sirve para cerrar segmentos al cambiar de escena o de plano.
 */
export class CronometroVisible {
  private acumulado = 0;
  private desde: number | null = null;
  private total = 0;
  private readonly alCambiar = () => (document.visibilityState === "visible" ? this.reanudar() : this.pausar());

  constructor() {
    document.addEventListener("visibilitychange", this.alCambiar);
    if (document.visibilityState === "visible") this.reanudar();
  }

  private reanudar() {
    if (this.desde === null) this.desde = performance.now();
  }

  private pausar() {
    if (this.desde !== null) {
      this.acumulado += performance.now() - this.desde;
      this.desde = null;
    }
  }

  /** Milisegundos visibles desde la toma anterior. */
  tomar() {
    const corriendo = this.desde !== null;
    this.pausar();
    const ms = Math.round(this.acumulado);
    this.total += ms;
    this.acumulado = 0;
    if (corriendo) this.reanudar();
    return ms;
  }

  /** Total visible desde que se creó (incluye el segmento actual). */
  totalMs() {
    const enCurso = this.acumulado + (this.desde !== null ? performance.now() - this.desde : 0);
    return this.total + Math.round(enCurso);
  }

  detener() {
    document.removeEventListener("visibilitychange", this.alCambiar);
    this.pausar();
  }
}

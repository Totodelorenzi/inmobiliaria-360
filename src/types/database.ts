/**
 * Tipos de la base de datos. Provisorio: se escribe a mano en la etapa 2 y después
 * se regenera desde el proyecto real con `npx supabase gen types typescript`.
 */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

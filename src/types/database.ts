/**
 * Tipos de la base de datos, escritos a mano a partir de supabase/migrations con el formato
 * de `supabase gen types`. En la etapa 8 se regeneran desde el proyecto real:
 *   npx supabase gen types typescript --linked --schema public > src/types/database.ts
 */

type Rel<Fk extends string, Col extends string, Ref extends string> = {
  foreignKeyName: Fk;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ["id"];
};

type Table<Row, Insert, Relationships extends unknown[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: Relationships;
};

type E = Database["public"]["Enums"];

export type Database = {
  public: {
    Tables: {
      agencies: Table<
        {
          id: string;
          nombre: string;
          logo_url: string | null;
          color_primario: string;
          whatsapp: string | null;
          email: string | null;
          telefono: string | null;
          direccion: string | null;
          instagram: string | null;
          facebook: string | null;
          created_at: string;
        },
        {
          id?: string;
          nombre: string;
          logo_url?: string | null;
          color_primario?: string;
          whatsapp?: string | null;
          email?: string | null;
          telefono?: string | null;
          direccion?: string | null;
          instagram?: string | null;
          facebook?: string | null;
          created_at?: string;
        }
      >;
      agency_members: Table<
        { user_id: string; agency_id: string; rol: E["rol_miembro"]; created_at: string },
        { user_id: string; agency_id: string; rol?: E["rol_miembro"]; created_at?: string },
        [Rel<"agency_members_agency_id_fkey", "agency_id", "agencies">]
      >;
      properties: Table<
        {
          id: string;
          agency_id: string;
          titulo: string;
          slug: string;
          operacion: E["operacion"];
          tipo: E["tipo_propiedad"];
          estado_obra: E["estado_obra"];
          fecha_entrega: string | null;
          avance_obra_pct: number | null;
          precio: number | null;
          moneda: E["moneda"];
          expensas: number | null;
          acepta_financiacion: boolean;
          detalle_financiacion: string | null;
          apto_credito: boolean;
          direccion: string | null;
          mostrar_direccion_exacta: boolean;
          barrio: string | null;
          ciudad: string | null;
          lat: number | null;
          lng: number | null;
          ambientes: number | null;
          dormitorios: number | null;
          banos: number | null;
          superficie_total: number | null;
          superficie_cubierta: number | null;
          cochera: number;
          amenities: string[];
          descripcion: string | null;
          destacada: boolean;
          publicada: boolean;
          es_demo: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          agency_id: string;
          titulo: string;
          slug: string;
          operacion: E["operacion"];
          tipo: E["tipo_propiedad"];
          estado_obra?: E["estado_obra"];
          fecha_entrega?: string | null;
          avance_obra_pct?: number | null;
          precio?: number | null;
          moneda?: E["moneda"];
          expensas?: number | null;
          acepta_financiacion?: boolean;
          detalle_financiacion?: string | null;
          apto_credito?: boolean;
          direccion?: string | null;
          mostrar_direccion_exacta?: boolean;
          barrio?: string | null;
          ciudad?: string | null;
          lat?: number | null;
          lng?: number | null;
          ambientes?: number | null;
          dormitorios?: number | null;
          banos?: number | null;
          superficie_total?: number | null;
          superficie_cubierta?: number | null;
          cochera?: number;
          amenities?: string[];
          descripcion?: string | null;
          destacada?: boolean;
          publicada?: boolean;
          es_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        [Rel<"properties_agency_id_fkey", "agency_id", "agencies">]
      >;
      property_photos: Table<
        {
          id: string;
          property_id: string;
          url: string;
          thumb_url: string | null;
          orden: number;
          es_principal: boolean;
          created_at: string;
        },
        {
          id?: string;
          property_id: string;
          url: string;
          thumb_url?: string | null;
          orden?: number;
          es_principal?: boolean;
          created_at?: string;
        },
        [Rel<"property_photos_property_id_fkey", "property_id", "properties">]
      >;
      tour_scenes: Table<
        {
          id: string;
          property_id: string;
          nombre_ambiente: string;
          panorama_url: string;
          thumb_url: string | null;
          orden: number;
          yaw_inicial: number;
          pitch_inicial: number;
          created_at: string;
        },
        {
          id?: string;
          property_id: string;
          nombre_ambiente: string;
          panorama_url: string;
          thumb_url?: string | null;
          orden?: number;
          yaw_inicial?: number;
          pitch_inicial?: number;
          created_at?: string;
        },
        [Rel<"tour_scenes_property_id_fkey", "property_id", "properties">]
      >;
      tour_hotspots: Table<
        { id: string; scene_id: string; target_scene_id: string; yaw: number; pitch: number; texto: string | null },
        { id?: string; scene_id: string; target_scene_id: string; yaw: number; pitch: number; texto?: string | null },
        [
          Rel<"tour_hotspots_scene_id_fkey", "scene_id", "tour_scenes">,
          Rel<"tour_hotspots_target_scene_id_fkey", "target_scene_id", "tour_scenes">,
        ]
      >;
      property_plans: Table<
        {
          id: string;
          property_id: string;
          nombre: string;
          url: string;
          thumb_url: string | null;
          orden: number;
          tipo_original: E["tipo_plano"];
          created_at: string;
        },
        {
          id?: string;
          property_id: string;
          nombre: string;
          url: string;
          thumb_url?: string | null;
          orden?: number;
          tipo_original?: E["tipo_plano"];
          created_at?: string;
        },
        [Rel<"property_plans_property_id_fkey", "property_id", "properties">]
      >;
      plan_hotspots: Table<
        { id: string; plan_id: string; x_pct: number; y_pct: number; texto: string; scene_id: string | null },
        { id?: string; plan_id: string; x_pct: number; y_pct: number; texto: string; scene_id?: string | null },
        [
          Rel<"plan_hotspots_plan_id_fkey", "plan_id", "property_plans">,
          Rel<"plan_hotspots_scene_id_fkey", "scene_id", "tour_scenes">,
        ]
      >;
      leads: Table<
        {
          id: string;
          agency_id: string;
          property_id: string | null;
          nombre: string | null;
          telefono: string | null;
          email: string | null;
          mensaje: string | null;
          origen: E["origen_lead"];
          created_at: string;
        },
        {
          id?: string;
          agency_id: string;
          property_id?: string | null;
          nombre?: string | null;
          telefono?: string | null;
          email?: string | null;
          mensaje?: string | null;
          origen?: E["origen_lead"];
          created_at?: string;
        },
        [
          Rel<"leads_agency_id_fkey", "agency_id", "agencies">,
          Rel<"leads_property_id_fkey", "property_id", "properties">,
        ]
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      rol_miembro: "admin" | "agente";
      operacion: "alquiler" | "venta";
      tipo_propiedad: "departamento" | "casa" | "ph" | "local" | "terreno" | "oficina" | "cochera";
      estado_obra: "terminada" | "en_construccion" | "en_pozo";
      moneda: "ARS" | "USD";
      tipo_plano: "imagen" | "pdf";
      origen_lead: "formulario" | "whatsapp_click";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

/** Valores de los enums, para selects y validaciones. */
export const Constants = {
  public: {
    Enums: {
      rol_miembro: ["admin", "agente"],
      operacion: ["alquiler", "venta"],
      tipo_propiedad: ["departamento", "casa", "ph", "local", "terreno", "oficina", "cochera"],
      estado_obra: ["terminada", "en_construccion", "en_pozo"],
      moneda: ["ARS", "USD"],
      tipo_plano: ["imagen", "pdf"],
      origen_lead: ["formulario", "whatsapp_click"],
    },
  },
} as const satisfies { public: { Enums: { [K in keyof PublicSchema["Enums"]]: readonly PublicSchema["Enums"][K][] } } };

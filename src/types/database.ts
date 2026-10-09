// Generado desde la base real. Para regenerar después de una migración:
//   npx supabase gen types typescript --linked --schema public > src/types/database.ts
// (y volver a agregar este encabezado)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          color_primario: string
          created_at: string
          direccion: string | null
          dominio_propio: string | null
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          nombre: string
          subdominio: string
          telefono: string | null
          whatsapp: string | null
        }
        Insert: {
          color_primario?: string
          created_at?: string
          direccion?: string | null
          dominio_propio?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          nombre: string
          subdominio: string
          telefono?: string | null
          whatsapp?: string | null
        }
        Update: {
          color_primario?: string
          created_at?: string
          direccion?: string | null
          dominio_propio?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          nombre?: string
          subdominio?: string
          telefono?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      agency_members: {
        Row: {
          agency_id: string
          created_at: string
          rol: Database["public"]["Enums"]["rol_miembro"]
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          rol?: Database["public"]["Enums"]["rol_miembro"]
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          rol?: Database["public"]["Enums"]["rol_miembro"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agency_id: string
          codigo_ref: string | null
          consentimiento_at: string | null
          created_at: string
          email: string | null
          es_demo: boolean
          estado: Database["public"]["Enums"]["estado_lead"]
          id: string
          mensaje: string | null
          nivel: Database["public"]["Enums"]["nivel_lead"]
          nombre: string | null
          notas: string | null
          origen: Database["public"]["Enums"]["origen_lead"]
          property_id: string | null
          score: number
          score_detalle: Json
          telefono: string | null
          ultima_actividad: string
          updated_at: string
          visitor_id: string | null
        }
        Insert: {
          agency_id: string
          codigo_ref?: string | null
          consentimiento_at?: string | null
          created_at?: string
          email?: string | null
          es_demo?: boolean
          estado?: Database["public"]["Enums"]["estado_lead"]
          id?: string
          mensaje?: string | null
          nivel?: Database["public"]["Enums"]["nivel_lead"]
          nombre?: string | null
          notas?: string | null
          origen?: Database["public"]["Enums"]["origen_lead"]
          property_id?: string | null
          score?: number
          score_detalle?: Json
          telefono?: string | null
          ultima_actividad?: string
          updated_at?: string
          visitor_id?: string | null
        }
        Update: {
          agency_id?: string
          codigo_ref?: string | null
          consentimiento_at?: string | null
          created_at?: string
          email?: string | null
          es_demo?: boolean
          estado?: Database["public"]["Enums"]["estado_lead"]
          id?: string
          mensaje?: string | null
          nivel?: Database["public"]["Enums"]["nivel_lead"]
          nombre?: string | null
          notas?: string | null
          origen?: Database["public"]["Enums"]["origen_lead"]
          property_id?: string | null
          score?: number
          score_detalle?: Json
          telefono?: string | null
          ultima_actividad?: string
          updated_at?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_hotspots: {
        Row: {
          id: string
          plan_id: string
          scene_id: string | null
          texto: string
          x_pct: number
          y_pct: number
        }
        Insert: {
          id?: string
          plan_id: string
          scene_id?: string | null
          texto: string
          x_pct: number
          y_pct: number
        }
        Update: {
          id?: string
          plan_id?: string
          scene_id?: string | null
          texto?: string
          x_pct?: number
          y_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_hotspots_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "property_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_hotspots_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "tour_scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          acepta_financiacion: boolean
          agency_id: string
          ambientes: number | null
          amenities: string[]
          apto_credito: boolean
          avance_obra_pct: number | null
          banos: number | null
          barrio: string | null
          busqueda: string
          ciudad: string | null
          cochera: number
          created_at: string
          descripcion: string | null
          destacada: boolean
          detalle_financiacion: string | null
          direccion: string | null
          dormitorios: number | null
          es_demo: boolean
          estado_obra: Database["public"]["Enums"]["estado_obra"]
          expensas: number | null
          fecha_entrega: string | null
          id: string
          lat: number | null
          lng: number | null
          moneda: Database["public"]["Enums"]["moneda"]
          mostrar_direccion_exacta: boolean
          operacion: Database["public"]["Enums"]["operacion"]
          precio: number | null
          publicada: boolean
          slug: string
          superficie_cubierta: number | null
          superficie_total: number | null
          tipo: Database["public"]["Enums"]["tipo_propiedad"]
          titulo: string
          updated_at: string
        }
        Insert: {
          acepta_financiacion?: boolean
          agency_id: string
          ambientes?: number | null
          amenities?: string[]
          apto_credito?: boolean
          avance_obra_pct?: number | null
          banos?: number | null
          barrio?: string | null
          busqueda?: string
          ciudad?: string | null
          cochera?: number
          created_at?: string
          descripcion?: string | null
          destacada?: boolean
          detalle_financiacion?: string | null
          direccion?: string | null
          dormitorios?: number | null
          es_demo?: boolean
          estado_obra?: Database["public"]["Enums"]["estado_obra"]
          expensas?: number | null
          fecha_entrega?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          moneda?: Database["public"]["Enums"]["moneda"]
          mostrar_direccion_exacta?: boolean
          operacion: Database["public"]["Enums"]["operacion"]
          precio?: number | null
          publicada?: boolean
          slug: string
          superficie_cubierta?: number | null
          superficie_total?: number | null
          tipo: Database["public"]["Enums"]["tipo_propiedad"]
          titulo: string
          updated_at?: string
        }
        Update: {
          acepta_financiacion?: boolean
          agency_id?: string
          ambientes?: number | null
          amenities?: string[]
          apto_credito?: boolean
          avance_obra_pct?: number | null
          banos?: number | null
          barrio?: string | null
          busqueda?: string
          ciudad?: string | null
          cochera?: number
          created_at?: string
          descripcion?: string | null
          destacada?: boolean
          detalle_financiacion?: string | null
          direccion?: string | null
          dormitorios?: number | null
          es_demo?: boolean
          estado_obra?: Database["public"]["Enums"]["estado_obra"]
          expensas?: number | null
          fecha_entrega?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          moneda?: Database["public"]["Enums"]["moneda"]
          mostrar_direccion_exacta?: boolean
          operacion?: Database["public"]["Enums"]["operacion"]
          precio?: number | null
          publicada?: boolean
          slug?: string
          superficie_cubierta?: number | null
          superficie_total?: number | null
          tipo?: Database["public"]["Enums"]["tipo_propiedad"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      property_photos: {
        Row: {
          created_at: string
          es_principal: boolean
          id: string
          orden: number
          property_id: string
          thumb_url: string | null
          url: string
        }
        Insert: {
          created_at?: string
          es_principal?: boolean
          id?: string
          orden?: number
          property_id: string
          thumb_url?: string | null
          url: string
        }
        Update: {
          created_at?: string
          es_principal?: boolean
          id?: string
          orden?: number
          property_id?: string
          thumb_url?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_plans: {
        Row: {
          created_at: string
          id: string
          nombre: string
          orden: number
          property_id: string
          thumb_url: string | null
          tipo_original: Database["public"]["Enums"]["tipo_plano"]
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          property_id: string
          thumb_url?: string | null
          tipo_original?: Database["public"]["Enums"]["tipo_plano"]
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          property_id?: string
          thumb_url?: string | null
          tipo_original?: Database["public"]["Enums"]["tipo_plano"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_plans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_hotspots: {
        Row: {
          id: string
          pitch: number
          scene_id: string
          target_scene_id: string
          texto: string | null
          yaw: number
        }
        Insert: {
          id?: string
          pitch: number
          scene_id: string
          target_scene_id: string
          texto?: string | null
          yaw: number
        }
        Update: {
          id?: string
          pitch?: number
          scene_id?: string
          target_scene_id?: string
          texto?: string | null
          yaw?: number
        }
        Relationships: [
          {
            foreignKeyName: "tour_hotspots_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "tour_scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_hotspots_target_scene_id_fkey"
            columns: ["target_scene_id"]
            isOneToOne: false
            referencedRelation: "tour_scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_scenes: {
        Row: {
          created_at: string
          id: string
          nombre_ambiente: string
          orden: number
          panorama_url: string
          pitch_inicial: number
          property_id: string
          thumb_url: string | null
          yaw_inicial: number
        }
        Insert: {
          created_at?: string
          id?: string
          nombre_ambiente: string
          orden?: number
          panorama_url: string
          pitch_inicial?: number
          property_id: string
          thumb_url?: string | null
          yaw_inicial?: number
        }
        Update: {
          created_at?: string
          id?: string
          nombre_ambiente?: string
          orden?: number
          panorama_url?: string
          pitch_inicial?: number
          property_id?: string
          thumb_url?: string | null
          yaw_inicial?: number
        }
        Relationships: [
          {
            foreignKeyName: "tour_scenes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_links: {
        Row: {
          agency_id: string
          codigo: string
          creado_por: string | null
          created_at: string
          es_demo: boolean
          id: string
          nombre_prospecto: string
          property_id: string
          telefono_prospecto: string | null
          visitor_id: string | null
        }
        Insert: {
          agency_id: string
          codigo: string
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          id?: string
          nombre_prospecto: string
          property_id: string
          telefono_prospecto?: string | null
          visitor_id?: string | null
        }
        Update: {
          agency_id?: string
          codigo?: string
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          id?: string
          nombre_prospecto?: string
          property_id?: string
          telefono_prospecto?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracked_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_links_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_links_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_requests: {
        Row: {
          comentario: string | null
          created_at: string
          forma_pago: Database["public"]["Enums"]["forma_pago"] | null
          franja_preferida: string
          id: string
          lead_id: string
          necesita_vender: boolean | null
          plazo: Database["public"]["Enums"]["plazo_compra"] | null
          presupuesto_aprox: number | null
          property_id: string
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          forma_pago?: Database["public"]["Enums"]["forma_pago"] | null
          franja_preferida?: string
          id?: string
          lead_id: string
          necesita_vender?: boolean | null
          plazo?: Database["public"]["Enums"]["plazo_compra"] | null
          presupuesto_aprox?: number | null
          property_id: string
        }
        Update: {
          comentario?: string | null
          created_at?: string
          forma_pago?: Database["public"]["Enums"]["forma_pago"] | null
          franja_preferida?: string
          id?: string
          lead_id?: string
          necesita_vender?: boolean | null
          plazo?: Database["public"]["Enums"]["plazo_compra"] | null
          presupuesto_aprox?: number | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_events: {
        Row: {
          agency_id: string
          created_at: string
          duracion_ms: number | null
          id: number
          meta: Json
          plan_id: string | null
          property_id: string | null
          scene_id: string | null
          sesion_id: string | null
          tipo: Database["public"]["Enums"]["tipo_evento"]
          visitor_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          duracion_ms?: number | null
          id?: never
          meta?: Json
          plan_id?: string | null
          property_id?: string | null
          scene_id?: string | null
          sesion_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_evento"]
          visitor_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          duracion_ms?: number | null
          id?: never
          meta?: Json
          plan_id?: string | null
          property_id?: string | null
          scene_id?: string | null
          sesion_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_evento"]
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_events_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "property_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_events_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "tour_scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_events_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          agency_id: string
          codigo_ref: string
          created_at: string
          es_demo: boolean
          first_seen: string | null
          id: string
          last_seen: string | null
          tracked_link_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          agency_id: string
          codigo_ref: string
          created_at?: string
          es_demo?: boolean
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          tracked_link_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          agency_id?: string
          codigo_ref?: string
          created_at?: string
          es_demo?: boolean
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          tracked_link_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitors_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_tracked_link_id_fkey"
            columns: ["tracked_link_id"]
            isOneToOne: false
            referencedRelation: "tracked_links"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      estadisticas_propiedades: {
        Args: { p_desde: string }
        Returns: {
          pedidos_visita: number
          property_id: string
          segundos_tour_promedio: number
          tours_completos: number
          tours_iniciados: number
          vieron_planos: number
          visitantes: number
          vistas: number
        }[]
      }
    }
    Enums: {
      estado_lead:
        | "nuevo"
        | "contactado"
        | "visita_agendada"
        | "descartado"
        | "cerrado"
      estado_obra: "terminada" | "en_construccion" | "en_pozo"
      forma_pago: "contado" | "credito_hipotecario" | "financiacion" | "no_sabe"
      moneda: "ARS" | "USD"
      nivel_lead: "frio" | "tibio" | "caliente"
      operacion: "alquiler" | "venta"
      origen_lead:
        | "formulario"
        | "whatsapp_click"
        | "pedido_visita"
        | "link_personalizado"
      plazo_compra: "inmediato" | "1_3_meses" | "3_6_meses" | "mas_6_meses"
      rol_miembro: "admin" | "agente"
      tipo_evento:
        | "view_property"
        | "photo_view"
        | "tour_start"
        | "scene_view"
        | "tour_complete"
        | "plan_view"
        | "plan_point_click"
        | "whatsapp_click"
        | "form_submit"
        | "visit_request"
        | "share"
      tipo_plano: "imagen" | "pdf"
      tipo_propiedad:
        | "departamento"
        | "casa"
        | "ph"
        | "local"
        | "terreno"
        | "oficina"
        | "cochera"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_lead: [
        "nuevo",
        "contactado",
        "visita_agendada",
        "descartado",
        "cerrado",
      ],
      estado_obra: ["terminada", "en_construccion", "en_pozo"],
      forma_pago: ["contado", "credito_hipotecario", "financiacion", "no_sabe"],
      moneda: ["ARS", "USD"],
      nivel_lead: ["frio", "tibio", "caliente"],
      operacion: ["alquiler", "venta"],
      origen_lead: [
        "formulario",
        "whatsapp_click",
        "pedido_visita",
        "link_personalizado",
      ],
      plazo_compra: ["inmediato", "1_3_meses", "3_6_meses", "mas_6_meses"],
      rol_miembro: ["admin", "agente"],
      tipo_evento: [
        "view_property",
        "photo_view",
        "tour_start",
        "scene_view",
        "tour_complete",
        "plan_view",
        "plan_point_click",
        "whatsapp_click",
        "form_submit",
        "visit_request",
        "share",
      ],
      tipo_plano: ["imagen", "pdf"],
      tipo_propiedad: [
        "departamento",
        "casa",
        "ph",
        "local",
        "terreno",
        "oficina",
        "cochera",
      ],
    },
  },
} as const

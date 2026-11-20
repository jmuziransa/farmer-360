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
      demo_farm_records: {
        Row: {
          amount: number
          created_at: string
          detail: string
          id: string
          module: string
          name: string
          quantity: number
          record_date: string
          status: string
          unit: string
        }
        Insert: {
          amount?: number
          created_at?: string
          detail?: string
          id?: string
          module: string
          name: string
          quantity?: number
          record_date?: string
          status?: string
          unit?: string
        }
        Update: {
          amount?: number
          created_at?: string
          detail?: string
          id?: string
          module?: string
          name?: string
          quantity?: number
          record_date?: string
          status?: string
          unit?: string
        }
        Relationships: []
      }
      farm_activity_audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          farm_id: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          farm_id: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          farm_id?: string
          id?: string
        }
        Relationships: []
      }
      farm_entries: {
        Row: {
          amount_ugx: number
          archived_at: string | null
          created_at: string
          detail: string
          farm_id: string
          id: string
          module: string
          name: string
          owner_id: string
          quantity: number
          record_date: string
          status: string
          unit: string
          version: number
        }
        Insert: {
          amount_ugx?: number
          archived_at?: string | null
          created_at?: string
          detail?: string
          farm_id: string
          id?: string
          module: string
          name: string
          owner_id: string
          quantity?: number
          record_date?: string
          status?: string
          unit?: string
          version?: number
        }
        Update: {
          amount_ugx?: number
          archived_at?: string | null
          created_at?: string
          detail?: string
          farm_id?: string
          id?: string
          module?: string
          name?: string
          owner_id?: string
          quantity?: number
          record_date?: string
          status?: string
          unit?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "farm_entries_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          archived: boolean
          created_at: string
          district: string
          farm_type: string
          id: string
          name: string
          owner_id: string
          size_acres: number
          soil_type: string
          village: string
          water_source: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          district?: string
          farm_type?: string
          id?: string
          name: string
          owner_id: string
          size_acres?: number
          soil_type?: string
          village?: string
          water_source?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          district?: string
          farm_type?: string
          id?: string
          name?: string
          owner_id?: string
          size_acres?: number
          soil_type?: string
          village?: string
          water_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "farms_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fields: {
        Row: {
          archived: boolean
          created_at: string
          farm_id: string
          id: string
          irrigation: string
          name: string
          size_acres: number
          soil_type: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          farm_id: string
          id?: string
          irrigation?: string
          name: string
          size_acres?: number
          soil_type?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          farm_id?: string
          id?: string
          irrigation?: string
          name?: string
          size_acres?: number
          soil_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fields_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          archived_at: string | null
          created_at: string
          farm_id: string
          id: string
          minimum_stock: number
          name: string
          owner_id: string
          unit: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          farm_id: string
          id?: string
          minimum_stock?: number
          name: string
          owner_id: string
          unit?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          farm_id?: string
          id?: string
          minimum_stock?: number
          name?: string
          owner_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          item_id: string
          owner_id: string
          quantity: number
          reason: string
          record_date: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          item_id: string
          owner_id: string
          quantity: number
          reason: string
          record_date?: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          item_id?: string
          owner_id?: string
          quantity?: number
          reason?: string
          record_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          category: string
          contact_phone: string
          created_at: string
          description: string
          district: string
          id: string
          price_ugx: number
          quantity: number
          review_reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          seller_id: string
          status: string
          title: string
          unit: string
        }
        Insert: {
          category?: string
          contact_phone: string
          created_at?: string
          description?: string
          district?: string
          id?: string
          price_ugx: number
          quantity?: number
          review_reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_id: string
          status?: string
          title: string
          unit?: string
        }
        Update: {
          category?: string
          contact_phone?: string
          created_at?: string
          description?: string
          district?: string
          id?: string
          price_ugx?: number
          quantity?: number
          review_reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_id?: string
          status?: string
          title?: string
          unit?: string
        }
        Relationships: []
      }
      platform_audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      platform_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          district: string
          full_name: string
          id: string
          language: string
          notifications_enabled: boolean
          phone: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          district?: string
          full_name?: string
          id: string
          language?: string
          notifications_enabled?: boolean
          phone?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          district?: string
          full_name?: string
          id?: string
          language?: string
          notifications_enabled?: boolean
          phone?: string
        }
        Relationships: []
      }
      role_requests: {
        Row: {
          created_at: string
          id: string
          requested_role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requested_role: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requested_role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sacco_loans: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          principal_ugx: number
          purpose: string
          review_reason: string
          reviewed_at: string | null
          status: string
          term_months: number
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          principal_ugx: number
          purpose: string
          review_reason?: string
          reviewed_at?: string | null
          status?: string
          term_months: number
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          principal_ugx?: number
          purpose?: string
          review_reason?: string
          reviewed_at?: string | null
          status?: string
          term_months?: number
        }
        Relationships: []
      }
      sacco_repayments: {
        Row: {
          amount_ugx: number
          created_at: string
          id: string
          loan_id: string
          owner_id: string
          record_date: string
        }
        Insert: {
          amount_ugx: number
          created_at?: string
          id?: string
          loan_id: string
          owner_id: string
          record_date?: string
        }
        Update: {
          amount_ugx?: number
          created_at?: string
          id?: string
          loan_id?: string
          owner_id?: string
          record_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sacco_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "sacco_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      sacco_savings: {
        Row: {
          amount_ugx: number
          created_at: string
          id: string
          kind: string
          note: string
          owner_id: string
          record_date: string
        }
        Insert: {
          amount_ugx: number
          created_at?: string
          id?: string
          kind?: string
          note?: string
          owner_id: string
          record_date?: string
        }
        Update: {
          amount_ugx?: number
          created_at?: string
          id?: string
          kind?: string
          note?: string
          owner_id?: string
          record_date?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_platform: { Args: { _permission: string }; Returns: boolean }
      platform_overview: { Args: never; Returns: Json }
      review_marketplace_listing: {
        Args: { _decision: string; _listing_id: string; _reason: string }
        Returns: undefined
      }
      review_sacco_loan: {
        Args: { _decision: string; _loan_id: string; _reason: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

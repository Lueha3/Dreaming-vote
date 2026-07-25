// 자동 생성 — Supabase MCP generate_typescript_types (project: guldari, drwrrabpcfixpvzwmlii)
// 스키마가 바뀌면 다시 생성해서 덮어쓸 것. 손으로 고치지 말 것.

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      artist_profiles: {
        Row: {
          bio: string | null
          created_at: string
          popularity_score: number
          stage_name: string
          tier: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          popularity_score?: number
          stage_name: string
          tier?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          popularity_score?: number
          stage_name?: string
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendances: {
        Row: {
          concert_id: string
          joined_at: string
          left_at: string | null
          presence_ratio: number | null
          shard_id: string | null
          user_id: string
        }
        Insert: {
          concert_id: string
          joined_at?: string
          left_at?: string | null
          presence_ratio?: number | null
          shard_id?: string | null
          user_id: string
        }
        Update: {
          concert_id?: string
          joined_at?: string
          left_at?: string | null
          presence_ratio?: number | null
          shard_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendances_concert_id_fkey"
            columns: ["concert_id"]
            isOneToOne: false
            referencedRelation: "concerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      concert_stats: {
        Row: {
          avg_stars: number | null
          concert_id: string
          encore_reached: boolean
          encore_reached_at: string | null
          peak_ccu: number
          rating_count: number
          updated_at: string
          weighted_stars: number | null
        }
        Insert: {
          avg_stars?: number | null
          concert_id: string
          encore_reached?: boolean
          encore_reached_at?: string | null
          peak_ccu?: number
          rating_count?: number
          updated_at?: string
          weighted_stars?: number | null
        }
        Update: {
          avg_stars?: number | null
          concert_id?: string
          encore_reached?: boolean
          encore_reached_at?: string | null
          peak_ccu?: number
          rating_count?: number
          updated_at?: string
          weighted_stars?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "concert_stats_concert_id_fkey"
            columns: ["concert_id"]
            isOneToOne: true
            referencedRelation: "concerts"
            referencedColumns: ["id"]
          },
        ]
      }
      concerts: {
        Row: {
          artist_id: string
          created_at: string
          effects_timeline: Json
          funding_cost_sp: number
          id: string
          opening_guest_artist_id: string | null
          opening_guest_song_count: number | null
          scheduled_at: string
          setlist_id: string
          status: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          effects_timeline?: Json
          funding_cost_sp?: number
          id?: string
          opening_guest_artist_id?: string | null
          opening_guest_song_count?: number | null
          scheduled_at: string
          setlist_id: string
          status?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          effects_timeline?: Json
          funding_cost_sp?: number
          id?: string
          opening_guest_artist_id?: string | null
          opening_guest_song_count?: number | null
          scheduled_at?: string
          setlist_id?: string
          status?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concerts_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "concerts_opening_guest_artist_id_fkey"
            columns: ["opening_guest_artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "concerts_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concerts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_registrations: {
        Row: {
          artist_id: string
          created_at: string
          fan_number: number
          id: string
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          fan_number: number
          id?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          fan_number?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_registrations_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fan_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_ledger: {
        Row: {
          artist_id: string
          created_at: string
          fee: number
          gross: number
          id: string
          net: number | null
          paid_at: string | null
          period: string
          source: string
          status: string
          withholding: number
        }
        Insert: {
          artist_id: string
          created_at?: string
          fee?: number
          gross: number
          id?: string
          net?: number | null
          paid_at?: string | null
          period: string
          source: string
          status?: string
          withholding?: number
        }
        Update: {
          artist_id?: string
          created_at?: string
          fee?: number
          gross?: number
          id?: string
          net?: number | null
          paid_at?: string | null
          period?: string
          source?: string
          status?: string
          withholding?: number
        }
        Relationships: [
          {
            foreignKeyName: "payout_ledger_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          abuse_flag: boolean
          avatar_config: Json
          created_at: string
          deleted_at: string | null
          id: string
          nickname: string
          verified_ci: boolean
        }
        Insert: {
          abuse_flag?: boolean
          avatar_config?: Json
          created_at?: string
          deleted_at?: string | null
          id: string
          nickname: string
          verified_ci?: boolean
        }
        Update: {
          abuse_flag?: boolean
          avatar_config?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          nickname?: string
          verified_ci?: boolean
        }
        Relationships: []
      }
      ranking_seasons: {
        Row: {
          ends_at: string
          id: string
          quarter: string
          starts_at: string
          status: string
        }
        Insert: {
          ends_at: string
          id?: string
          quarter: string
          starts_at: string
          status?: string
        }
        Update: {
          ends_at?: string
          id?: string
          quarter?: string
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          best_moment_ts: number | null
          concert_id: string
          created_at: string
          id: string
          segment: string
          stars: number
          user_id: string
        }
        Insert: {
          best_moment_ts?: number | null
          concert_id: string
          created_at?: string
          id?: string
          segment?: string
          stars: number
          user_id: string
        }
        Update: {
          best_moment_ts?: number | null
          concert_id?: string
          created_at?: string
          id?: string
          segment?: string
          stars?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_concert_id_user_id_fkey"
            columns: ["concert_id", "user_id"]
            isOneToOne: false
            referencedRelation: "attendances"
            referencedColumns: ["concert_id", "user_id"]
          },
        ]
      }
      season_scores: {
        Row: {
          artist_id: string
          id: string
          prize_paid: boolean
          prize_tier: string | null
          rank: number | null
          season_id: string
          weighted_score: number
        }
        Insert: {
          artist_id: string
          id?: string
          prize_paid?: boolean
          prize_tier?: string | null
          rank?: number | null
          season_id: string
          weighted_score?: number
        }
        Update: {
          artist_id?: string
          id?: string
          prize_paid?: boolean
          prize_tier?: string | null
          rank?: number | null
          season_id?: string
          weighted_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_scores_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "season_scores_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "ranking_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      setlist_items: {
        Row: {
          position: number
          setlist_id: string
          song_id: string
        }
        Insert: {
          position: number
          setlist_id: string
          song_id: string
        }
        Update: {
          position?: number
          setlist_id?: string
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setlist_items_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_items_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      setlists: {
        Row: {
          artist_id: string
          created_at: string
          id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setlists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      songs: {
        Row: {
          acr_result: Json | null
          ai_probability: number | null
          ai_tool: string | null
          artist_id: string
          audio_url: string | null
          created_at: string
          duration_seconds: number
          hls_url: string | null
          id: string
          review_status: string
          source_type: string
          title: string
          updated_at: string
        }
        Insert: {
          acr_result?: Json | null
          ai_probability?: number | null
          ai_tool?: string | null
          artist_id: string
          audio_url?: string | null
          created_at?: string
          duration_seconds: number
          hls_url?: string | null
          id?: string
          review_status?: string
          source_type: string
          title: string
          updated_at?: string
        }
        Update: {
          acr_result?: Json | null
          ai_probability?: number | null
          ai_tool?: string | null
          artist_id?: string
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number
          hls_url?: string | null
          id?: string
          review_status?: string
          source_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "songs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sp_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          reason: string
          ref_id: string | null
          seq: number
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          reason: string
          ref_id?: string | null
          seq?: never
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          reason?: string
          ref_id?: string | null
          seq?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sp_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          capacity: number
          created_at: string
          id: string
          name: string
          physics_profile: Json
          scene_asset_key: string | null
          tier: string
        }
        Insert: {
          capacity: number
          created_at?: string
          id?: string
          name: string
          physics_profile?: Json
          scene_asset_key?: string | null
          tier: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          name?: string
          physics_profile?: Json
          scene_asset_key?: string | null
          tier?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      trust_weight: {
        Args: {
          p_abuse_flag: boolean
          p_created_at: string
          p_verified_ci: boolean
        }
        Returns: number
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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

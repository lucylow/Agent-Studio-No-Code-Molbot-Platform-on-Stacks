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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bots: {
        Row: {
          active: boolean
          created_at: string
          id: number
          name: string
          on_chain_id: number | null
          owner_id: string
          price_amount: number
          price_asset: string
          price_model: string
          skills: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: number
          name: string
          on_chain_id?: number | null
          owner_id: string
          price_amount?: number
          price_asset?: string
          price_model: string
          skills?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: number
          name?: string
          on_chain_id?: number | null
          owner_id?: string
          price_amount?: number
          price_asset?: string
          price_model?: string
          skills?: Json
          updated_at?: string
        }
        Relationships: []
      }
      dao_proposals: {
        Row: {
          action_amount: number | null
          action_asset: string | null
          action_recipient: string | null
          against_votes: number
          cancelled: boolean
          created_at: string
          description: string
          end_block: number
          executed: boolean
          for_votes: number
          id: number
          proposal_id: number
          proposal_type: string
          proposer_id: string
          start_block: number
          title: string
          updated_at: string
        }
        Insert: {
          action_amount?: number | null
          action_asset?: string | null
          action_recipient?: string | null
          against_votes?: number
          cancelled?: boolean
          created_at?: string
          description?: string
          end_block?: number
          executed?: boolean
          for_votes?: number
          id?: number
          proposal_id: number
          proposal_type?: string
          proposer_id: string
          start_block?: number
          title: string
          updated_at?: string
        }
        Update: {
          action_amount?: number | null
          action_asset?: string | null
          action_recipient?: string | null
          against_votes?: number
          cancelled?: boolean
          created_at?: string
          description?: string
          end_block?: number
          executed?: boolean
          for_votes?: number
          id?: number
          proposal_id?: number
          proposal_type?: string
          proposer_id?: string
          start_block?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      dao_treasury: {
        Row: {
          asset: string
          balance: number
          id: number
          total_deposited: number
          total_withdrawn: number
          updated_at: string
        }
        Insert: {
          asset: string
          balance?: number
          id?: number
          total_deposited?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Update: {
          asset?: string
          balance?: number
          id?: number
          total_deposited?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Relationships: []
      }
      dao_votes: {
        Row: {
          created_at: string
          id: number
          proposal_id: number
          support: boolean
          voter_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: number
          proposal_id: number
          support: boolean
          voter_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: number
          proposal_id?: number
          support?: boolean
          voter_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "dao_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "dao_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          id: number
          payment_tx_id: string | null
          provider_bot_id: number
          requester_bot_id: number
          requester_user_id: string
          result: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          payment_tx_id?: string | null
          provider_bot_id: number
          requester_bot_id: number
          requester_user_id: string
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          payment_tx_id?: string | null
          provider_bot_id?: number
          requester_bot_id?: number
          requester_user_id?: string
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_provider_bot_id_fkey"
            columns: ["provider_bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_requester_bot_id_fkey"
            columns: ["requester_bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      nft_tokens: {
        Row: {
          bot_id: number
          burned: boolean
          burned_at: string | null
          created_at: string
          id: number
          metadata_uri: string | null
          mint_fee: number
          mint_fee_asset: string
          mint_tx_id: string | null
          minted_at: string
          name: string
          owner_id: string
          token_id: number
          updated_at: string
        }
        Insert: {
          bot_id: number
          burned?: boolean
          burned_at?: string | null
          created_at?: string
          id?: number
          metadata_uri?: string | null
          mint_fee?: number
          mint_fee_asset?: string
          mint_tx_id?: string | null
          minted_at?: string
          name: string
          owner_id: string
          token_id: number
          updated_at?: string
        }
        Update: {
          bot_id?: number
          burned?: boolean
          burned_at?: string | null
          created_at?: string
          id?: number
          metadata_uri?: string | null
          mint_fee?: number
          mint_fee_asset?: string
          mint_tx_id?: string | null
          minted_at?: string
          name?: string
          owner_id?: string
          token_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      swarm_jobs: {
        Row: {
          client_id: string
          created_at: string
          id: number
          payment_amount: number
          payment_asset: string
          payment_tx_id: string | null
          result_hash: string | null
          status: string
          swarm_id: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: number
          payment_amount: number
          payment_asset?: string
          payment_tx_id?: string | null
          result_hash?: string | null
          status?: string
          swarm_id: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: number
          payment_amount?: number
          payment_asset?: string
          payment_tx_id?: string | null
          result_hash?: string | null
          status?: string
          swarm_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "swarm_jobs_swarm_id_fkey"
            columns: ["swarm_id"]
            isOneToOne: false
            referencedRelation: "swarms"
            referencedColumns: ["id"]
          },
        ]
      }
      swarms: {
        Row: {
          created_at: string
          creator_id: string
          id: number
          members: Json
          min_bond: number
          name: string
          required_skills: Json
          status: string
          task_description: string
          total_earned: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: number
          members?: Json
          min_bond?: number
          name: string
          required_skills?: Json
          status?: string
          task_description?: string
          total_earned?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: number
          members?: Json
          min_bond?: number
          name?: string
          required_skills?: Json
          status?: string
          task_description?: string
          total_earned?: number
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          asset: string
          created_at: string
          from_bot_id: number | null
          id: string
          metadata: Json | null
          status: string
          to_bot_id: number | null
          tx_id: string | null
          tx_type: string
        }
        Insert: {
          amount: number
          asset: string
          created_at?: string
          from_bot_id?: number | null
          id?: string
          metadata?: Json | null
          status?: string
          to_bot_id?: number | null
          tx_id?: string | null
          tx_type?: string
        }
        Update: {
          amount?: number
          asset?: string
          created_at?: string
          from_bot_id?: number | null
          id?: string
          metadata?: Json | null
          status?: string
          to_bot_id?: number | null
          tx_id?: string | null
          tx_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_from_bot_id_fkey"
            columns: ["from_bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_bot_id_fkey"
            columns: ["to_bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

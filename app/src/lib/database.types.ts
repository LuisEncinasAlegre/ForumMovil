// Tipos de la base de datos con el formato que genera Supabase.
// No se editan a mano: se regeneran desde el dashboard (API Docs → TypeScript) o con
// `npx supabase gen types typescript --remote=<ref> --schema public` después de cada migración.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      comment_edits: {
        Row: {
          comment_id: number;
          content: string;
          id: number;
          replaced_at: string;
          written_at: string;
        };
        Insert: {
          comment_id: number;
          content: string;
          id?: never;
          replaced_at?: string;
          written_at: string;
        };
        Update: {
          comment_id?: number;
          content?: string;
          id?: never;
          replaced_at?: string;
          written_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comment_edits_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
        ];
      };
      comments: {
        Row: {
          author_id: string;
          content: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: number;
          post_id: number;
          status: string;
        };
        Insert: {
          author_id?: string;
          content: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: never;
          post_id: number;
          status?: string;
        };
        Update: {
          author_id?: string;
          content?: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: never;
          post_id?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
      moderation_notices: {
        Row: {
          category: string;
          comment_id: number | null;
          counts_as_warning: boolean;
          created_at: string;
          excerpt: string;
          id: number;
          message: string;
          post_id: number | null;
          seen_at: string | null;
          user_id: string;
          withdrawn_at: string | null;
        };
        Insert: {
          category: string;
          comment_id?: number | null;
          counts_as_warning?: boolean;
          created_at?: string;
          excerpt: string;
          id?: never;
          message: string;
          post_id?: number | null;
          seen_at?: string | null;
          user_id: string;
          withdrawn_at?: string | null;
        };
        Update: {
          category?: string;
          comment_id?: number | null;
          counts_as_warning?: boolean;
          created_at?: string;
          excerpt?: string;
          id?: never;
          message?: string;
          post_id?: number | null;
          seen_at?: string | null;
          user_id?: string;
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'moderation_notices_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderation_notices_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderation_notices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      post_edits: {
        Row: {
          content: string;
          id: number;
          post_id: number;
          replaced_at: string;
          title: string;
          written_at: string;
        };
        Insert: {
          content: string;
          id?: never;
          post_id: number;
          replaced_at?: string;
          title: string;
          written_at: string;
        };
        Update: {
          content?: string;
          id?: never;
          post_id?: number;
          replaced_at?: string;
          title?: string;
          written_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_edits_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
      posts: {
        Row: {
          author_id: string;
          content: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: number;
          status: string;
          title: string;
        };
        Insert: {
          author_id?: string;
          content: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: never;
          status?: string;
          title: string;
        };
        Update: {
          author_id?: string;
          content?: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: never;
          status?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_private: {
        Row: {
          created_at: string;
          rules_accepted_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          rules_accepted_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          rules_accepted_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_private_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          color: string | null;
          display_name: string;
          id: string;
          restriction: string | null;
        };
        Insert: {
          color?: string | null;
          display_name: string;
          id: string;
        };
        Update: {
          color?: string | null;
          display_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          comment_id: number | null;
          created_at: string;
          id: number;
          post_id: number | null;
          reason: string;
          reporter_id: string;
        };
        Insert: {
          comment_id?: number | null;
          created_at?: string;
          id?: never;
          post_id?: number | null;
          reason: string;
          reporter_id?: string;
        };
        Update: {
          comment_id?: number | null;
          created_at?: string;
          id?: never;
          post_id?: number | null;
          reason?: string;
          reporter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_devices: {
        Row: {
          device_id: string;
          first_seen: string;
          platform: string;
          user_id: string;
        };
        Insert: {
          device_id: string;
          first_seen?: string;
          platform: string;
          user_id?: string;
        };
        Update: {
          device_id?: string;
          first_seen?: string;
          platform?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_devices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      audit_api_surface: {
        Args: never;
        Returns: {
          detail: string;
          kind: string;
          object_name: string;
          role_name: string;
        }[];
      };
      get_my_active_ban: {
        Args: never;
        Returns: {
          ends_at: string;
          reason: string;
        }[];
      };
      mod_ban: {
        Args: {
          alias: string;
          hours?: number;
          moderator_id: number;
          reason: string;
        };
        Returns: Json;
      };
      mod_get_author: { Args: { alias: string }; Returns: Json };
      mod_get_content: {
        Args: { target_comment_id: number; target_post_id: number };
        Returns: Json;
      };
      mod_hide: {
        Args: {
          category: string;
          message: string;
          moderator_id: number;
          target_comment_id: number;
          target_post_id: number;
        };
        Returns: undefined;
      };
      mod_list_pending: { Args: { max_items?: number }; Returns: Json };
      mod_mark_reviewed: {
        Args: {
          moderator_id: number;
          note?: string;
          target_comment_id: number;
          target_post_id: number;
        };
        Returns: undefined;
      };
      mod_restore: {
        Args: {
          moderator_id: number;
          note?: string;
          target_comment_id: number;
          target_post_id: number;
        };
        Returns: undefined;
      };
      mod_summary: { Args: { since: string }; Returns: Json };
      mod_unban: {
        Args: { alias: string; moderator_id: number; note?: string };
        Returns: undefined;
      };
      mod_whoami: { Args: { token: string }; Returns: number };
      restriction: {
        Args: { '': Database['public']['Tables']['profiles']['Row'] };
        Returns: {
          error: true;
        } & 'the function public.restriction with parameter or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache';
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

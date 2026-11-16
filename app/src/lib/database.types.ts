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
      profiles: {
        Row: {
          color: string | null;
          created_at: string;
          display_name: string;
          id: string;
          rules_accepted_at: string | null;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          rules_accepted_at?: string | null;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          rules_accepted_at?: string | null;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
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

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
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

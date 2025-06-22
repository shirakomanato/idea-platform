export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          wallet_address: string
          nickname: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wallet_address: string
          nickname?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wallet_address?: string
          nickname?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ideas: {
        Row: {
          id: string
          user_id: string | null
          wallet_address: string | null
          title: string
          target: string
          why_description: string
          what_description: string
          how_description: string
          impact_description: string
          status: 'idea' | 'pre-draft' | 'draft' | 'commit' | 'in-progress' | 'test' | 'finish' | 'archive'
          likes_count: number
          comments_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          wallet_address?: string | null
          title: string
          target: string
          why_description: string
          what_description: string
          how_description: string
          impact_description: string
          status?: 'idea' | 'pre-draft' | 'draft' | 'commit' | 'in-progress' | 'test' | 'finish' | 'archive'
          likes_count?: number
          comments_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          wallet_address?: string | null
          title?: string
          target?: string
          why_description?: string
          what_description?: string
          how_description?: string
          impact_description?: string
          status?: 'idea' | 'pre-draft' | 'draft' | 'commit' | 'in-progress' | 'test' | 'finish' | 'archive'
          likes_count?: number
          comments_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          idea_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          idea_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          idea_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      likes: {
        Row: {
          id: string
          idea_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          idea_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          idea_id?: string
          user_id?: string
          created_at?: string
        }
      }
      collaborations: {
        Row: {
          id: string
          idea_id: string
          user_id: string
          role: 'contributor' | 'co-owner' | 'mentor'
          status: 'pending' | 'accepted' | 'declined'
          message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          idea_id: string
          user_id: string
          role?: 'contributor' | 'co-owner' | 'mentor'
          status?: 'pending' | 'accepted' | 'declined'
          message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          idea_id?: string
          user_id?: string
          role?: 'contributor' | 'co-owner' | 'mentor'
          status?: 'pending' | 'accepted' | 'declined'
          message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_current_user_wallet: {
        Args: {
          wallet_address: string
        }
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

// Helper types
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Idea = Database['public']['Tables']['ideas']['Row']
export type IdeaInsert = Database['public']['Tables']['ideas']['Insert']
export type IdeaUpdate = Database['public']['Tables']['ideas']['Update']

export type Comment = Database['public']['Tables']['comments']['Row']
export type CommentInsert = Database['public']['Tables']['comments']['Insert']
export type CommentUpdate = Database['public']['Tables']['comments']['Update']

export type Like = Database['public']['Tables']['likes']['Row']
export type LikeInsert = Database['public']['Tables']['likes']['Insert']

export type Collaboration = Database['public']['Tables']['collaborations']['Row']
export type CollaborationInsert = Database['public']['Tables']['collaborations']['Insert']
export type CollaborationUpdate = Database['public']['Tables']['collaborations']['Update']

// Extended types with relations
export type IdeaWithUser = Idea & {
  users: Pick<User, 'id' | 'nickname' | 'avatar_url' | 'wallet_address'>
}

export type CommentWithUser = Comment & {
  users: Pick<User, 'id' | 'nickname' | 'avatar_url' | 'wallet_address'>
}
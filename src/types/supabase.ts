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
      purchases: {
        Row: {
          id: string
          reference: string
          customer_info: Json
          items: Json
          total_amount: number
          qr_code: string
          status: 'completed' | 'pending' | 'failed'
          created_at: string
          updated_at: string
          entries_used: number
        }
        Insert: {
          id?: string
          reference: string
          customer_info: Json
          items: Json
          total_amount: number
          qr_code?: string
          status?: 'completed' | 'pending' | 'failed'
          created_at?: string
          updated_at?: string
          entries_used?: number
        }
        Update: {
          id?: string
          reference?: string
          customer_info?: Json
          items?: Json
          total_amount?: number
          qr_code?: string
          status?: 'completed' | 'pending' | 'failed'
          created_at?: string
          updated_at?: string
          entries_used?: number
        }
      }
      tickets: {
        Row: {
          id: string
          ticket_number: string
          qr_code: string
          purchase_id: string
          ticket_type_id: string
          status: 'valid' | 'used'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ticket_number: string
          qr_code: string
          purchase_id: string
          ticket_type_id: string
          status?: 'valid' | 'used'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ticket_number?: string
          qr_code?: string
          purchase_id?: string
          ticket_type_id?: string
          status?: 'valid' | 'used'
          created_at?: string
          updated_at?: string
        }
      }
      entries: {
        Row: {
          id: string
          ticket_id: string
          purchase_id: string
          scanned_at: string
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          purchase_id: string
          scanned_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          purchase_id?: string
          scanned_at?: string
          created_at?: string
        }
      }
    }
    Functions: {
      validate_ticket: {
        Args: {
          ticket_id: string
          purchase_id: string
        }
        Returns: void
      }
    }
  }
} 
/**
 * Supabase database types.
 *
 * GENERATED FILE — regenerate with `npm run gen:types` (needs the local stack
 * running) after every migration. Do not hand-edit.
 *
 * Slice 0 has no tables yet, so this is the empty shape the generator emits.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      [_ in never]: never;
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

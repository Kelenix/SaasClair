
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": Json | null,"id": number,"target": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: Json | null,"id"?: never,"target"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: Json | null,"id"?: never,"target"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"alert_settings": {
                  Row: {
                    "disabled_alerts": (string)[],"email_enabled": boolean,"owner_id": string,"slack_webhook_url": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "disabled_alerts"?: (string)[],"email_enabled"?: boolean,"owner_id"?: string,"slack_webhook_url"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "disabled_alerts"?: (string)[],"email_enabled"?: boolean,"owner_id"?: string,"slack_webhook_url"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"billing_events": {
                  Row: {
                    "id": string,"received_at": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"received_at"?: string,"type": string
                  }
                  Update: {
                    "id"?: string,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"events": {
                  Row: {
                    "channel": string,"device": string | null,"email_hash": string | null,"id": number,"occurred_at": string,"path": string,"project_id": string,"referrer_host": string | null,"type": string,"utm_campaign": string | null,"utm_medium": string | null,"utm_source": string | null,"visitor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel": string,"device"?: string | null,"email_hash"?: string | null,"id"?: never,"occurred_at"?: string,"path"?: string,"project_id": string,"referrer_host"?: string | null,"type": string,"utm_campaign"?: string | null,"utm_medium"?: string | null,"utm_source"?: string | null,"visitor_id": string
                  }
                  Update: {
                    "channel"?: string,"device"?: string | null,"email_hash"?: string | null,"id"?: never,"occurred_at"?: string,"path"?: string,"project_id"?: string,"referrer_host"?: string | null,"type"?: string,"utm_campaign"?: string | null,"utm_medium"?: string | null,"utm_source"?: string | null,"visitor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"faq_items": {
                  Row: {
                    "answer": string,"created_at": string,"id": string,"is_published": boolean,"position": number,"question": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"position"?: number,"question": string,"updated_at"?: string
                  }
                  Update: {
                    "answer"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"position"?: number,"question"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"insight_feedback": {
                  Row: {
                    "created_at": string,"insight_id": string,"owner_id": string,"status": Database["public"]['Enums']["insight_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"insight_id": string,"owner_id"?: string,"status": Database["public"]['Enums']["insight_status"]
                  }
                  Update: {
                    "created_at"?: string,"insight_id"?: string,"owner_id"?: string,"status"?: Database["public"]['Enums']["insight_status"]
                  }
                  Relationships: [
                    
                  ]
                },"newsletter_subscribers": {
                  Row: {
                    "created_at": string,"email": string,"id": string,"source": string,"unsubscribed_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"id"?: string,"source"?: string,"unsubscribed_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string,"source"?: string,"unsubscribed_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "admin_note": string | null,"billing_interval": Database["public"]['Enums']["billing_interval"] | null,"cancel_at_period_end": boolean,"created_at": string,"current_period_end": string | null,"custom_monthly_price": number | null,"email": string,"first_name": string,"id": string,"last_seen_at": string | null,"last_sign_in_at": string | null,"payment_method": Database["public"]['Enums']["payment_method"] | null,"plan": Database["public"]['Enums']["plan_id"],"role": Database["public"]['Enums']["app_role"],"signup_campaign": string | null,"signup_channel": string,"signup_landing": string | null,"signup_medium": string | null,"signup_referrer": string | null,"signup_source": string | null,"stripe_customer_id": string | null,"stripe_subscription_id": string | null,"subscription_status": Database["public"]['Enums']["subscription_status"],"trial_ends_at": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_note"?: string | null,"billing_interval"?: Database["public"]['Enums']["billing_interval"] | null,"cancel_at_period_end"?: boolean,"created_at"?: string,"current_period_end"?: string | null,"custom_monthly_price"?: number | null,"email": string,"first_name"?: string,"id": string,"last_seen_at"?: string | null,"last_sign_in_at"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"plan"?: Database["public"]['Enums']["plan_id"],"role"?: Database["public"]['Enums']["app_role"],"signup_campaign"?: string | null,"signup_channel"?: string,"signup_landing"?: string | null,"signup_medium"?: string | null,"signup_referrer"?: string | null,"signup_source"?: string | null,"stripe_customer_id"?: string | null,"stripe_subscription_id"?: string | null,"subscription_status"?: Database["public"]['Enums']["subscription_status"],"trial_ends_at"?: string,"updated_at"?: string
                  }
                  Update: {
                    "admin_note"?: string | null,"billing_interval"?: Database["public"]['Enums']["billing_interval"] | null,"cancel_at_period_end"?: boolean,"created_at"?: string,"current_period_end"?: string | null,"custom_monthly_price"?: number | null,"email"?: string,"first_name"?: string,"id"?: string,"last_seen_at"?: string | null,"last_sign_in_at"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"plan"?: Database["public"]['Enums']["plan_id"],"role"?: Database["public"]['Enums']["app_role"],"signup_campaign"?: string | null,"signup_channel"?: string,"signup_landing"?: string | null,"signup_medium"?: string | null,"signup_referrer"?: string | null,"signup_source"?: string | null,"stripe_customer_id"?: string | null,"stripe_subscription_id"?: string | null,"subscription_status"?: Database["public"]['Enums']["subscription_status"],"trial_ends_at"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"projects": {
                  Row: {
                    "anonymize_visitors": boolean,"audit": Json | null,"audited_at": string | null,"checkout_url": string | null,"created_at": string,"id": string,"owner_id": string,"pricing_url": string | null,"script_detected_at": string | null,"setup_skipped_at": string | null,"signup_url": string | null,"site_key": string | null,"site_url": string | null,"stripe_account_id": string | null,"stripe_connected_at": string | null,"stripe_livemode": boolean | null,"stripe_sync_status": string | null,"stripe_synced_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anonymize_visitors"?: boolean,"audit"?: Json | null,"audited_at"?: string | null,"checkout_url"?: string | null,"created_at"?: string,"id"?: string,"owner_id"?: string,"pricing_url"?: string | null,"script_detected_at"?: string | null,"setup_skipped_at"?: string | null,"signup_url"?: string | null,"site_key"?: never,"site_url"?: string | null,"stripe_account_id"?: string | null,"stripe_connected_at"?: string | null,"stripe_livemode"?: boolean | null,"stripe_sync_status"?: string | null,"stripe_synced_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "anonymize_visitors"?: boolean,"audit"?: Json | null,"audited_at"?: string | null,"checkout_url"?: string | null,"created_at"?: string,"id"?: string,"owner_id"?: string,"pricing_url"?: string | null,"script_detected_at"?: string | null,"setup_skipped_at"?: string | null,"signup_url"?: string | null,"site_key"?: never,"site_url"?: string | null,"stripe_account_id"?: string | null,"stripe_connected_at"?: string | null,"stripe_livemode"?: boolean | null,"stripe_sync_status"?: string | null,"stripe_synced_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"site_pages": {
                  Row: {
                    "body": string,"intro": string,"is_published": boolean,"slug": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"intro"?: string,"is_published"?: boolean,"slug": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"intro"?: string,"is_published"?: boolean,"slug"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"site_settings": {
                  Row: {
                    "contact_email": string | null,"ga4_id": string | null,"google_ads_conversion_label": string | null,"google_ads_id": string | null,"id": number,"linkedin_partner_id": string | null,"meta_pixel_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_email"?: string | null,"ga4_id"?: string | null,"google_ads_conversion_label"?: string | null,"google_ads_id"?: string | null,"id"?: number,"linkedin_partner_id"?: string | null,"meta_pixel_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "contact_email"?: string | null,"ga4_id"?: string | null,"google_ads_conversion_label"?: string | null,"google_ads_id"?: string | null,"id"?: number,"linkedin_partner_id"?: string | null,"meta_pixel_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"stripe_customers": {
                  Row: {
                    "created_at": string,"email": string | null,"email_hash": string | null,"id": string,"name": string | null,"project_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at": string,"email"?: string | null,"email_hash"?: string | null,"id": string,"name"?: string | null,"project_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"email_hash"?: string | null,"id"?: string,"name"?: string | null,"project_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stripe_customers_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"stripe_invoices": {
                  Row: {
                    "amount_due_cents": number,"amount_paid_cents": number,"attempt_count": number,"created_at": string,"currency": string,"customer_id": string | null,"id": string,"next_payment_attempt": string | null,"project_id": string,"status": string,"subscription_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_due_cents"?: number,"amount_paid_cents"?: number,"attempt_count"?: number,"created_at": string,"currency"?: string,"customer_id"?: string | null,"id": string,"next_payment_attempt"?: string | null,"project_id": string,"status": string,"subscription_id"?: string | null
                  }
                  Update: {
                    "amount_due_cents"?: number,"amount_paid_cents"?: number,"attempt_count"?: number,"created_at"?: string,"currency"?: string,"customer_id"?: string | null,"id"?: string,"next_payment_attempt"?: string | null,"project_id"?: string,"status"?: string,"subscription_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stripe_invoices_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"stripe_subscriptions": {
                  Row: {
                    "billing_interval": string | null,"cancel_at": string | null,"cancel_at_period_end": boolean,"canceled_at": string | null,"card_expires_at": string | null,"created_at": string,"currency": string,"current_period_end": string | null,"customer_id": string,"ended_at": string | null,"id": string,"mrr_cents": number,"plan_name": string | null,"project_id": string,"status": string,"trial_end": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "billing_interval"?: string | null,"cancel_at"?: string | null,"cancel_at_period_end"?: boolean,"canceled_at"?: string | null,"card_expires_at"?: string | null,"created_at": string,"currency"?: string,"current_period_end"?: string | null,"customer_id": string,"ended_at"?: string | null,"id": string,"mrr_cents"?: number,"plan_name"?: string | null,"project_id": string,"status": string,"trial_end"?: string | null
                  }
                  Update: {
                    "billing_interval"?: string | null,"cancel_at"?: string | null,"cancel_at_period_end"?: boolean,"canceled_at"?: string | null,"card_expires_at"?: string | null,"created_at"?: string,"currency"?: string,"current_period_end"?: string | null,"customer_id"?: string,"ended_at"?: string | null,"id"?: string,"mrr_cents"?: number,"plan_name"?: string | null,"project_id"?: string,"status"?: string,"trial_end"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stripe_subscriptions_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"testimonials": {
                  Row: {
                    "author": string,"created_at": string,"id": string,"is_published": boolean,"position": number,"quote": string,"role": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author": string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"position"?: number,"quote": string,"role"?: string,"updated_at"?: string
                  }
                  Update: {
                    "author"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"position"?: number,"quote"?: string,"role"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_system_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"claim_signup_attribution":
{ Args: { "campaign": string,"channel": string,"landing": string,"medium": string,"referrer": string,"source": string }; Returns: undefined
                           },
"clean_channel":
{ Args: { "referrer": string,"value": string }; Returns: string
                           },
"customer_first_touch":
{ Args: { "p_project": string }; Returns: {
              "channel": string,"email_hash": string,"first_seen": string
            }[]
                           },
"is_super_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"touch_last_seen":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "user"|"super_admin","billing_interval": "monthly"|"annual","insight_status": "done"|"ignored","payment_method": "card"|"sepa"|"paypal"|"bank_transfer","plan_id": "trial"|"starter"|"growth"|"pro","subscription_status": "trialing"|"active"|"past_due"|"canceled"|"suspended"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["user", "super_admin"],"billing_interval": ["monthly", "annual"],"insight_status": ["done", "ignored"],"payment_method": ["card", "sepa", "paypal", "bank_transfer"],"plan_id": ["trial", "starter", "growth", "pro"],"subscription_status": ["trialing", "active", "past_due", "canceled", "suspended"]
          }
        }
} as const

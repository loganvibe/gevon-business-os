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
      advisor_recommendations: {
        Row: {
          branch_id: string | null
          company_id: string
          confidence: number
          created_at: string
          data: Json
          dedupe_key: string | null
          finding: string
          generated_at: string
          id: string
          impact: string
          module_id: string | null
          recommendation: string
          rule_key: string
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["recommendation_status"]
          title: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          confidence?: number
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          finding: string
          generated_at?: string
          id?: string
          impact?: string
          module_id?: string | null
          recommendation: string
          rule_key: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["recommendation_status"]
          title: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          confidence?: number
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          finding?: string
          generated_at?: string
          id?: string
          impact?: string
          module_id?: string | null
          recommendation?: string
          rule_key?: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["recommendation_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_recommendations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_recommendations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_key: string
          branch_id: string | null
          company_id: string
          created_at: string
          data: Json
          dedupe_key: string | null
          deep_link: string | null
          id: string
          message: string
          module_id: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_key: string
          branch_id?: string | null
          company_id: string
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          deep_link?: string | null
          id?: string
          message: string
          module_id?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_key?: string
          branch_id?: string | null
          company_id?: string
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          deep_link?: string | null
          id?: string
          message?: string
          module_id?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_actions: {
        Row: {
          action: string
          actor_id: string | null
          approval_request_id: string
          approval_step_id: string | null
          comment: string | null
          company_id: string
          created_at: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          approval_request_id: string
          approval_step_id?: string | null
          comment?: string | null
          company_id: string
          created_at?: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          approval_request_id?: string
          approval_step_id?: string | null
          comment?: string | null
          company_id?: string
          created_at?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "approval_actions_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_actions_approval_step_id_fkey"
            columns: ["approval_step_id"]
            isOneToOne: false
            referencedRelation: "approval_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          amount: number | null
          branch_id: string | null
          company_id: string
          created_at: string
          currency_code: string | null
          current_step: number
          decided_at: string | null
          deleted_at: string | null
          description: string | null
          due_at: string | null
          entity_id: string | null
          entity_type: string | null
          escalation_level: number
          id: string
          last_escalated_at: string | null
          metadata: Json
          module_id: string | null
          requested_by: string | null
          required_permission: string | null
          status: Database["public"]["Enums"]["approval_status"]
          subject: string
          total_steps: number
          updated_at: string
        }
        Insert: {
          amount?: number | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          currency_code?: string | null
          current_step?: number
          decided_at?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          escalation_level?: number
          id?: string
          last_escalated_at?: string | null
          metadata?: Json
          module_id?: string | null
          requested_by?: string | null
          required_permission?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          subject: string
          total_steps?: number
          updated_at?: string
        }
        Update: {
          amount?: number | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          currency_code?: string | null
          current_step?: number
          decided_at?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          escalation_level?: number
          id?: string
          last_escalated_at?: string | null
          metadata?: Json
          module_id?: string | null
          requested_by?: string | null
          required_permission?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          subject?: string
          total_steps?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_steps: {
        Row: {
          approval_request_id: string
          approver_department_id: string | null
          approver_kind: Database["public"]["Enums"]["assignee_kind"]
          approver_role_id: string | null
          approver_user_id: string | null
          comment: string | null
          company_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          name: string | null
          status: Database["public"]["Enums"]["approval_step_status"]
          step_number: number
          updated_at: string
        }
        Insert: {
          approval_request_id: string
          approver_department_id?: string | null
          approver_kind?: Database["public"]["Enums"]["assignee_kind"]
          approver_role_id?: string | null
          approver_user_id?: string | null
          comment?: string | null
          company_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          name?: string | null
          status?: Database["public"]["Enums"]["approval_step_status"]
          step_number?: number
          updated_at?: string
        }
        Update: {
          approval_request_id?: string
          approver_department_id?: string | null
          approver_kind?: Database["public"]["Enums"]["assignee_kind"]
          approver_role_id?: string | null
          approver_user_id?: string | null
          comment?: string | null
          company_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          name?: string | null
          status?: Database["public"]["Enums"]["approval_step_status"]
          step_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_approver_department_id_fkey"
            columns: ["approver_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_approver_role_id_fkey"
            columns: ["approver_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string
          break_minutes: number
          clock_in: string | null
          clock_out: string | null
          company_id: string
          correction_of: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          notes: string | null
          source: Database["public"]["Enums"]["attendance_source"]
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          work_date: string
          worked_minutes: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id: string
          break_minutes?: number
          clock_in?: string | null
          clock_out?: string | null
          company_id: string
          correction_of?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          work_date?: string
          worked_minutes?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string
          break_minutes?: number
          clock_in?: string | null
          clock_out?: string | null
          company_id?: string
          correction_of?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          work_date?: string
          worked_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_correction_of_fkey"
            columns: ["correction_of"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          branch_id: string | null
          company_id: string
          conditions: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          module_id: string | null
          name: string
          run_count: number
          schedule_cron: string | null
          trigger_event: string | null
          trigger_kind: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          branch_id?: string | null
          company_id: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          module_id?: string | null
          name: string
          run_count?: number
          schedule_cron?: string | null
          trigger_event?: string | null
          trigger_kind?: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          branch_id?: string | null
          company_id?: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          module_id?: string | null
          name?: string
          run_count?: number
          schedule_cron?: string | null
          trigger_event?: string | null
          trigger_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          automation_rule_id: string
          company_id: string
          created_at: string
          error: string | null
          id: string
          matched: boolean
          payload: Json
          result: Json
          status: Database["public"]["Enums"]["workflow_run_status"]
          updated_at: string
        }
        Insert: {
          automation_rule_id: string
          company_id: string
          created_at?: string
          error?: string | null
          id?: string
          matched?: boolean
          payload?: Json
          result?: Json
          status?: Database["public"]["Enums"]["workflow_run_status"]
          updated_at?: string
        }
        Update: {
          automation_rule_id?: string
          company_id?: string
          created_at?: string
          error?: string | null
          id?: string
          matched?: boolean
          payload?: Json
          result?: Json
          status?: Database["public"]["Enums"]["workflow_run_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          code: string | null
          company_id: string
          country_code: string | null
          created_at: string
          currency_code: string | null
          id: string
          is_headquarters: boolean
          name: string
          status: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          country_code?: string | null
          created_at?: string
          currency_code?: string | null
          id?: string
          is_headquarters?: boolean
          name: string
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          country_code?: string | null
          created_at?: string
          currency_code?: string | null
          id?: string
          is_headquarters?: boolean
          name?: string
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "branches_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "branches_timezone_fkey"
            columns: ["timezone"]
            isOneToOne: false
            referencedRelation: "timezones"
            referencedColumns: ["name"]
          },
        ]
      }
      business_health_scores: {
        Row: {
          areas: Json
          branch_id: string | null
          captured_at: string
          company_id: string
          created_at: string
          created_by: string | null
          factors: Json
          grade: string
          id: string
          overall_score: number
          updated_at: string
        }
        Insert: {
          areas?: Json
          branch_id?: string | null
          captured_at?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          factors?: Json
          grade?: string
          id?: string
          overall_score?: number
          updated_at?: string
        }
        Update: {
          areas?: Json
          branch_id?: string | null
          captured_at?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          factors?: Json
          grade?: string
          id?: string
          overall_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_health_scores_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_health_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          attendees: Json
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          event_type: Database["public"]["Enums"]["calendar_event_type"]
          external_id: string | null
          external_source: string | null
          id: string
          location: string | null
          metadata: Json
          owner_user_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          attendees?: Json
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          external_id?: string | null
          external_source?: string | null
          id?: string
          location?: string | null
          metadata?: Json
          owner_user_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          attendees?: Json
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          external_id?: string | null
          external_source?: string | null
          id?: string
          location?: string | null
          metadata?: Json
          owner_user_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_audiences: {
        Row: {
          campaign_id: string
          company_id: string
          created_at: string
          customer_id: string | null
          id: string
          segment_id: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          company_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          segment_id?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          company_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          segment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_audiences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_audiences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_audiences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_audiences_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_events: {
        Row: {
          campaign_id: string
          company_id: string
          created_at: string
          customer_id: string | null
          event_type: Database["public"]["Enums"]["campaign_event_type"]
          id: string
          message_id: string | null
          metadata: Json
          occurred_at: string
          revenue: number | null
          sale_id: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          company_id: string
          created_at?: string
          customer_id?: string | null
          event_type: Database["public"]["Enums"]["campaign_event_type"]
          id?: string
          message_id?: string | null
          metadata?: Json
          occurred_at?: string
          revenue?: number | null
          sale_id?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          company_id?: string
          created_at?: string
          customer_id?: string | null
          event_type?: Database["public"]["Enums"]["campaign_event_type"]
          id?: string
          message_id?: string | null
          metadata?: Json
          occurred_at?: string
          revenue?: number | null
          sale_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "campaign_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_messages: {
        Row: {
          body: string | null
          campaign_id: string
          channel: Database["public"]["Enums"]["communication_channel"]
          communication_log_id: string | null
          company_id: string
          created_at: string
          customer_id: string | null
          delivered_at: string | null
          error: string | null
          id: string
          provider: string | null
          provider_message_id: string | null
          recipient: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["campaign_message_status"]
          subject: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          campaign_id: string
          channel: Database["public"]["Enums"]["communication_channel"]
          communication_log_id?: string | null
          company_id: string
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          provider?: string | null
          provider_message_id?: string | null
          recipient?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_message_status"]
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          campaign_id?: string
          channel?: Database["public"]["Enums"]["communication_channel"]
          communication_log_id?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          provider?: string | null
          provider_message_id?: string | null
          recipient?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_message_status"]
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_communication_log_id_fkey"
            columns: ["communication_log_id"]
            isOneToOne: false
            referencedRelation: "communication_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          attempts: number
          channel: Database["public"]["Enums"]["communication_channel"]
          company_id: string | null
          created_at: string
          error: string | null
          id: string
          module_id: string | null
          provider_message_id: string | null
          recipient_address: string | null
          recipient_user_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["communication_status"]
          subject: string | null
          template_key: string | null
        }
        Insert: {
          attempts?: number
          channel: Database["public"]["Enums"]["communication_channel"]
          company_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          module_id?: string | null
          provider_message_id?: string | null
          recipient_address?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          subject?: string | null
          template_key?: string | null
        }
        Update: {
          attempts?: number
          channel?: Database["public"]["Enums"]["communication_channel"]
          company_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          module_id?: string | null
          provider_message_id?: string | null
          recipient_address?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          subject?: string | null
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          country_code: string
          created_at: string
          created_by: string
          currency_code: string
          fiscal_year_start_month: number
          id: string
          is_internal: boolean
          locale: string
          name: string
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          created_by: string
          currency_code: string
          fiscal_year_start_month?: number
          id?: string
          is_internal?: boolean
          locale?: string
          name: string
          slug: string
          status?: string
          timezone: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          created_by?: string
          currency_code?: string
          fiscal_year_start_month?: number
          id?: string
          is_internal?: boolean
          locale?: string
          name?: string
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "companies_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "companies_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "companies_timezone_fkey"
            columns: ["timezone"]
            isOneToOne: false
            referencedRelation: "timezones"
            referencedColumns: ["name"]
          },
        ]
      }
      company_invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invites_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_modules: {
        Row: {
          company_id: string
          created_at: string
          enabled_at: string
          enabled_by: string | null
          id: string
          module_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          enabled_at?: string
          enabled_by?: string | null
          id?: string
          module_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          enabled_at?: string
          enabled_by?: string | null
          id?: string
          module_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          default_currency: string | null
          dial_code: string | null
          name: string
        }
        Insert: {
          code: string
          default_currency?: string | null
          dial_code?: string | null
          name: string
        }
        Update: {
          code?: string
          default_currency?: string | null
          dial_code?: string | null
          name?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          amount_discounted: number
          branch_id: string | null
          company_id: string
          coupon_id: string
          created_at: string
          customer_id: string | null
          id: string
          redeemed_at: string
          redeemed_by: string | null
          sale_id: string | null
          updated_at: string
        }
        Insert: {
          amount_discounted?: number
          branch_id?: string | null
          company_id: string
          coupon_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          redeemed_at?: string
          redeemed_by?: string | null
          sale_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_discounted?: number
          branch_id?: string | null
          company_id?: string
          coupon_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          redeemed_at?: string
          redeemed_by?: string | null
          sale_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          branch_id: string | null
          category_id: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at: string | null
          id: string
          max_discount_amount: number | null
          min_purchase_amount: number
          product_id: string | null
          promotion_id: string | null
          segment_id: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["coupon_status"]
          updated_at: string
          usage_count: number
          usage_limit: number | null
          usage_limit_per_customer: number
        }
        Insert: {
          branch_id?: string | null
          category_id?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_discount_amount?: number | null
          min_purchase_amount?: number
          product_id?: string | null
          promotion_id?: string | null
          segment_id?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["coupon_status"]
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          usage_limit_per_customer?: number
        }
        Update: {
          branch_id?: string | null
          category_id?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_discount_amount?: number | null
          min_purchase_amount?: number
          product_id?: string | null
          promotion_id?: string | null
          segment_id?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["coupon_status"]
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          usage_limit_per_customer?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          decimals: number
          name: string
          symbol: string | null
        }
        Insert: {
          code: string
          decimals?: number
          name: string
          symbol?: string | null
        }
        Update: {
          code?: string
          decimals?: number
          name?: string
          symbol?: string | null
        }
        Relationships: []
      }
      customer_consents: {
        Row: {
          channel: Database["public"]["Enums"]["communication_channel"]
          company_id: string
          consented_at: string | null
          created_at: string
          customer_id: string
          id: string
          revoked_at: string | null
          source: string | null
          status: Database["public"]["Enums"]["consent_status"]
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["communication_channel"]
          company_id: string
          consented_at?: string | null
          created_at?: string
          customer_id: string
          id?: string
          revoked_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["communication_channel"]
          company_id?: string
          consented_at?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          revoked_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_consents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_consents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segment_members: {
        Row: {
          added_by: string
          company_id: string
          created_at: string
          customer_id: string
          entered_at: string
          id: string
          segment_id: string
          updated_at: string
        }
        Insert: {
          added_by?: string
          company_id: string
          created_at?: string
          customer_id: string
          entered_at?: string
          id?: string
          segment_id: string
          updated_at?: string
        }
        Update: {
          added_by?: string
          company_id?: string
          created_at?: string
          customer_id?: string
          entered_at?: string
          id?: string
          segment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segment_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_segment_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          kind: Database["public"]["Enums"]["segment_kind"]
          last_evaluated_at: string | null
          member_count: number
          name: string
          rules: Json
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          kind?: Database["public"]["Enums"]["segment_kind"]
          last_evaluated_at?: string | null
          member_count?: number
          name: string
          rules?: Json
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          kind?: Database["public"]["Enums"]["segment_kind"]
          last_evaluated_at?: string | null
          member_count?: number
          name?: string
          rules?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_segments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          attributes: Json
          branch_id: string | null
          city: string | null
          company_id: string
          country_code: string | null
          created_at: string
          created_by: string | null
          customer_type: Database["public"]["Enums"]["customer_type"]
          deleted_at: string | null
          email: string | null
          first_purchase_at: string | null
          id: string
          last_purchase_at: string | null
          name: string
          notes: string | null
          phone: string | null
          purchase_count: number
          state: string | null
          status: Database["public"]["Enums"]["customer_status"]
          tags: string[]
          total_spent: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          attributes?: Json
          branch_id?: string | null
          city?: string | null
          company_id: string
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          deleted_at?: string | null
          email?: string | null
          first_purchase_at?: string | null
          id?: string
          last_purchase_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          purchase_count?: number
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tags?: string[]
          total_spent?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          attributes?: Json
          branch_id?: string | null
          city?: string | null
          company_id?: string
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          deleted_at?: string | null
          email?: string | null
          first_purchase_at?: string | null
          id?: string
          last_purchase_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          purchase_count?: number
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tags?: string[]
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_visible: boolean
          module_id: string | null
          position: number
          settings: Json
          size: string
          title: string | null
          updated_at: string
          user_id: string | null
          widget_key: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_visible?: boolean
          module_id?: string | null
          position?: number
          settings?: Json
          size?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
          widget_key: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          module_id?: string | null
          position?: number
          settings?: Json
          size?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
          widget_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          branch_id: string | null
          code: string | null
          company_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_manager_fk"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          deleted_at: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          ends_at: string | null
          id: string
          is_active: boolean
          metadata: Json
          min_subtotal: number | null
          name: string
          starts_at: string | null
          updated_at: string
          value: number
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          deleted_at?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          ends_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          min_subtotal?: number | null
          name: string
          starts_at?: string | null
          updated_at?: string
          value?: number
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          ends_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          min_subtotal?: number | null
          name?: string
          starts_at?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sequences: {
        Row: {
          company_id: string
          last_value: number
          prefix: string
          updated_at: string
        }
        Insert: {
          company_id: string
          last_value?: number
          prefix: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          last_value?: number
          prefix?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          company_id: string
          content_type: string | null
          created_at: string
          document_type: Database["public"]["Enums"]["employee_document_type"]
          employee_id: string
          expires_at: string | null
          file_name: string
          file_path: string
          id: string
          issued_at: string | null
          notes: string | null
          size_bytes: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          content_type?: string | null
          created_at?: string
          document_type?: Database["public"]["Enums"]["employee_document_type"]
          employee_id: string
          expires_at?: string | null
          file_name: string
          file_path: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          size_bytes?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          content_type?: string | null
          created_at?: string
          document_type?: Database["public"]["Enums"]["employee_document_type"]
          employee_id?: string
          expires_at?: string | null
          file_name?: string
          file_path?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          size_bytes?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: Json | null
          bank_details: Json | null
          base_salary: number
          branch_id: string
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          date_of_birth: string | null
          deleted_at: string | null
          department_id: string | null
          email: string | null
          emergency_contact: Json | null
          employee_number: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          first_name: string
          gender: string | null
          hired_at: string
          id: string
          job_title: string | null
          last_name: string
          manager_id: string | null
          metadata: Json
          middle_name: string | null
          pay_frequency: string
          phone: string | null
          position_id: string | null
          probation_ends_at: string | null
          status: Database["public"]["Enums"]["employment_status"]
          terminated_at: string | null
          termination_reason: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: Json | null
          bank_details?: Json | null
          base_salary?: number
          branch_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          department_id?: string | null
          email?: string | null
          emergency_contact?: Json | null
          employee_number: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          first_name: string
          gender?: string | null
          hired_at?: string
          id?: string
          job_title?: string | null
          last_name: string
          manager_id?: string | null
          metadata?: Json
          middle_name?: string | null
          pay_frequency?: string
          phone?: string | null
          position_id?: string | null
          probation_ends_at?: string | null
          status?: Database["public"]["Enums"]["employment_status"]
          terminated_at?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: Json | null
          bank_details?: Json | null
          base_salary?: number
          branch_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          department_id?: string | null
          email?: string | null
          emergency_contact?: Json | null
          employee_number?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          first_name?: string
          gender?: string | null
          hired_at?: string
          id?: string
          job_title?: string | null
          last_name?: string
          manager_id?: string | null
          metadata?: Json
          middle_name?: string | null
          pay_frequency?: string
          phone?: string | null
          position_id?: string | null
          probation_ends_at?: string | null
          status?: Database["public"]["Enums"]["employment_status"]
          terminated_at?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          after_hours: number
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          level: number
          name: string
          notify_kind: Database["public"]["Enums"]["assignee_kind"]
          notify_role_id: string | null
          notify_user_id: string | null
          target_kind: string
          updated_at: string
        }
        Insert: {
          after_hours?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          level?: number
          name: string
          notify_kind?: Database["public"]["Enums"]["assignee_kind"]
          notify_role_id?: string | null
          notify_user_id?: string | null
          target_kind?: string
          updated_at?: string
        }
        Update: {
          after_hours?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          notify_kind?: Database["public"]["Enums"]["assignee_kind"]
          notify_role_id?: string | null
          notify_user_id?: string | null
          target_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_rules_notify_role_id_fkey"
            columns: ["notify_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_log: {
        Row: {
          created_at: string
          event_queue_id: string
          id: string
          level: Database["public"]["Enums"]["event_log_level"]
          message: string
          meta: Json
        }
        Insert: {
          created_at?: string
          event_queue_id: string
          id?: string
          level?: Database["public"]["Enums"]["event_log_level"]
          message: string
          meta?: Json
        }
        Update: {
          created_at?: string
          event_queue_id?: string
          id?: string
          level?: Database["public"]["Enums"]["event_log_level"]
          message?: string
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "event_log_event_queue_id_fkey"
            columns: ["event_queue_id"]
            isOneToOne: false
            referencedRelation: "event_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      event_queue: {
        Row: {
          attempts: number
          company_id: string | null
          created_at: string
          event_key: string
          id: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          next_run_at: string
          payload: Json
          published_by: string | null
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
          version: number
        }
        Insert: {
          attempts?: number
          company_id?: string | null
          created_at?: string
          event_key: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_run_at?: string
          payload?: Json
          published_by?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          attempts?: number
          company_id?: string | null
          created_at?: string
          event_key?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_run_at?: string
          payload?: Json
          published_by?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_queue_event_key_fkey"
            columns: ["event_key"]
            isOneToOne: false
            referencedRelation: "platform_events"
            referencedColumns: ["key"]
          },
        ]
      }
      expense_attachments: {
        Row: {
          company_id: string
          content_type: string | null
          created_at: string
          expense_id: string
          file_name: string
          file_path: string
          id: string
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          content_type?: string | null
          created_at?: string
          expense_id: string
          file_name: string
          file_path: string
          id?: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          content_type?: string | null
          created_at?: string
          expense_id?: string
          file_name?: string
          file_path?: string
          id?: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_attachments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string
          currency_code: string
          expense_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_at: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by: string
          currency_code?: string
          expense_id: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string
          currency_code?: string
          expense_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payments_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "expense_payments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          amount_paid: number
          approved_at: string | null
          approved_by: string | null
          branch_id: string
          category_id: string | null
          company_id: string
          created_at: string
          created_by: string
          currency_code: string
          deleted_at: string | null
          description: string | null
          expense_date: string
          expense_number: string
          id: string
          is_recurring: boolean
          metadata: Json
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          purchase_id: string | null
          recurrence: string | null
          reference: string | null
          rejected_reason: string | null
          status: Database["public"]["Enums"]["expense_status"]
          supplier_id: string | null
          tax_amount: number
          title: string
          total: number
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          branch_id: string
          category_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          expense_number: string
          id?: string
          is_recurring?: boolean
          metadata?: Json
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          purchase_id?: string | null
          recurrence?: string | null
          reference?: string | null
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          supplier_id?: string | null
          tax_amount?: number
          title: string
          total?: number
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string
          category_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          expense_number?: string
          id?: string
          is_recurring?: boolean
          metadata?: Json
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          purchase_id?: string | null
          recurrence?: string | null
          reference?: string | null
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          supplier_id?: string | null
          tax_amount?: number
          title?: string
          total?: number
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "expenses_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchase_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_overrides: {
        Row: {
          company_id: string | null
          created_at: string
          flag_key: string
          id: string
          note: string | null
          set_by: string | null
          status: Database["public"]["Enums"]["feature_flag_status"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          flag_key: string
          id?: string
          note?: string | null
          set_by?: string | null
          status: Database["public"]["Enums"]["feature_flag_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          flag_key?: string
          id?: string
          note?: string | null
          set_by?: string | null
          status?: Database["public"]["Enums"]["feature_flag_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_overrides_flag_key_fkey"
            columns: ["flag_key"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["key"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          default_status: Database["public"]["Enums"]["feature_flag_status"]
          description: string | null
          key: string
          module_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_status?: Database["public"]["Enums"]["feature_flag_status"]
          description?: string | null
          key: string
          module_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_status?: Database["public"]["Enums"]["feature_flag_status"]
          description?: string | null
          key?: string
          module_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_snapshots: {
        Row: {
          basis_end: string
          basis_start: string
          branch_id: string | null
          company_id: string
          confidence: number
          created_at: string
          generated_by: string | null
          horizon_days: number
          id: string
          kind: Database["public"]["Enums"]["forecast_kind"]
          meta: Json
          method: string
          points: Json
          projected_total: number
          updated_at: string
        }
        Insert: {
          basis_end: string
          basis_start: string
          branch_id?: string | null
          company_id: string
          confidence?: number
          created_at?: string
          generated_by?: string | null
          horizon_days?: number
          id?: string
          kind: Database["public"]["Enums"]["forecast_kind"]
          meta?: Json
          method?: string
          points?: Json
          projected_total?: number
          updated_at?: string
        }
        Update: {
          basis_end?: string
          basis_start?: string
          branch_id?: string | null
          company_id?: string
          confidence?: number
          created_at?: string
          generated_by?: string | null
          horizon_days?: number
          id?: string
          kind?: Database["public"]["Enums"]["forecast_kind"]
          meta?: Json
          method?: string
          points?: Json
          projected_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_snapshots_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_transactions: {
        Row: {
          amount: number
          balance_after: number
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          gift_card_id: string
          id: string
          reason: string | null
          sale_id: string | null
          txn_type: Database["public"]["Enums"]["gift_card_txn_type"]
          updated_at: string
        }
        Insert: {
          amount?: number
          balance_after?: number
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          gift_card_id: string
          id?: string
          reason?: string | null
          sale_id?: string | null
          txn_type: Database["public"]["Enums"]["gift_card_txn_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          balance_after?: number
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          gift_card_id?: string
          id?: string
          reason?: string | null
          sale_id?: string | null
          txn_type?: Database["public"]["Enums"]["gift_card_txn_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_transactions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          activated_at: string | null
          balance: number
          branch_id: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string | null
          customer_id: string | null
          expires_at: string | null
          id: string
          initial_value: number
          note: string | null
          recipient_email: string | null
          recipient_name: string | null
          status: Database["public"]["Enums"]["gift_card_status"]
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          balance?: number
          branch_id?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          initial_value?: number
          note?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          status?: Database["public"]["Enums"]["gift_card_status"]
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          balance?: number
          branch_id?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          initial_value?: number
          note?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          status?: Database["public"]["Enums"]["gift_card_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_progress: {
        Row: {
          company_id: string
          created_at: string
          goal_id: string
          id: string
          note: string | null
          progress_percent: number
          recorded_at: string
          value: number
        }
        Insert: {
          company_id: string
          created_at?: string
          goal_id: string
          id?: string
          note?: string | null
          progress_percent?: number
          recorded_at?: string
          value?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          goal_id?: string
          id?: string
          note?: string | null
          progress_percent?: number
          recorded_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_progress_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          achieved_at: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          current_value: number
          deleted_at: string | null
          description: string | null
          direction: string
          ends_on: string
          goal_type: Database["public"]["Enums"]["goal_type"]
          id: string
          metric_key: string
          name: string
          period: Database["public"]["Enums"]["report_period"]
          progress_percent: number
          starts_on: string
          status: Database["public"]["Enums"]["goal_status"]
          target_value: number
          updated_at: string
        }
        Insert: {
          achieved_at?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          current_value?: number
          deleted_at?: string | null
          description?: string | null
          direction?: string
          ends_on: string
          goal_type?: Database["public"]["Enums"]["goal_type"]
          id?: string
          metric_key?: string
          name: string
          period?: Database["public"]["Enums"]["report_period"]
          progress_percent?: number
          starts_on: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_value: number
          updated_at?: string
        }
        Update: {
          achieved_at?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_value?: number
          deleted_at?: string | null
          description?: string | null
          direction?: string
          ends_on?: string
          goal_type?: Database["public"]["Enums"]["goal_type"]
          id?: string
          metric_key?: string
          name?: string
          period?: Database["public"]["Enums"]["report_period"]
          progress_percent?: number
          starts_on?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_requests: {
        Row: {
          amount: number | null
          approval_request_id: string | null
          attachments: Json
          branch_id: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          currency_code: string | null
          decided_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          items: Json
          metadata: Json
          needed_by: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          related_entity_id: string | null
          related_entity_type: string | null
          request_number: string | null
          request_type: Database["public"]["Enums"]["internal_request_type"]
          requested_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          approval_request_id?: string | null
          attachments?: Json
          branch_id?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          currency_code?: string | null
          decided_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          items?: Json
          metadata?: Json
          needed_by?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          related_entity_id?: string | null
          related_entity_type?: string | null
          request_number?: string | null
          request_type?: Database["public"]["Enums"]["internal_request_type"]
          requested_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          approval_request_id?: string | null
          attachments?: Json
          branch_id?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          currency_code?: string | null
          decided_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          items?: Json
          metadata?: Json
          needed_by?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          related_entity_id?: string | null
          related_entity_type?: string | null
          request_number?: string | null
          request_type?: Database["public"]["Enums"]["internal_request_type"]
          requested_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_requests_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          id: string
          last_movement_at: string | null
          maximum_stock_level: number | null
          minimum_stock_level: number
          product_id: string
          quantity: number
          reorder_point: number | null
          reserved_quantity: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          id?: string
          last_movement_at?: string | null
          maximum_stock_level?: number | null
          minimum_stock_level?: number
          product_id: string
          quantity?: number
          reorder_point?: number | null
          reserved_quantity?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          id?: string
          last_movement_at?: string | null
          maximum_stock_level?: number | null
          minimum_stock_level?: number
          product_id?: string
          quantity?: number
          reorder_point?: number | null
          reserved_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      job_positions: {
        Row: {
          branch_id: string | null
          closed_at: string | null
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          deleted_at: string | null
          department_id: string | null
          description: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          id: string
          max_salary: number | null
          min_salary: number | null
          opened_at: string | null
          openings: number
          requirements: string | null
          status: Database["public"]["Enums"]["position_status"]
          title: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          closed_at?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          max_salary?: number | null
          min_salary?: number | null
          opened_at?: string | null
          openings?: number
          requirements?: string | null
          status?: Database["public"]["Enums"]["position_status"]
          title: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          closed_at?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          max_salary?: number | null
          min_salary?: number | null
          opened_at?: string | null
          openings?: number
          requirements?: string | null
          status?: Database["public"]["Enums"]["position_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_positions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_positions_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "job_positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      job_runs: {
        Row: {
          attempt: number
          error: string | null
          finished_at: string | null
          id: string
          job_id: string
          output: Json | null
          started_at: string
          status: Database["public"]["Enums"]["job_status"]
        }
        Insert: {
          attempt: number
          error?: string | null
          finished_at?: string | null
          id?: string
          job_id: string
          output?: Json | null
          started_at?: string
          status: Database["public"]["Enums"]["job_status"]
        }
        Update: {
          attempt?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          job_id?: string
          output?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["job_status"]
        }
        Relationships: [
          {
            foreignKeyName: "job_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          job_type: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          module_id: string | null
          payload: Json
          priority: number
          scheduled_for: string
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          job_type: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          module_id?: string | null
          payload?: Json
          priority?: number
          scheduled_for?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          job_type?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          module_id?: string | null
          payload?: Json
          priority?: number
          scheduled_for?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis: {
        Row: {
          branch_id: string | null
          change_percent: number | null
          company_id: string
          computed_at: string
          created_at: string
          id: string
          kpi_key: string
          label: string
          meta: Json
          period: Database["public"]["Enums"]["report_period"]
          period_end: string
          period_start: string
          previous_value: number | null
          trend: string
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          branch_id?: string | null
          change_percent?: number | null
          company_id: string
          computed_at?: string
          created_at?: string
          id?: string
          kpi_key: string
          label: string
          meta?: Json
          period?: Database["public"]["Enums"]["report_period"]
          period_end: string
          period_start: string
          previous_value?: number | null
          trend?: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Update: {
          branch_id?: string | null
          change_percent?: number | null
          company_id?: string
          computed_at?: string
          created_at?: string
          id?: string
          kpi_key?: string
          label?: string
          meta?: Json
          period?: Database["public"]["Enums"]["report_period"]
          period_end?: string
          period_start?: string
          previous_value?: number | null
          trend?: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpis_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          days: number
          decision_notes: string | null
          employee_id: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          days?: number
          decision_notes?: string | null
          employee_id: string
          end_date: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          days?: number
          decision_notes?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      locales: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
      loyalty_accounts: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          enrolled_at: string
          id: string
          last_activity_at: string | null
          lifetime_points: number
          points_balance: number
          program_id: string
          redeemed_points: number
          tier: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          enrolled_at?: string
          id?: string
          last_activity_at?: string | null
          lifetime_points?: number
          points_balance?: number
          program_id: string
          redeemed_points?: number
          tier?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          enrolled_at?: string
          id?: string
          last_activity_at?: string | null
          lifetime_points?: number
          points_balance?: number
          program_id?: string
          redeemed_points?: number
          tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_accounts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          amount_unit: number
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string | null
          description: string | null
          id: string
          is_active: boolean
          min_redemption_points: number
          name: string
          point_value: number
          points_expire_after_days: number | null
          points_per_amount: number
          tiers: Json
          updated_at: string
        }
        Insert: {
          amount_unit?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          min_redemption_points?: number
          name: string
          point_value?: number
          points_expire_after_days?: number | null
          points_per_amount?: number
          tiers?: Json
          updated_at?: string
        }
        Update: {
          amount_unit?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          min_redemption_points?: number
          name?: string
          point_value?: number
          points_expire_after_days?: number | null
          points_per_amount?: number
          tiers?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          account_id: string
          balance_after: number
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          expires_at: string | null
          id: string
          points: number
          reason: string | null
          sale_id: string | null
          txn_type: Database["public"]["Enums"]["loyalty_txn_type"]
          updated_at: string
        }
        Insert: {
          account_id: string
          balance_after?: number
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          expires_at?: string | null
          id?: string
          points: number
          reason?: string | null
          sale_id?: string | null
          txn_type: Database["public"]["Enums"]["loyalty_txn_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          balance_after?: number
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          expires_at?: string | null
          id?: string
          points?: number
          reason?: string | null
          sale_id?: string | null
          txn_type?: Database["public"]["Enums"]["loyalty_txn_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "loyalty_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          body: string | null
          branch_id: string | null
          cancelled_at: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          clicked_count: number
          company_id: string
          completed_at: string | null
          converted_count: number
          coupon_id: string | null
          created_at: string
          created_by: string | null
          delivered_count: number
          description: string | null
          failed_count: number
          id: string
          name: string
          opened_count: number
          promotion_id: string | null
          revenue_attributed: number
          scheduled_at: string | null
          segment_id: string | null
          sent_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          subject: string | null
          targeted_count: number
          template_key: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          branch_id?: string | null
          cancelled_at?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          clicked_count?: number
          company_id: string
          completed_at?: string | null
          converted_count?: number
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          description?: string | null
          failed_count?: number
          id?: string
          name: string
          opened_count?: number
          promotion_id?: string | null
          revenue_attributed?: number
          scheduled_at?: string | null
          segment_id?: string | null
          sent_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          subject?: string | null
          targeted_count?: number
          template_key?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          branch_id?: string | null
          cancelled_at?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          clicked_count?: number
          company_id?: string
          completed_at?: string | null
          converted_count?: number
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          description?: string | null
          failed_count?: number
          id?: string
          name?: string
          opened_count?: number
          promotion_id?: string | null
          revenue_attributed?: number
          scheduled_at?: string | null
          segment_id?: string | null
          sent_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          subject?: string | null
          targeted_count?: number
          template_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      member_roles: {
        Row: {
          member_id: string
          role_id: string
        }
        Insert: {
          member_id: string
          role_id: string
        }
        Update: {
          member_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_roles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "company_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_ai_capabilities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          input_schema: Json
          key: string
          module_id: string
          name: string
          output_schema: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          input_schema?: Json
          key: string
          module_id: string
          name: string
          output_schema?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          input_schema?: Json
          key?: string
          module_id?: string
          name?: string
          output_schema?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_ai_capabilities_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_dependencies: {
        Row: {
          depends_on_id: string
          module_id: string
        }
        Insert: {
          depends_on_id: string
          module_id: string
        }
        Update: {
          depends_on_id?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_dependencies_depends_on_id_fkey"
            columns: ["depends_on_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_dependencies_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_permissions: {
        Row: {
          module_id: string
          permission_key: string
        }
        Insert: {
          module_id: string
          permission_key: string
        }
        Update: {
          module_id?: string
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      modules: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_core: boolean
          manifest_hash: string | null
          name: string
          status: Database["public"]["Enums"]["module_status"]
          subscription_tier: string
          updated_at: string
          version: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id: string
          is_core?: boolean
          manifest_hash?: string | null
          name: string
          status?: Database["public"]["Enums"]["module_status"]
          subscription_tier?: string
          updated_at?: string
          version?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_core?: boolean
          manifest_hash?: string | null
          name?: string
          status?: Database["public"]["Enums"]["module_status"]
          subscription_tier?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["communication_channel"]
          company_id: string | null
          created_at: string
          digest_frequency: Database["public"]["Enums"]["digest_frequency"]
          enabled: boolean
          id: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["notification_category"]
          channel: Database["public"]["Enums"]["communication_channel"]
          company_id?: string | null
          created_at?: string
          digest_frequency?: Database["public"]["Enums"]["digest_frequency"]
          enabled?: boolean
          id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["notification_category"]
          channel?: Database["public"]["Enums"]["communication_channel"]
          company_id?: string | null
          created_at?: string
          digest_frequency?: Database["public"]["Enums"]["digest_frequency"]
          enabled?: boolean
          id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at: string
          id: string
          is_active: boolean
          key: string
          subject: string | null
          updated_at: string
          variables: Json
        }
        Insert: {
          body_template: string
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          subject?: string | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          body_template?: string
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          subject?: string | null
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      notifications: {
        Row: {
          archived_at: string | null
          category: Database["public"]["Enums"]["notification_category"]
          company_id: string | null
          created_at: string
          deep_link: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          pinned: boolean
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at: string | null
          recipient_user_id: string
          source_module_id: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
        }
        Insert: {
          archived_at?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          company_id?: string | null
          created_at?: string
          deep_link?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          pinned?: boolean
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          recipient_user_id: string
          source_module_id?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
        }
        Update: {
          archived_at?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          company_id?: string | null
          created_at?: string
          deep_link?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          pinned?: boolean
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          recipient_user_id?: string
          source_module_id?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_source_module_id_fkey"
            columns: ["source_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          notes: string | null
          order_id: string
          product_id: string
          quantity: number
          tax_amount: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          order_id: string
          product_id: string
          quantity: number
          tax_amount?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string
          quantity?: number
          tax_amount?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string
          channel: Database["public"]["Enums"]["sale_channel"]
          company_id: string
          created_at: string
          created_by: string
          currency_code: string
          customer_id: string | null
          deleted_at: string | null
          discount_total: number
          expected_at: string | null
          external_reference: string | null
          id: string
          notes: string | null
          order_number: string
          sale_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          channel?: Database["public"]["Enums"]["sale_channel"]
          company_id: string
          created_at?: string
          created_by: string
          currency_code?: string
          customer_id?: string | null
          deleted_at?: string | null
          discount_total?: number
          expected_at?: string | null
          external_reference?: string | null
          id?: string
          notes?: string | null
          order_number: string
          sale_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          channel?: Database["public"]["Enums"]["sale_channel"]
          company_id?: string
          created_at?: string
          created_by?: string
          currency_code?: string
          customer_id?: string | null
          deleted_at?: string | null
          discount_total?: number
          expected_at?: string | null
          external_reference?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          sale_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string
          currency_code: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          order_id: string | null
          paid_at: string
          provider: string | null
          reference: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by: string
          currency_code?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          order_id?: string | null
          paid_at?: string
          provider?: string | null
          reference?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string
          currency_code?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          order_id?: string | null
          paid_at?: string
          provider?: string | null
          reference?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_cycles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          id: string
          name: string
          notes: string | null
          pay_date: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["payroll_status"]
          total_deductions: number
          total_gross: number
          total_net: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          name: string
          notes?: string | null
          pay_date?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["payroll_status"]
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          name?: string
          notes?: string | null
          pay_date?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["payroll_status"]
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_cycles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_cycles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_cycles_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      payroll_items: {
        Row: {
          allowance_total: number
          allowances: Json
          base_salary: number
          company_id: string
          created_at: string
          currency_code: string
          cycle_id: string
          deduction_total: number
          deductions: Json
          employee_id: string
          gross_pay: number
          id: string
          net_pay: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          allowance_total?: number
          allowances?: Json
          base_salary?: number
          company_id: string
          created_at?: string
          currency_code?: string
          cycle_id: string
          deduction_total?: number
          deductions?: Json
          employee_id: string
          gross_pay?: number
          id?: string
          net_pay?: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          allowance_total?: number
          allowances?: Json
          base_salary?: number
          company_id?: string
          created_at?: string
          currency_code?: string
          cycle_id?: string
          deduction_total?: number
          deductions?: Json
          employee_id?: string
          gross_pay?: number
          id?: string
          net_pay?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payroll_items_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          branch_id: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          employee_comments: string | null
          employee_id: string
          goals: Json
          id: string
          manager_comments: string | null
          overall_rating: number | null
          period_end: string
          period_start: string
          ratings: Json
          reviewer_id: string | null
          status: Database["public"]["Enums"]["review_status"]
          title: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          employee_comments?: string | null
          employee_id: string
          goals?: Json
          id?: string
          manager_comments?: string | null
          overall_rating?: number | null
          period_end: string
          period_start: string
          ratings?: Json
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          employee_comments?: string | null
          employee_id?: string
          goals?: Json
          id?: string
          manager_comments?: string | null
          overall_rating?: number | null
          period_end?: string
          period_start?: string
          ratings?: Json
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string
          key: string
          module: string
        }
        Insert: {
          description: string
          key: string
          module: string
        }
        Update: {
          description?: string
          key?: string
          module?: string
        }
        Relationships: []
      }
      plan_modules: {
        Row: {
          module_id: string
          plan_key: string
        }
        Insert: {
          module_id: string
          plan_key: string
        }
        Update: {
          module_id?: string
          plan_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_modules_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["key"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          is_custom: boolean
          key: string
          name: string
          tier: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_custom?: boolean
          key: string
          name: string
          tier?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          is_custom?: boolean
          key?: string
          name?: string
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["platform_role"]
          status: Database["public"]["Enums"]["platform_admin_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["platform_role"]
          status?: Database["public"]["Enums"]["platform_admin_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          status?: Database["public"]["Enums"]["platform_admin_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_events: {
        Row: {
          created_at: string
          description: string
          is_active: boolean
          key: string
          payload_schema: Json
          publisher_module_id: string | null
          subscribers: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string
          is_active?: boolean
          key: string
          payload_schema?: Json
          publisher_module_id?: string | null
          subscribers?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string
          is_active?: boolean
          key?: string
          payload_schema?: Json
          publisher_module_id?: string | null
          subscribers?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_events_publisher_module_id_fkey"
            columns: ["publisher_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          company_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          company_id: string
          cost_price: number
          created_at: string
          created_by: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          metadata: Json
          name: string
          selling_price: number
          sku: string | null
          status: Database["public"]["Enums"]["product_status"]
          unit: Database["public"]["Enums"]["product_unit"]
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          company_id: string
          cost_price?: number
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json
          name: string
          selling_price?: number
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          unit?: Database["public"]["Enums"]["product_unit"]
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          company_id?: string
          cost_price?: number
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json
          name?: string
          selling_price?: number
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          unit?: Database["public"]["Enums"]["product_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_company_id: string | null
          full_name: string | null
          id: string
          locale: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_company_id?: string | null
          full_name?: string | null
          id: string
          locale?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_company_id?: string | null
          full_name?: string | null
          id?: string
          locale?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_company_fk"
            columns: ["default_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
        ]
      }
      promotion_rules: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string
          id: string
          min_quantity: number
          product_id: string | null
          promotion_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          min_quantity?: number
          product_id?: string | null
          promotion_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          min_quantity?: number
          product_id?: string | null
          promotion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_rules_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          branch_id: string | null
          buy_quantity: number | null
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string | null
          description: string | null
          ends_at: string | null
          get_quantity: number | null
          id: string
          max_discount_amount: number | null
          min_purchase_amount: number
          name: string
          promo_type: Database["public"]["Enums"]["promotion_type"]
          scope: Database["public"]["Enums"]["promotion_scope"]
          segment_id: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["promotion_status"]
          updated_at: string
          usage_count: number
          usage_limit: number | null
          usage_limit_per_customer: number | null
          value: number
        }
        Insert: {
          branch_id?: string | null
          buy_quantity?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          ends_at?: string | null
          get_quantity?: number | null
          id?: string
          max_discount_amount?: number | null
          min_purchase_amount?: number
          name: string
          promo_type?: Database["public"]["Enums"]["promotion_type"]
          scope?: Database["public"]["Enums"]["promotion_scope"]
          segment_id?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["promotion_status"]
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          usage_limit_per_customer?: number | null
          value?: number
        }
        Update: {
          branch_id?: string | null
          buy_quantity?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          ends_at?: string | null
          get_quantity?: number | null
          id?: string
          max_discount_amount?: number | null
          min_purchase_amount?: number
          name?: string
          promo_type?: Database["public"]["Enums"]["promotion_type"]
          scope?: Database["public"]["Enums"]["promotion_scope"]
          segment_id?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["promotion_status"]
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          usage_limit_per_customer?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_record_items: {
        Row: {
          id: string
          product_id: string
          purchase_id: string
          quantity: number
          total: number
          unit_cost: number
        }
        Insert: {
          id?: string
          product_id: string
          purchase_id: string
          quantity: number
          total?: number
          unit_cost?: number
        }
        Update: {
          id?: string
          product_id?: string
          purchase_id?: string
          quantity?: number
          total?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_record_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_record_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchase_records"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_records: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          deleted_at: string | null
          id: string
          notes: string | null
          purchase_date: string
          reference: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          purchase_date?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          purchase_date?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_records_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_candidates: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          email: string | null
          expected_salary: number | null
          full_name: string
          hired_employee_id: string | null
          id: string
          interview_at: string | null
          interview_notes: string | null
          notes: string | null
          phone: string | null
          position_id: string | null
          rating: number | null
          resume_path: string | null
          source: string | null
          status: Database["public"]["Enums"]["candidate_status"]
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          email?: string | null
          expected_salary?: number | null
          full_name: string
          hired_employee_id?: string | null
          id?: string
          interview_at?: string | null
          interview_notes?: string | null
          notes?: string | null
          phone?: string | null
          position_id?: string | null
          rating?: number | null
          resume_path?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          email?: string | null
          expected_salary?: number | null
          full_name?: string
          hired_employee_id?: string | null
          id?: string
          interview_at?: string | null
          interview_notes?: string | null
          notes?: string | null
          phone?: string | null
          position_id?: string | null
          rating?: number | null
          resume_path?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_candidates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_candidates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_candidates_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "recruitment_candidates_hired_employee_id_fkey"
            columns: ["hired_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_candidates_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deep_link: string | null
          id: string
          message: string | null
          recipient_user_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          remind_at: string
          repeat_interval: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["reminder_status"]
          title: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deep_link?: string | null
          id?: string
          message?: string | null
          recipient_user_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          remind_at: string
          repeat_interval?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          title: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deep_link?: string | null
          id?: string
          message?: string | null
          recipient_user_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          remind_at?: string
          repeat_interval?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          error: string | null
          filters: Json
          generated_by: string | null
          id: string
          period: Database["public"]["Enums"]["report_period"]
          period_end: string
          period_start: string
          report_type: Database["public"]["Enums"]["report_type"]
          result: Json
          row_count: number
          status: Database["public"]["Enums"]["report_status"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          error?: string | null
          filters?: Json
          generated_by?: string | null
          id?: string
          period?: Database["public"]["Enums"]["report_period"]
          period_end: string
          period_start: string
          report_type: Database["public"]["Enums"]["report_type"]
          result?: Json
          row_count?: number
          status?: Database["public"]["Enums"]["report_status"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          error?: string | null
          filters?: Json
          generated_by?: string | null
          id?: string
          period?: Database["public"]["Enums"]["report_period"]
          period_end?: string
          period_start?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          result?: Json
          row_count?: number
          status?: Database["public"]["Enums"]["report_status"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          condition: string | null
          created_at: string
          id: string
          product_id: string
          quantity: number
          return_id: string
          sale_item_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          condition?: string | null
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          return_id: string
          sale_item_id?: string | null
          total?: number
          unit_price?: number
        }
        Update: {
          condition?: string | null
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          return_id?: string
          sale_item_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          created_by: string
          currency_code: string
          customer_id: string | null
          deleted_at: string | null
          id: string
          reason: string | null
          restock: boolean
          return_number: string
          return_type: Database["public"]["Enums"]["return_type"]
          sale_id: string
          status: Database["public"]["Enums"]["return_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          created_by: string
          currency_code?: string
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          reason?: string | null
          restock?: boolean
          return_number: string
          return_type?: Database["public"]["Enums"]["return_type"]
          sale_id: string
          status?: Database["public"]["Enums"]["return_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          created_by?: string
          currency_code?: string
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          reason?: string | null
          restock?: boolean
          return_number?: string
          return_type?: Database["public"]["Enums"]["return_type"]
          sale_id?: string
          status?: Database["public"]["Enums"]["return_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_key: string
          role_id: string
        }
        Insert: {
          permission_key: string
          role_id: string
        }
        Update: {
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          notes: string | null
          product_id: string
          quantity: number
          sale_id: string
          tax_amount: number
          tax_rate: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          sale_id: string
          tax_amount?: number
          tax_rate?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          sale_id?: string
          tax_amount?: number
          tax_rate?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          branch_id: string
          cancelled_at: string | null
          channel: Database["public"]["Enums"]["sale_channel"]
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          currency_code: string
          customer_id: string | null
          deleted_at: string | null
          discount_id: string | null
          discount_total: number
          external_reference: string | null
          id: string
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          sale_number: string
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          branch_id: string
          cancelled_at?: string | null
          channel?: Database["public"]["Enums"]["sale_channel"]
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          currency_code?: string
          customer_id?: string | null
          deleted_at?: string | null
          discount_id?: string | null
          discount_total?: number
          external_reference?: string | null
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          sale_number: string
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          branch_id?: string
          cancelled_at?: string | null
          channel?: Database["public"]["Enums"]["sale_channel"]
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          currency_code?: string
          customer_id?: string | null
          deleted_at?: string | null
          discount_id?: string | null
          discount_total?: number
          external_reference?: string | null
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          sale_number?: string
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          company_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          filters: Json
          id: string
          is_shared: boolean
          last_run_at: string | null
          name: string
          owner_user_id: string | null
          period: Database["public"]["Enums"]["report_period"]
          report_type: Database["public"]["Enums"]["report_type"]
          schedule_cron: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_shared?: boolean
          last_run_at?: string | null
          name: string
          owner_user_id?: string | null
          period?: Database["public"]["Enums"]["report_period"]
          report_type: Database["public"]["Enums"]["report_type"]
          schedule_cron?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_shared?: boolean
          last_run_at?: string | null
          name?: string
          owner_user_id?: string | null
          period?: Database["public"]["Enums"]["report_period"]
          report_type?: Database["public"]["Enums"]["report_type"]
          schedule_cron?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_schedules: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          created_by: string | null
          department_id: string | null
          employee_id: string | null
          ends_at: string
          id: string
          is_published: boolean
          name: string | null
          notes: string | null
          shift_date: string
          shift_type: Database["public"]["Enums"]["shift_type"]
          starts_at: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          employee_id?: string | null
          ends_at: string
          id?: string
          is_published?: boolean
          name?: string | null
          notes?: string | null
          shift_date: string
          shift_type?: Database["public"]["Enums"]["shift_type"]
          starts_at: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          employee_id?: string | null
          ends_at?: string
          id?: string
          is_published?: boolean
          name?: string | null
          notes?: string | null
          shift_date?: string
          shift_type?: Database["public"]["Enums"]["shift_type"]
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_quantity: number
          notes: string | null
          previous_quantity: number
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          current_period_end: string | null
          id: string
          plan_key: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          id?: string
          plan_key: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          id?: string
          plan_key?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["key"]
          },
        ]
      }
      supplier_products: {
        Row: {
          cost_price: number | null
          created_at: string
          lead_time_days: number | null
          product_id: string
          supplier_id: string
          supplier_sku: string | null
        }
        Insert: {
          cost_price?: number | null
          created_at?: string
          lead_time_days?: number | null
          product_id: string
          supplier_id: string
          supplier_sku?: string | null
        }
        Update: {
          cost_price?: number | null
          created_at?: string
          lead_time_days?: number | null
          product_id?: string
          supplier_id?: string
          supplier_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: Json | null
          company_id: string
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["supplier_status"]
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          company_id: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          assigned_by: string | null
          assigned_department_id: string | null
          assigned_role_id: string | null
          assigned_user_id: string | null
          assignee_kind: Database["public"]["Enums"]["assignee_kind"]
          company_id: string
          created_at: string
          id: string
          note: string | null
          task_id: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_department_id?: string | null
          assigned_role_id?: string | null
          assigned_user_id?: string | null
          assignee_kind?: Database["public"]["Enums"]["assignee_kind"]
          company_id: string
          created_at?: string
          id?: string
          note?: string | null
          task_id: string
        }
        Update: {
          assigned_by?: string | null
          assigned_department_id?: string | null
          assigned_role_id?: string | null
          assigned_user_id?: string | null
          assignee_kind?: Database["public"]["Enums"]["assignee_kind"]
          company_id?: string
          created_at?: string
          id?: string
          note?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_assigned_department_id_fkey"
            columns: ["assigned_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_assigned_role_id_fkey"
            columns: ["assigned_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          attachments: Json
          author_id: string | null
          body: string
          company_id: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          author_id?: string | null
          body: string
          company_id: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          author_id?: string | null
          body?: string
          company_id?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_department_id: string | null
          assigned_role_id: string | null
          assigned_user_id: string | null
          assignee_kind: Database["public"]["Enums"]["assignee_kind"]
          attachments: Json
          branch_id: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_at: string | null
          id: string
          metadata: Json
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          related_entity_id: string | null
          related_entity_type: string | null
          related_module: string | null
          source: string
          source_workflow_run_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_department_id?: string | null
          assigned_role_id?: string | null
          assigned_user_id?: string | null
          assignee_kind?: Database["public"]["Enums"]["assignee_kind"]
          attachments?: Json
          branch_id?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          related_entity_id?: string | null
          related_entity_type?: string | null
          related_module?: string | null
          source?: string
          source_workflow_run_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_department_id?: string | null
          assigned_role_id?: string | null
          assigned_user_id?: string | null
          assignee_kind?: Database["public"]["Enums"]["assignee_kind"]
          attachments?: Json
          branch_id?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          related_entity_id?: string | null
          related_entity_type?: string | null
          related_module?: string | null
          source?: string
          source_workflow_run_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_department_id_fkey"
            columns: ["assigned_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_role_id_fkey"
            columns: ["assigned_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      timezones: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      workflow_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["workflow_action_type"]
          company_id: string
          config: Json
          created_at: string
          id: string
          is_active: boolean
          position: number
          updated_at: string
          workflow_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["workflow_action_type"]
          company_id: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          updated_at?: string
          workflow_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["workflow_action_type"]
          company_id?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_actions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          attempts: number
          company_id: string
          created_at: string
          error: string | null
          event_key: string | null
          event_queue_id: string | null
          finished_at: string | null
          id: string
          idempotency_key: string | null
          matched: boolean
          payload: Json
          result: Json
          started_at: string
          status: Database["public"]["Enums"]["workflow_run_status"]
          updated_at: string
          workflow_id: string
        }
        Insert: {
          attempts?: number
          company_id: string
          created_at?: string
          error?: string | null
          event_key?: string | null
          event_queue_id?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          matched?: boolean
          payload?: Json
          result?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["workflow_run_status"]
          updated_at?: string
          workflow_id: string
        }
        Update: {
          attempts?: number
          company_id?: string
          created_at?: string
          error?: string | null
          event_key?: string | null
          event_queue_id?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          matched?: boolean
          payload?: Json
          result?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["workflow_run_status"]
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          branch_id: string | null
          company_id: string
          condition_logic: string
          conditions: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          module_id: string | null
          name: string
          owner_user_id: string | null
          run_count: number
          trigger_event: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          condition_logic?: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          module_id?: string | null
          name: string
          owner_user_id?: string | null
          run_count?: number
          trigger_event: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          condition_logic?: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          module_id?: string | null
          name?: string
          owner_user_id?: string | null
          run_count?: number
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_sale: {
        Args: { _reason?: string; _sale_id: string }
        Returns: undefined
      }
      complete_sale_atomic: { Args: { _sale_id: string }; Returns: string }
      next_document_number: {
        Args: { _company_id: string; _prefix: string }
        Returns: string
      }
      recompute_sale_totals: { Args: { _sale_id: string }; Returns: undefined }
      record_purchase_atomic: {
        Args: {
          _branch_id: string
          _company_id: string
          _currency: string
          _items: Json
          _notes: string
          _purchase_date: string
          _reference: string
          _supplier_id: string
        }
        Returns: string
      }
      record_return_atomic: { Args: { _return_id: string }; Returns: string }
    }
    Enums: {
      alert_severity: "info" | "warning" | "critical"
      alert_status: "open" | "acknowledged" | "resolved" | "dismissed"
      approval_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
        | "changes_requested"
        | "cancelled"
      approval_step_status:
        | "pending"
        | "approved"
        | "rejected"
        | "changes_requested"
        | "skipped"
      assignee_kind:
        | "user"
        | "role"
        | "department"
        | "branch"
        | "manager"
        | "team"
        | "creator"
      attendance_source: "clock" | "manual" | "import" | "correction"
      attendance_status:
        | "present"
        | "absent"
        | "late"
        | "half_day"
        | "on_leave"
        | "holiday"
      calendar_event_type:
        | "task"
        | "meeting"
        | "reminder"
        | "leave"
        | "appointment"
        | "other"
      campaign_event_type:
        | "sent"
        | "delivered"
        | "opened"
        | "clicked"
        | "bounced"
        | "failed"
        | "unsubscribed"
        | "converted"
      campaign_message_status:
        | "pending"
        | "queued"
        | "sent"
        | "delivered"
        | "failed"
        | "skipped"
        | "suppressed"
      campaign_status:
        | "draft"
        | "scheduled"
        | "running"
        | "completed"
        | "cancelled"
      candidate_status:
        | "applied"
        | "screening"
        | "interview"
        | "offer"
        | "hired"
        | "rejected"
        | "withdrawn"
      communication_channel: "email" | "in_app" | "sms" | "whatsapp"
      communication_status:
        | "queued"
        | "sent"
        | "failed"
        | "suppressed"
        | "rate_limited"
      consent_status: "unknown" | "opted_in" | "opted_out"
      coupon_status: "active" | "disabled" | "expired"
      customer_status: "active" | "inactive" | "blocked"
      customer_type: "individual" | "business" | "wholesale" | "vip" | "other"
      digest_frequency: "none" | "daily" | "weekly"
      discount_type: "percentage" | "fixed"
      employee_document_type:
        | "contract"
        | "id_card"
        | "certificate"
        | "resume"
        | "offer_letter"
        | "appraisal"
        | "other"
      employment_status:
        | "active"
        | "probation"
        | "suspended"
        | "on_leave"
        | "terminated"
        | "resigned"
      employment_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "intern"
        | "casual"
        | "volunteer"
      event_log_level: "info" | "warn" | "error"
      event_status: "queued" | "running" | "completed" | "failed" | "dead"
      expense_status: "draft" | "pending" | "approved" | "rejected" | "paid"
      feature_flag_status:
        | "development"
        | "internal"
        | "beta"
        | "premium"
        | "public"
        | "disabled"
      forecast_kind: "sales" | "inventory" | "expense" | "cashflow" | "demand"
      gift_card_status:
        | "draft"
        | "active"
        | "redeemed"
        | "expired"
        | "cancelled"
      gift_card_txn_type: "issue" | "redeem" | "adjust" | "expire" | "refund"
      goal_status: "active" | "achieved" | "missed" | "cancelled"
      goal_type:
        | "revenue"
        | "expense_limit"
        | "sales_count"
        | "inventory"
        | "branch"
        | "custom"
      health_area:
        | "overall"
        | "sales"
        | "inventory"
        | "expenses"
        | "cashflow"
        | "staff"
        | "customers"
        | "growth"
      internal_request_type:
        | "purchase"
        | "expense"
        | "leave"
        | "stock_adjustment"
        | "maintenance"
        | "staff"
        | "other"
      job_status: "queued" | "running" | "completed" | "failed" | "cancelled"
      leave_status: "draft" | "pending" | "approved" | "rejected" | "cancelled"
      leave_type:
        | "annual"
        | "sick"
        | "unpaid"
        | "maternity"
        | "paternity"
        | "compassionate"
        | "study"
        | "other"
      loyalty_txn_type: "earn" | "redeem" | "adjust" | "expire" | "revoke"
      module_status: "active" | "deprecated" | "disabled_global"
      notification_category:
        | "system"
        | "business"
        | "security"
        | "ai"
        | "billing"
        | "modules"
      notification_priority: "low" | "normal" | "high" | "critical"
      notification_status: "unread" | "read" | "archived"
      order_status:
        | "draft"
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
      payment_method: "cash" | "transfer" | "card" | "split" | "other"
      payment_status: "pending" | "partial" | "paid" | "refunded" | "failed"
      payroll_status:
        | "draft"
        | "processing"
        | "pending_approval"
        | "approved"
        | "paid"
        | "cancelled"
      platform_admin_status: "active" | "disabled"
      platform_role:
        | "super_admin"
        | "support"
        | "developer"
        | "operations"
        | "finance"
        | "compliance"
        | "security"
        | "billing"
      position_status: "draft" | "open" | "on_hold" | "closed" | "filled"
      product_status: "active" | "archived" | "draft"
      product_unit:
        | "piece"
        | "kg"
        | "g"
        | "l"
        | "ml"
        | "box"
        | "pack"
        | "carton"
        | "dozen"
        | "other"
      promotion_scope: "all" | "product" | "category" | "segment"
      promotion_status: "draft" | "active" | "paused" | "expired" | "cancelled"
      promotion_type: "percentage" | "fixed" | "buy_x_get_y"
      purchase_status: "draft" | "recorded" | "cancelled"
      recommendation_status:
        | "new"
        | "viewed"
        | "accepted"
        | "dismissed"
        | "done"
      reminder_status: "scheduled" | "sent" | "cancelled" | "failed"
      report_period: "daily" | "weekly" | "monthly" | "yearly" | "custom"
      report_status: "queued" | "running" | "completed" | "failed"
      report_type:
        | "sales"
        | "inventory"
        | "expenses"
        | "employees"
        | "customers"
        | "purchases"
        | "suppliers"
        | "branches"
        | "finance"
      request_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled"
      return_status: "draft" | "approved" | "completed" | "rejected"
      return_type: "full" | "partial" | "damaged"
      review_status:
        | "draft"
        | "in_progress"
        | "submitted"
        | "completed"
        | "cancelled"
      sale_channel: "walk_in" | "online" | "whatsapp" | "phone" | "external_pos"
      sale_status: "draft" | "completed" | "cancelled"
      segment_kind: "dynamic" | "static"
      shift_type: "morning" | "afternoon" | "night" | "custom"
      stock_movement_type:
        | "purchase"
        | "sale"
        | "adjustment"
        | "damaged"
        | "expired"
        | "transfer_in"
        | "transfer_out"
        | "opening_balance"
        | "return"
      subscription_status: "trial" | "active" | "past_due" | "cancelled"
      supplier_status: "active" | "archived"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status:
        | "todo"
        | "in_progress"
        | "waiting"
        | "completed"
        | "cancelled"
      workflow_action_type:
        | "create_task"
        | "send_notification"
        | "queue_email"
        | "create_approval"
        | "create_alert"
        | "assign_user"
        | "assign_team"
        | "publish_event"
        | "create_reminder"
        | "create_request"
        | "update_record"
      workflow_run_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "skipped"
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
    Enums: {
      alert_severity: ["info", "warning", "critical"],
      alert_status: ["open", "acknowledged", "resolved", "dismissed"],
      approval_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "changes_requested",
        "cancelled",
      ],
      approval_step_status: [
        "pending",
        "approved",
        "rejected",
        "changes_requested",
        "skipped",
      ],
      assignee_kind: [
        "user",
        "role",
        "department",
        "branch",
        "manager",
        "team",
        "creator",
      ],
      attendance_source: ["clock", "manual", "import", "correction"],
      attendance_status: [
        "present",
        "absent",
        "late",
        "half_day",
        "on_leave",
        "holiday",
      ],
      calendar_event_type: [
        "task",
        "meeting",
        "reminder",
        "leave",
        "appointment",
        "other",
      ],
      campaign_event_type: [
        "sent",
        "delivered",
        "opened",
        "clicked",
        "bounced",
        "failed",
        "unsubscribed",
        "converted",
      ],
      campaign_message_status: [
        "pending",
        "queued",
        "sent",
        "delivered",
        "failed",
        "skipped",
        "suppressed",
      ],
      campaign_status: [
        "draft",
        "scheduled",
        "running",
        "completed",
        "cancelled",
      ],
      candidate_status: [
        "applied",
        "screening",
        "interview",
        "offer",
        "hired",
        "rejected",
        "withdrawn",
      ],
      communication_channel: ["email", "in_app", "sms", "whatsapp"],
      communication_status: [
        "queued",
        "sent",
        "failed",
        "suppressed",
        "rate_limited",
      ],
      consent_status: ["unknown", "opted_in", "opted_out"],
      coupon_status: ["active", "disabled", "expired"],
      customer_status: ["active", "inactive", "blocked"],
      customer_type: ["individual", "business", "wholesale", "vip", "other"],
      digest_frequency: ["none", "daily", "weekly"],
      discount_type: ["percentage", "fixed"],
      employee_document_type: [
        "contract",
        "id_card",
        "certificate",
        "resume",
        "offer_letter",
        "appraisal",
        "other",
      ],
      employment_status: [
        "active",
        "probation",
        "suspended",
        "on_leave",
        "terminated",
        "resigned",
      ],
      employment_type: [
        "full_time",
        "part_time",
        "contract",
        "intern",
        "casual",
        "volunteer",
      ],
      event_log_level: ["info", "warn", "error"],
      event_status: ["queued", "running", "completed", "failed", "dead"],
      expense_status: ["draft", "pending", "approved", "rejected", "paid"],
      feature_flag_status: [
        "development",
        "internal",
        "beta",
        "premium",
        "public",
        "disabled",
      ],
      forecast_kind: ["sales", "inventory", "expense", "cashflow", "demand"],
      gift_card_status: ["draft", "active", "redeemed", "expired", "cancelled"],
      gift_card_txn_type: ["issue", "redeem", "adjust", "expire", "refund"],
      goal_status: ["active", "achieved", "missed", "cancelled"],
      goal_type: [
        "revenue",
        "expense_limit",
        "sales_count",
        "inventory",
        "branch",
        "custom",
      ],
      health_area: [
        "overall",
        "sales",
        "inventory",
        "expenses",
        "cashflow",
        "staff",
        "customers",
        "growth",
      ],
      internal_request_type: [
        "purchase",
        "expense",
        "leave",
        "stock_adjustment",
        "maintenance",
        "staff",
        "other",
      ],
      job_status: ["queued", "running", "completed", "failed", "cancelled"],
      leave_status: ["draft", "pending", "approved", "rejected", "cancelled"],
      leave_type: [
        "annual",
        "sick",
        "unpaid",
        "maternity",
        "paternity",
        "compassionate",
        "study",
        "other",
      ],
      loyalty_txn_type: ["earn", "redeem", "adjust", "expire", "revoke"],
      module_status: ["active", "deprecated", "disabled_global"],
      notification_category: [
        "system",
        "business",
        "security",
        "ai",
        "billing",
        "modules",
      ],
      notification_priority: ["low", "normal", "high", "critical"],
      notification_status: ["unread", "read", "archived"],
      order_status: ["draft", "pending", "confirmed", "completed", "cancelled"],
      payment_method: ["cash", "transfer", "card", "split", "other"],
      payment_status: ["pending", "partial", "paid", "refunded", "failed"],
      payroll_status: [
        "draft",
        "processing",
        "pending_approval",
        "approved",
        "paid",
        "cancelled",
      ],
      platform_admin_status: ["active", "disabled"],
      platform_role: [
        "super_admin",
        "support",
        "developer",
        "operations",
        "finance",
        "compliance",
        "security",
        "billing",
      ],
      position_status: ["draft", "open", "on_hold", "closed", "filled"],
      product_status: ["active", "archived", "draft"],
      product_unit: [
        "piece",
        "kg",
        "g",
        "l",
        "ml",
        "box",
        "pack",
        "carton",
        "dozen",
        "other",
      ],
      promotion_scope: ["all", "product", "category", "segment"],
      promotion_status: ["draft", "active", "paused", "expired", "cancelled"],
      promotion_type: ["percentage", "fixed", "buy_x_get_y"],
      purchase_status: ["draft", "recorded", "cancelled"],
      recommendation_status: ["new", "viewed", "accepted", "dismissed", "done"],
      reminder_status: ["scheduled", "sent", "cancelled", "failed"],
      report_period: ["daily", "weekly", "monthly", "yearly", "custom"],
      report_status: ["queued", "running", "completed", "failed"],
      report_type: [
        "sales",
        "inventory",
        "expenses",
        "employees",
        "customers",
        "purchases",
        "suppliers",
        "branches",
        "finance",
      ],
      request_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "completed",
        "cancelled",
      ],
      return_status: ["draft", "approved", "completed", "rejected"],
      return_type: ["full", "partial", "damaged"],
      review_status: [
        "draft",
        "in_progress",
        "submitted",
        "completed",
        "cancelled",
      ],
      sale_channel: ["walk_in", "online", "whatsapp", "phone", "external_pos"],
      sale_status: ["draft", "completed", "cancelled"],
      segment_kind: ["dynamic", "static"],
      shift_type: ["morning", "afternoon", "night", "custom"],
      stock_movement_type: [
        "purchase",
        "sale",
        "adjustment",
        "damaged",
        "expired",
        "transfer_in",
        "transfer_out",
        "opening_balance",
        "return",
      ],
      subscription_status: ["trial", "active", "past_due", "cancelled"],
      supplier_status: ["active", "archived"],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["todo", "in_progress", "waiting", "completed", "cancelled"],
      workflow_action_type: [
        "create_task",
        "send_notification",
        "queue_email",
        "create_approval",
        "create_alert",
        "assign_user",
        "assign_team",
        "publish_event",
        "create_reminder",
        "create_request",
        "update_record",
      ],
      workflow_run_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "skipped",
      ],
    },
  },
} as const

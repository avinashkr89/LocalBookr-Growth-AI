export enum LeadStatus {
  NEW = 'NEW',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  WAITING_PROVIDER = 'WAITING_PROVIDER',
  FOLLOWED_UP = 'FOLLOWED_UP',
  CLOSED = 'CLOSED'
}

export enum Urgency {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface ParsedLeadData {
  role: 'customer' | 'provider' | 'unknown';
  intent_type: 'customer_lead' | 'provider_lead' | 'general_question' | 'unknown';
  service_type: string | null;
  location: string | null;
  date: string | null;
  budget: number | null;
  urgency: Urgency | null;
  notes: string | null;
}

export interface ToolsResult {
  base_price_inr: number | null;
  priority: Urgency | null;
  provider_summary: string | null;
}

export interface PipelineResult {
  parsed_lead: ParsedLeadData;
  tools_result: ToolsResult;
  reply_message: string;
  follow_up_message: string | null;
  new_status: LeadStatus;
  summary: string;
}

export interface Lead {
  id: string;
  customerName: string;
  rawMessage: string;
  timestamp: number;
  pipelineResult?: PipelineResult;
  isProcessing: boolean;
  error?: string;
  status: LeadStatus; // Add status to Lead interface
}

export const SERVICE_PRICES: Record<string, number> = {
  'birthday decoration': 2000,
  'wedding decoration': 15000,
  'home tutor': 500,
  'assignment writing': 300,
  'mehendi': 1200,
  'makeup': 2500,
  'plumbing': 200,
  'cleaning': 800,
  'car rental': 1000,
  'photography': 3000,
  'dj services': 4000
};
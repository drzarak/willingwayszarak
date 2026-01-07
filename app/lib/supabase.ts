import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HealthRecord {
  id: string;
  patient_id: string;
  record_type: string;
  record_date: string;
  description: string;
  diagnosis?: string;
  medications?: string[];
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

export interface HealthMetrics {
  id: string;
  patient_id: string;
  metric_date: string;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  blood_sugar?: number;
  weight?: number;
  height?: number;
  temperature?: number;
  oxygen_saturation?: number;
  created_at: string;
}

export interface RiskScore {
  id: string;
  patient_id: string;
  score_type: 'diabetes' | 'heart_disease' | 'hypertension' | 'mental_health';
  score_value: number;
  risk_level: 'low' | 'medium' | 'high';
  factors: string[];
  calculated_at: string;
}

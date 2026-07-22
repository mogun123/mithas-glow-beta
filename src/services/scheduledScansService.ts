/**
 * Scheduled Scans Service
 * Dedicated persistence for user skin-scan schedules.
 * STRICT: Never routes into consultations or bookings.
 */

import { supabase } from '../lib/supabase';

export type ScheduledScanStatus = 'upcoming' | 'completed' | 'cancelled' | 'missed';

export interface ScheduledScan {
  id: string;
  user_id: string;
  scheduled_at: string;
  scheduled_time: string;
  status: ScheduledScanStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledScanInput {
  user_id: string;
  scheduled_at: Date;
  scheduled_time: string;
  notes?: string;
}

function assertFiniteDate(date: Date, field: string): void {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error(`DATA_INTEGRITY_ERROR: Invalid ${field}`);
  }
}

export class ScheduledScansService {
  static async create(input: CreateScheduledScanInput): Promise<ScheduledScan> {
    assertFiniteDate(input.scheduled_at, 'scheduled_at');

    if (!input.user_id) {
      throw new Error('AUTH_ERROR: User must be logged in to schedule a scan');
    }

    if (!input.scheduled_time?.trim()) {
      throw new Error('DATA_INTEGRITY_ERROR: scheduled_time is required');
    }

    const { data, error } = await supabase
      .from('scheduled_scans')
      .insert([{
        user_id: input.user_id,
        scheduled_at: input.scheduled_at.toISOString(),
        scheduled_time: input.scheduled_time.trim(),
        status: 'upcoming' as ScheduledScanStatus,
        notes: input.notes ?? null,
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to schedule scan: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to schedule scan: empty response from database');
    }

    return data as ScheduledScan;
  }

  static async listUpcoming(userId: string, limit = 20): Promise<ScheduledScan[]> {
    if (!userId) {
      throw new Error('AUTH_ERROR: userId is required');
    }

    const { data, error } = await supabase
      .from('scheduled_scans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'upcoming')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch scheduled scans: ${error.message}`);
    }

    return (data || []) as ScheduledScan[];
  }

  static async listForUser(userId: string, limit = 50): Promise<ScheduledScan[]> {
    if (!userId) {
      throw new Error('AUTH_ERROR: userId is required');
    }

    const { data, error } = await supabase
      .from('scheduled_scans')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch scheduled scans: ${error.message}`);
    }

    return (data || []) as ScheduledScan[];
  }

  static async cancel(scanId: string, userId: string): Promise<ScheduledScan> {
    const { data, error } = await supabase
      .from('scheduled_scans')
      .update({ status: 'cancelled' as ScheduledScanStatus })
      .eq('id', scanId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel scheduled scan: ${error.message}`);
    }

    return data as ScheduledScan;
  }
}

export default ScheduledScansService;

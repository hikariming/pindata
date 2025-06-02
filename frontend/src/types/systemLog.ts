import { ApiResponse, PaginatedResponse } from './api';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SystemLog {
  id: string;
  level: LogLevel;
  message: string;
  source: string;
  details?: string;
  module?: string;
  function?: string;
  line_number?: number;
  request_id?: string;
  user_id?: string;
  ip_address?: string;
  extra_data?: Record<string, any>;
  error_code?: string;
  stack_trace?: string;
  timestamp: string;
}

export interface SystemLogQueryParams {
  page?: number;
  per_page?: number;
  level?: LogLevel;
  source?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  request_id?: string;
}

export interface SystemLogStats {
  level_stats: Record<LogLevel, number>;
  total_logs: number;
  recent_errors: number;
  active_sources: Array<{
    source: string;
    count: number;
  }>;
  time_range_hours: number;
}

export interface LogCleanupRequest {
  days: number;
}

export interface LogCleanupResponse {
  deleted_count: number;
  retention_days: number;
}

export interface LogExportRequest {
  level?: LogLevel;
  source?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface LogExportResponse {
  logs: SystemLog[];
  count: number;
  exported_at: string;
} 
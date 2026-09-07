/**
 * API utility for communicating with the PostgreSQL DDL Parser backend.
 */

import axios, { AxiosError } from 'axios';
import type { ParseResponse } from '../types/schema';

// Backend API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/postgres/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

/**
 * Parse PostgreSQL DDL and return structured schema.
 *
 * @param ddl - PostgreSQL DDL statements as a string
 * @returns Parse response with schema or errors
 */
export async function parseDDL(ddl: string, signal?: AbortSignal): Promise<ParseResponse> {
  try {
    const response = await api.post<ParseResponse>('/parse', { ddl }, { signal });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Handle network errors
      if (!axiosError.response) {
        return {
          valid: false,
          errors: [{
            line: 0,
            column: 0,
            message: 'Network error: Unable to connect to the backend server. Please ensure the backend is running on ' + API_BASE_URL,
          }],
        };
      }

      // Handle server errors
      if (axiosError.response.status >= 500) {
        return {
          valid: false,
          errors: [{
            line: 0,
            column: 0,
            message: 'Server error: The backend encountered an unexpected error.',
          }],
        };
      }

      // Try to extract error message from response
      const errorData = axiosError.response.data as { errors?: unknown };
      if (errorData && errorData.errors) {
        return errorData as ParseResponse;
      }
    }

    // Fallback error
    return {
      valid: false,
      errors: [{
        line: 0,
        column: 0,
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
    };
  }
}

/**
 * Health check endpoint to verify backend connectivity.
 *
 * @returns True if backend is healthy, false otherwise
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await api.get('/health');
    return response.data.status === 'healthy';
  } catch {
    return false;
  }
}

/**
 * Get the current API base URL.
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

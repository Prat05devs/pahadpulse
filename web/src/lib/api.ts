import { z } from 'zod';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface ApiErrorResponse {
  error: {
    code: number;
    message: string;
  };
  requestId?: string;
}

interface SuccessResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = {
  async get<T>(
    endpoint: string,
    schema: z.ZodSchema<T>,
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const json = await response.json() as unknown;

      if (!response.ok) {
        const errorData = json as ApiErrorResponse;
        throw new ApiError(
          errorData.error?.code || response.status,
          errorData.error?.message || response.statusText,
          response.status
        );
      }

      const successData = json as SuccessResponse<unknown>;
      if (!successData.success || !successData.data) {
        throw new ApiError(
          10000,
          `Invalid response: ${successData.message || 'No data returned'}`,
          response.status
        );
      }

      return schema.parse(successData.data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof z.ZodError) {
        throw new ApiError(
          10000,
          `Invalid response format: ${error.message}`,
          500
        );
      }
      throw error;
    }
  },

  async post<T>(
    endpoint: string,
    body: unknown,
    schema: z.ZodSchema<T>,
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: JSON.stringify(body),
      });

      const json = await response.json() as unknown;

      if (!response.ok) {
        const errorData = json as ApiErrorResponse;
        throw new ApiError(
          errorData.error?.code || response.status,
          errorData.error?.message || response.statusText,
          response.status
        );
      }

      const successData = json as SuccessResponse<unknown>;
      if (!successData.success || !successData.data) {
        throw new ApiError(
          10000,
          `Invalid response: ${successData.message || 'No data returned'}`,
          response.status
        );
      }

      return schema.parse(successData.data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof z.ZodError) {
        throw new ApiError(
          10000,
          `Invalid response format: ${error.message}`,
          500
        );
      }
      throw error;
    }
  },
};

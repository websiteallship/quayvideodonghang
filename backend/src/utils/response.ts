import { Context } from 'hono';
import { ContentfulStatusCode } from 'hono/utils/http-status';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function successResponse<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json<ApiResponse<T>>(
    {
      success: true,
      data
    },
    status
  );
}

export function errorResponse(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode = 400,
  details?: unknown
) {
  return c.json<ApiResponse>(
    {
      success: false,
      error: {
        code,
        message,
        details
      }
    },
    status
  );
}

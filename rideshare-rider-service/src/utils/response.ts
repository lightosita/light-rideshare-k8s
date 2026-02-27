export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    request_id?: string;
  };
}

export class ResponseUtils {
  static success(data: any, requestId?: string): ApiResponse {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
    };
  }

  static error(code: string, message: string, details?: any, requestId?: string): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
    };
  }
}
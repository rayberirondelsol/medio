/**
 * Error Formatter Utility
 *
 * Converts technical errors into user-friendly, actionable error messages.
 * Supports multiple error types and platform-specific error handling.
 */

export enum ErrorType {
  // URL Errors
  INVALID_URL = 'INVALID_URL',
  UNSUPPORTED_PLATFORM = 'UNSUPPORTED_PLATFORM',
  MALFORMED_URL = 'MALFORMED_URL',

  // Video Access Errors
  PRIVATE_VIDEO = 'PRIVATE_VIDEO',
  ACCESS_RESTRICTED = 'ACCESS_RESTRICTED',
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  VIDEO_DELETED = 'VIDEO_DELETED',

  // API Errors
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  API_AUTH_ERROR = 'API_AUTH_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',

  // Network Errors
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DNS_ERROR = 'DNS_ERROR',

  // Duplicate Errors
  DUPLICATE_VIDEO = 'DUPLICATE_VIDEO',
  DUPLICATE_URL = 'DUPLICATE_URL',

  // Server Errors
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Generic
  UNKNOWN = 'UNKNOWN'
}

export interface FormattedError {
  title: string;
  message: string;
  actionable: string;
  type: ErrorType;
}

/**
 * Auto-detect error type from error message
 */
function detectErrorType(error: Error | null): ErrorType {
  if (!error) {
    return ErrorType.UNKNOWN;
  }

  const message = (error.message || '').toLowerCase();
  const errorCode = ((error as any).code || '').toLowerCase();

  // Check for specific error patterns

  // Deleted video (more specific than not found)
  if (message.includes('deleted') || message.includes('removed')) {
    return ErrorType.VIDEO_DELETED;
  }

  // Video not found
  if (message.includes('not found') || message.includes('404')) {
    return ErrorType.VIDEO_NOT_FOUND;
  }

  // Private/Restricted video (check for both private and forbidden)
  if (message.includes('private') && !message.includes('authentication')) {
    return ErrorType.PRIVATE_VIDEO;
  }

  if (message.includes('forbidden') || message.includes('restricted')) {
    return ErrorType.PRIVATE_VIDEO;
  }

  // Access requires authentication
  if (message.includes('authentication') || message.includes('unauthorized') || message.includes('access denied')) {
    return ErrorType.ACCESS_RESTRICTED;
  }

  // API Quota exceeded (check before general quota)
  if (message.includes('quota exceeded') || message.includes('api quota')) {
    return ErrorType.API_QUOTA_EXCEEDED;
  }

  // API rate limit
  if (message.includes('rate limit')) {
    return ErrorType.API_RATE_LIMIT;
  }

  // API key errors
  if (message.includes('api key') || message.includes('invalid api')) {
    return ErrorType.API_AUTH_ERROR;
  }

  // Network timeout
  if (message.includes('timeout') || message.includes('etimedout') || errorCode === 'etimedout' || errorCode === 'econnaborted') {
    return ErrorType.TIMEOUT;
  }

  // DNS errors
  if (message.includes('enotfound') || errorCode === 'enotfound') {
    return ErrorType.DNS_ERROR;
  }

  // Network errors
  if (message.includes('network') || errorCode === 'err_network' || errorCode === 'econnrefused' || errorCode === 'econnreset') {
    return ErrorType.NETWORK_ERROR;
  }

  // Duplicate URL (more specific)
  if ((message.includes('already') || message.includes('duplicate')) && message.includes('url')) {
    return ErrorType.DUPLICATE_URL;
  }

  // Duplicate video
  if (message.includes('already exists') || message.includes('duplicate') || message.includes('already added') || message.includes('already in')) {
    return ErrorType.DUPLICATE_VIDEO;
  }

  // Unsupported platform
  if (message.includes('unsupported platform')) {
    return ErrorType.UNSUPPORTED_PLATFORM;
  }

  // Malformed/unable to extract
  if (message.includes('extract') || message.includes('unable to')) {
    return ErrorType.MALFORMED_URL;
  }

  // Invalid URL
  if (message.includes('invalid url') || message.includes('url format') || message.includes('malformed url')) {
    return ErrorType.INVALID_URL;
  }

  // Server errors
  if (message.includes('server error') || message.includes('internal error') || message.includes('500')) {
    return ErrorType.SERVER_ERROR;
  }

  // Database errors
  if (message.includes('database')) {
    return ErrorType.DATABASE_ERROR;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Format error message for user display
 *
 * @param error - The error object
 * @param type - Optional explicit error type (auto-detected if not provided)
 * @param platform - Optional platform name for context
 * @returns Formatted error with title, message, and actionable guidance
 */
export function formatErrorMessage(
  error: Error | null,
  type?: ErrorType,
  platform?: string
): FormattedError {
  // Auto-detect type if not provided
  const errorType = type || detectErrorType(error);

  // Error message templates
  const errorMessages: Record<ErrorType, FormattedError> = {
    [ErrorType.INVALID_URL]: {
      title: 'Invalid Video URL',
      message: 'Please enter a valid video URL from YouTube, Vimeo, or Dailymotion.',
      actionable: 'Double-check the URL and try again.',
      type: ErrorType.INVALID_URL
    },
    [ErrorType.UNSUPPORTED_PLATFORM]: {
      title: 'Unsupported Platform',
      message: 'We currently support YouTube, Vimeo, and Dailymotion videos only.',
      actionable: 'Please use a URL from one of these platforms.',
      type: ErrorType.UNSUPPORTED_PLATFORM
    },
    [ErrorType.MALFORMED_URL]: {
      title: 'Unable to Extract Video',
      message: 'The URL format is not recognized.',
      actionable: 'Make sure you copied the complete URL from the video page.',
      type: ErrorType.MALFORMED_URL
    },
    [ErrorType.PRIVATE_VIDEO]: {
      title: 'Video is Private',
      message: 'This video is private or restricted and cannot be added to your library.',
      actionable: 'Try a different video or check with the video owner for access.',
      type: ErrorType.PRIVATE_VIDEO
    },
    [ErrorType.ACCESS_RESTRICTED]: {
      title: 'Access Restricted',
      message: 'This video requires authentication or special permissions.',
      actionable: 'Only publicly accessible videos can be added.',
      type: ErrorType.ACCESS_RESTRICTED
    },
    [ErrorType.VIDEO_NOT_FOUND]: {
      title: 'Video Not Found',
      message: 'The video could not be found. It may have been deleted or removed.',
      actionable: 'Verify the URL is correct and the video still exists.',
      type: ErrorType.VIDEO_NOT_FOUND
    },
    [ErrorType.VIDEO_DELETED]: {
      title: 'Video Deleted',
      message: 'This video has been removed by the owner or platform.',
      actionable: 'Try a different video.',
      type: ErrorType.VIDEO_DELETED
    },
    [ErrorType.API_QUOTA_EXCEEDED]: {
      title: 'Service Temporarily Unavailable',
      message: 'Our video service has reached its daily limit.',
      actionable: 'Please try again in a few hours or tomorrow.',
      type: ErrorType.API_QUOTA_EXCEEDED
    },
    [ErrorType.API_AUTH_ERROR]: {
      title: 'Service Configuration Error',
      message: 'There is a problem with our video service configuration.',
      actionable: 'Please contact support if this issue persists.',
      type: ErrorType.API_AUTH_ERROR
    },
    [ErrorType.API_RATE_LIMIT]: {
      title: 'Too Many Requests',
      message: 'You have made too many requests in a short time.',
      actionable: 'Please wait a moment and try again.',
      type: ErrorType.API_RATE_LIMIT
    },
    [ErrorType.TIMEOUT]: {
      title: 'Request Timed Out',
      message: 'The video service is taking too long to respond.',
      actionable: 'Check your internet connection and try again.',
      type: ErrorType.TIMEOUT
    },
    [ErrorType.NETWORK_ERROR]: {
      title: 'Connection Error',
      message: 'Unable to connect to the video service.',
      actionable: 'Check your internet connection and try again.',
      type: ErrorType.NETWORK_ERROR
    },
    [ErrorType.DNS_ERROR]: {
      title: 'Connection Error',
      message: 'Unable to reach the video platform.',
      actionable: 'Check your internet connection or try again later.',
      type: ErrorType.DNS_ERROR
    },
    [ErrorType.DUPLICATE_VIDEO]: {
      title: 'Video Already Added',
      message: 'This video is already in your library.',
      actionable: 'Check your library or add a different video.',
      type: ErrorType.DUPLICATE_VIDEO
    },
    [ErrorType.DUPLICATE_URL]: {
      title: 'Duplicate Video',
      message: 'You have already added this video to your library.',
      actionable: 'View it in your library or add a different video.',
      type: ErrorType.DUPLICATE_URL
    },
    [ErrorType.SERVER_ERROR]: {
      title: 'Server Error',
      message: 'An unexpected error occurred on our server.',
      actionable: 'Please try again later or contact support if the issue persists.',
      type: ErrorType.SERVER_ERROR
    },
    [ErrorType.DATABASE_ERROR]: {
      title: 'Service Error',
      message: 'We are experiencing technical difficulties.',
      actionable: 'Please try again in a few moments.',
      type: ErrorType.DATABASE_ERROR
    },
    [ErrorType.UNKNOWN]: {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred.',
      actionable: 'Please try again or contact support if the problem continues.',
      type: ErrorType.UNKNOWN
    }
  };

  return errorMessages[errorType];
}

/**
 * Format axios error for user display
 */
export function formatAxiosError(error: any): FormattedError {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return formatErrorMessage(error, ErrorType.TIMEOUT);
  }

  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    if (status === 404) {
      return formatErrorMessage(
        new Error(data.error || 'Video not found'),
        ErrorType.VIDEO_NOT_FOUND
      );
    }

    if (status === 409) {
      return formatErrorMessage(
        new Error(data.error || 'Duplicate video'),
        ErrorType.DUPLICATE_VIDEO
      );
    }

    if (status === 429) {
      return formatErrorMessage(
        new Error(data.error || 'Too many requests'),
        ErrorType.API_RATE_LIMIT
      );
    }

    if (status === 503) {
      return formatErrorMessage(
        new Error(data.error || 'Service unavailable'),
        ErrorType.API_QUOTA_EXCEEDED
      );
    }

    if (status >= 500) {
      return formatErrorMessage(
        new Error(data.error || 'Server error'),
        ErrorType.SERVER_ERROR
      );
    }
  }

  if (error.request) {
    return formatErrorMessage(error, ErrorType.NETWORK_ERROR);
  }

  return formatErrorMessage(error, ErrorType.UNKNOWN);
}

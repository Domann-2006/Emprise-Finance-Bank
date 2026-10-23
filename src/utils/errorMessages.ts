/**
 * Friendly Error Handling & Connection Utilities for Emprise Finance
 * 
 * Maps raw Firebase exceptions, offline states, and timeouts to friendly user-facing messages.
 * Never leaks raw Firebase error codes or stack traces to end users.
 */

export interface FriendlyError {
  title: string;
  message: string;
  kind: 'network' | 'auth' | 'permission' | 'unknown';
}

/**
 * Known domain/business error message prefixes or exact matches that should be displayed verbatim.
 */
const KNOWN_BUSINESS_MESSAGES = [
  'insufficient funds',
  'recipient account number could not be found',
  'recipient account is currently disabled',
  'recipient account is closed',
  'sender account not found',
  'unauthorized transfer request',
  'your account is currently inactive',
  'self-transfer is not permitted',
  'pin must be exactly 4',
  'pin is too simple',
  'pin confirmation does not match',
  'current pin is incorrect',
  'incorrect current pin',
  'account password is required',
  'password must be at least 6 characters',
  'username must be at least 3',
  'username may only contain',
  'this username is already taken',
  'please enter both your username and password',
  'please fill in your full residential address',
  'please provide your legal first and last name',
  'please enter your date of birth',
  'you must be at least 18 years old',
  'please enter a valid email address',
  'please enter a valid 10-digit mobile phone number',
  'too many failed pin attempts',
  'transfer pin configured successfully',
];

/**
 * Translates any error or rejection into a user-friendly object.
 */
export function getFriendlyError(error: unknown): FriendlyError {
  // 1. Check if browser is currently offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      title: 'Network problem',
      message: 'Check your network connection and try again.',
      kind: 'network',
    };
  }

  if (!error) {
    return {
      title: 'Something went wrong',
      message: 'Something went wrong. Please try again.',
      kind: 'unknown',
    };
  }

  // Extract raw string and code
  let rawMsg = '';
  let rawCode = '';

  if (typeof error === 'string') {
    rawMsg = error;
  } else if (error instanceof Error) {
    rawMsg = error.message || '';
    rawCode = (error as any).code || '';
  } else if (typeof error === 'object' && error !== null) {
    rawMsg = (error as any).message || String(error);
    rawCode = (error as any).code || '';
  }

  // Check if message is a JSON string from handleFirestoreError
  if (rawMsg.startsWith('{') && rawMsg.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawMsg);
      if (parsed.error) rawMsg = parsed.error;
      if (parsed.code) rawCode = parsed.code;
    } catch {
      // not JSON, keep rawMsg
    }
  }

  const lowerMsg = rawMsg.toLowerCase();
  const lowerCode = rawCode.toLowerCase();

  // 2. Network / Offline / Timeout Mapping
  const isNetworkIssue =
    lowerCode.includes('unavailable') ||
    lowerCode.includes('deadline-exceeded') ||
    lowerCode.includes('network-request-failed') ||
    lowerCode.includes('failed-precondition') ||
    lowerMsg.includes('unavailable') ||
    lowerMsg.includes('deadline-exceeded') ||
    lowerMsg.includes('network-request-failed') ||
    lowerMsg.includes('client is offline') ||
    lowerMsg.includes('offline') ||
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('network error') ||
    lowerMsg.includes('failed to get document because the client is offline');

  if (isNetworkIssue) {
    return {
      title: 'Network problem',
      message: 'Check your network connection and try again.',
      kind: 'network',
    };
  }

  // 3. Auth Invalid Credentials Mapping
  const isInvalidCredential =
    lowerCode.includes('invalid-credential') ||
    lowerCode.includes('wrong-password') ||
    lowerCode.includes('user-not-found') ||
    lowerMsg.includes('invalid-credential') ||
    lowerMsg.includes('wrong-password') ||
    lowerMsg.includes('user-not-found') ||
    lowerMsg.includes('invalid username or password') ||
    lowerMsg.includes('invalid credentials');

  if (isInvalidCredential) {
    return {
      title: 'Invalid credentials',
      message: 'Invalid username or password.',
      kind: 'auth',
    };
  }

  // 4. Rate Limiting / Too Many Attempts Mapping
  const isTooManyRequests =
    lowerCode.includes('too-many-requests') ||
    lowerMsg.includes('too-many-requests') ||
    lowerMsg.includes('too many attempts');

  if (isTooManyRequests) {
    return {
      title: 'Too many attempts',
      message: 'Too many attempts. Please wait a few minutes and try again.',
      kind: 'auth',
    };
  }

  // 5. Permission / Access Denied Mapping
  const isPermissionDenied =
    lowerCode.includes('permission-denied') ||
    lowerCode.includes('pin_or_permission') ||
    lowerMsg.includes('permission-denied') ||
    lowerMsg.includes('missing or insufficient permissions') ||
    lowerMsg.includes('insufficient permission') ||
    lowerMsg.includes('permission issue');

  if (isPermissionDenied) {
    return {
      title: 'Request unavailable',
      message: "We couldn't complete that request. Please try again or contact support.",
      kind: 'permission',
    };
  }

  // 6. Check for explicitly preserved business logic messages
  for (const known of KNOWN_BUSINESS_MESSAGES) {
    if (lowerMsg.includes(known)) {
      return {
        title: 'Notice',
        message: rawMsg,
        kind: 'unknown',
      };
    }
  }

  // 7. General Fallback - never show raw Firebase codes or stack traces
  return {
    title: 'Something went wrong',
    message: 'Something went wrong. Please try again.',
    kind: 'unknown',
  };
}

/**
 * Wraps an async operation with a strict timeout (defaults to 10 seconds).
 * Rejects with a Error('timeout') if time limit is exceeded.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

/**
 * Triggers a subtle shake animation on the offline connection banner
 * when an offline user taps a disabled button.
 */
export function triggerOfflineShake(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('emprise:shake-offline-banner'));
  }
}

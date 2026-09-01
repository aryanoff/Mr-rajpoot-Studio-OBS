export interface NormalizedAdminError {
  title: string;
  message: string;
  technicalDetails?: string;
  actionHint?: string;
}

/**
 * Translates raw database and backend errors into friendly, professional admin feedback.
 */
export function normalizeAdminError(error: any): NormalizedAdminError {
  if (!error) {
    return {
      title: 'Unknown Error',
      message: 'An unexpected operational error occurred.',
    };
  }

  const rawMsg = typeof error === 'string' ? error : error?.message || error?.error_description || String(error);

  // Duplicate active grant
  if (rawMsg.includes('duplicate key') || rawMsg.includes('idx_plan_grants_active_user') || rawMsg.includes('23505')) {
    return {
      title: 'Active Access Grant Exists',
      message: 'This customer already has an active access grant. Please edit or revoke the existing grant first.',
      technicalDetails: rawMsg,
      actionHint: 'Review customer access tab.',
    };
  }

  // Foreign key / user not found
  if (rawMsg.includes('foreign key') || rawMsg.includes('23503') || rawMsg.includes('User profile not found')) {
    return {
      title: 'Customer Not Found',
      message: 'The selected customer record does not exist or has been removed.',
      technicalDetails: rawMsg,
    };
  }

  // Permission denied / unauthorized
  if (rawMsg.includes('permission denied') || rawMsg.includes('42501') || rawMsg.includes('Unauthorized') || rawMsg.includes('403')) {
    return {
      title: 'Administrative Permission Required',
      message: 'You must have administrative privileges to perform this operational action.',
      technicalDetails: rawMsg,
    };
  }

  // Stripe secret missing
  if (rawMsg.includes('STRIPE_SECRET_KEY')) {
    return {
      title: 'Payment Gateway Configuration Missing',
      message: 'Stripe API keys are not configured in the server environment. Please configure STRIPE_SECRET_KEY to enable live payment operations.',
      technicalDetails: rawMsg,
    };
  }

  // Fallback
  return {
    title: 'Operation Failed',
    message: rawMsg.replace(/^(error: |Error: )/i, ''),
    technicalDetails: typeof error === 'object' ? JSON.stringify(error, null, 2) : undefined,
  };
}

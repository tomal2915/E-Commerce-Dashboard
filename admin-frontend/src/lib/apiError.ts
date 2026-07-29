// src/lib/apiError.ts
// Your backend returns { success: false, message: "..." } — sometimes message
// is an array (class-validator errors joined), sometimes a single string.
// This helper normalizes both into a per-field error map when possible.
export function parseFieldErrors(message: string | string[]): Record<string, string> {
  const messages = Array.isArray(message) ? message : [message];
  const fieldErrors: Record<string, string> = {};

  for (const msg of messages) {
    // class-validator messages often start with the field name, e.g. "name should not be empty"
    const match = msg.match(/^(\w+)\s/);
    if (match) {
      fieldErrors[match[1]] = msg;
    }
  }

  return fieldErrors;
}

export function getErrorMessage(err: any): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? 'Something went wrong. Please try again.';
}
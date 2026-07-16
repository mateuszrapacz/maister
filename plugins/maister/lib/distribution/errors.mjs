const OVERLAY_ERROR_CODES = new Set([
  "E_OVERLAY_IO",
  "E_OVERLAY_PARSE",
  "E_OVERLAY_SCHEMA",
  "E_OVERLAY_TARGET",
  "E_OVERLAY_PATH",
  "E_OVERLAY_COLLISION",
  "E_OVERLAY_OWNERSHIP",
  "E_OVERLAY_BINDINGS",
  "E_OVERLAY_INVENTORY",
  "E_OVERLAY_VOCABULARY",
]);

export class OverlayValidationError extends Error {
  constructor(code, message, details = {}, { retryable = false, cause } = {}) {
    if (!OVERLAY_ERROR_CODES.has(code)) {
      throw new TypeError(`Unknown overlay error code: ${code}`);
    }
    super(`[${code}] ${message}`, cause === undefined ? {} : { cause });
    this.name = "OverlayValidationError";
    this.code = code;
    this.kind = code;
    this.details = details;
    this.retryable = retryable;
  }
}

export function overlayError(code, message, details = {}, options = {}) {
  return new OverlayValidationError(code, message, details, options);
}

export function throwOverlayError(code, message, details = {}, options = {}) {
  throw overlayError(code, message, details, options);
}

export function isOverlayValidationError(error) {
  return error instanceof OverlayValidationError;
}

export const OVERLAY_ERROR_CODES_LIST = Object.freeze([...OVERLAY_ERROR_CODES]);

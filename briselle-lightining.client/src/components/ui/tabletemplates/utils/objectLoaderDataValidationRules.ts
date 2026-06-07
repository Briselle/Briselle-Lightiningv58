/**
 * Object Loader data validation master:
 * centralized URL/email/phone validation + URL normalization helpers.
 *
 * Keep this file behavior-compatible when migrating callers.
 */

export function validateEmailValue(value: string): string | null {
    const t = value.trim();
    if (!t) return null;
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(t)) return 'Enter a valid email address (example: user@domain.com).';
    return null;
}

/** Normalize user-entered URL for `new URL()` (add https if scheme omitted). */
export function normalizeUrlInputForParse(raw: string): string {
    const t = raw.trim();
    if (!t) return t;
    if (/^https?:\/\//i.test(t)) return t;
    if (/^www\./i.test(t)) return `https://${t}`;
    return `https://${t}`;
}

export function validateUrlValue(value: string): string | null {
    const t = value.trim();
    if (!t) return null;
    const candidate = normalizeUrlInputForParse(t);
    try {
        const u = new URL(candidate);
        const host = u.hostname;
        if (!host) return 'Enter a valid website address.';
        if (!host.includes('.')) return 'Enter a valid website address (include a domain suffix such as .com).';
        const labels = host.split('.');
        const tld = labels[labels.length - 1] ?? '';
        if (tld.length < 2) return 'Enter a valid website address (include a domain suffix such as .com).';
        return null;
    } catch {
        return 'Enter a valid website address.';
    }
}

export function validatePhoneValue(value: string): string | null {
    if (!value) return null;
    const phoneRegex = /^\+\d{1,4}-[0-9][0-9\s-]{4,19}$/;
    if (!phoneRegex.test(value)) return 'Enter phone as +<countrycode>-<number> (example: +91-289889832).';
    return null;
}

/** Build href for table links from stored cell text. */
export function hrefFromUrlCellText(cellText: string): string {
    const t = String(cellText ?? '').trim();
    if (!t) return t;
    if (/^https?:\/\//i.test(t)) return t;
    if (/^www\./i.test(t)) return `https://${t}`;
    return `https://${t}`;
}

/**
 * Unified dispatcher for object-loader datatype validation.
 * Returns null for unknown types to preserve existing behavior.
 */
export function validateObjectLoaderValueByType(type: string | undefined, value: string): string | null {
    const t = String(type ?? '').trim().toLowerCase();
    if (t === 'email') return validateEmailValue(value);
    if (t === 'url') return validateUrlValue(value);
    if (t === 'phone') return validatePhoneValue(value);
    return null;
}

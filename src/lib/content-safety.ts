/**
 * MITHAS GLOW - Content Safety Utility
 * Purpose: Detect and prevent off-platform contact/payment information sharing
 * 
 * This utility provides regex-based detection for:
 * - Phone numbers (Indian format)
 * - Email addresses
 * - UPI IDs and payment links
 * - WhatsApp/Telegram links
 * - External booking URLs
 * 
 * IMPORTANT: This is a CLIENT-SIDE utility for UX warnings.
 * Server-side validation must be implemented separately.
 */

// ============================================
// Regex Patterns
// ============================================

/**
 * Indian phone number patterns
 * Matches: +91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX (10 digits starting with 6-9)
 */
const PHONE_PATTERNS = [
  /\+91\s?[6-9]\d{9}/g,           // +91XXXXXXXXXX
  /^(\+91|0)?[6-9]\d{9}$/g,       // Standalone 10-digit number
  /\b[6-9]\d{9}\b/g,              // 10-digit number in text
  /\d{4}\s?\d{3}\s?\d{3}/g,       // XXXX XXX XXX format
];

/**
 * Email address pattern
 */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * UPI ID patterns
 * Matches: username@upi, username@paytm, etc.
 */
const UPI_PATTERNS = [
  /[a-zA-Z0-9._-]+@upi/g,
  /[a-zA-Z0-9._-]+@paytm/g,
  /[a-zA-Z0-9._-]+@phonepe/g,
  /[a-zA-Z0-9._-]+@googlepay/g,
  /[a-zA-Z0-9._-]+@bhim/g,
];

/**
 * UPI payment link patterns
 */
const UPI_LINK_PATTERNS = [
  /upi:\/\/[^\s]*/g,
  /razorpay\.me\/[^\s]*/g,
  /payment\.links\.[^\s]*/g,
  /billdesk\.com\/[^\s]*/g,
];

/**
 * WhatsApp contact patterns
 */
const WHATSAPP_PATTERNS = [
  /wa\.me\/[^\s]*/g,
  /whatsapp\.com\/[^\s]*/g,
  /api\.whatsapp\.com\/[^\s]*/g,
];

/**
 * Telegram patterns
 */
const TELEGRAM_PATTERNS = [
  /t\.me\/[^\s]*/g,
  /telegram\.me\/[^\s]*/g,
  /telegram\.dog\/[^\s]*/g,
];

/**
 * External booking/service links
 */
const EXTERNAL_BOOKING_PATTERNS = [
  /fresha\.com\/[^\s]*/g,
  /booksy\.com\/[^\s]*/g,
  /mindbodyonline\.com\/[^\s]*/g,
  /styleseat\.com\/[^\s]*/g,
  /treatwell\.co\.uk\/[^\s]*/g,
];

/**
 * QR code payment hints
 */
const QR_PATTERNS = [
  /scan.*qr/i,
  /qr.*code/i,
  /qr.*pay/i,
];

// ============================================
// Detection Functions
// ============================================

export interface ContentSafetyResult {
  isSafe: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasUPI: boolean;
  hasWhatsApp: boolean;
  hasTelegram: boolean;
  hasExternalBooking: boolean;
  hasQRHint: boolean;
  detectedPatterns: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Analyze text content for prohibited contact/payment information
 * 
 * @param text - The text content to analyze
 * @returns ContentSafetyResult with detection details
 */
export function analyzeContent(text: string): ContentSafetyResult {
  if (!text || typeof text !== 'string') {
    return {
      isSafe: true,
      hasPhone: false,
      hasEmail: false,
      hasUPI: false,
      hasWhatsApp: false,
      hasTelegram: false,
      hasExternalBooking: false,
      hasQRHint: false,
      detectedPatterns: [],
      riskLevel: 'low',
    };
  }

  const result: ContentSafetyResult = {
    isSafe: true,
    hasPhone: false,
    hasEmail: false,
    hasUPI: false,
    hasWhatsApp: false,
    hasTelegram: false,
    hasExternalBooking: false,
    hasQRHint: false,
    detectedPatterns: [],
    riskLevel: 'low',
  };

  // Check for phone numbers
  for (const pattern of PHONE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Filter out false positives (e.g., "10am to 6pm", "₹5000")
      const validMatches = matches.filter(match => {
        // Skip if it looks like a time
        if (/^\d{1,2}(am|pm)$/i.test(match)) return false;
        // Skip if it's purely a price (no spaces, starts with number)
        if (/^\d+$/.test(match.replace(/\s/g, ''))) return false;
        // Skip very short matches
        if (match.replace(/\D/g, '').length < 8) return false;
        return true;
      });

      if (validMatches.length > 0) {
        result.hasPhone = true;
        result.detectedPatterns.push(...validMatches.map(m => `Phone: ${m}`));
      }
    }
  }

  // Check for email addresses
  const emailMatches = text.match(EMAIL_PATTERN);
  if (emailMatches && emailMatches.length > 0) {
    result.hasEmail = true;
    result.detectedPatterns.push(...emailMatches.map(m => `Email: ${m}`));
  }

  // Check for UPI IDs
  for (const pattern of UPI_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      result.hasUPI = true;
      result.detectedPatterns.push(...matches.map(m => `UPI: ${m}`));
    }
  }

  // Check for UPI links
  for (const pattern of UPI_LINK_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      result.hasUPI = true;
      result.detectedPatterns.push(...matches.map(m => `Payment Link: ${m}`));
    }
  }

  // Check for WhatsApp links
  for (const pattern of WHATSAPP_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      result.hasWhatsApp = true;
      result.detectedPatterns.push(...matches.map(m => `WhatsApp: ${m}`));
    }
  }

  // Check for Telegram links
  for (const pattern of TELEGRAM_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      result.hasTelegram = true;
      result.detectedPatterns.push(...matches.map(m => `Telegram: ${m}`));
    }
  }

  // Check for external booking links
  for (const pattern of EXTERNAL_BOOKING_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      result.hasExternalBooking = true;
      result.detectedPatterns.push(...matches.map(m => `External Booking: ${m}`));
    }
  }

  // Check for QR code hints
  for (const pattern of QR_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      result.hasQRHint = true;
      result.detectedPatterns.push(...matches.map(m => `QR Hint: ${m}`));
    }
  }

  // Determine overall safety and risk level
  const riskCount = [
    result.hasPhone,
    result.hasEmail,
    result.hasUPI,
    result.hasWhatsApp,
    result.hasTelegram,
    result.hasExternalBooking,
    result.hasQRHint,
  ].filter(Boolean).length;

  if (riskCount === 0) {
    result.isSafe = true;
    result.riskLevel = 'low';
  } else if (riskCount === 1) {
    result.isSafe = false;
    result.riskLevel = 'medium';
  } else {
    result.isSafe = false;
    result.riskLevel = 'high';
  }

  return result;
}

/**
 * Validate bio/description content before saving
 * 
 * @param text - The content to validate
 * @param fieldName - Name of the field being validated (for error messages)
 * @returns Object with isValid flag and error message if invalid
 */
export function validateBioContent(
  text: string,
  fieldName: string = 'Field'
): { isValid: boolean; warning?: string; error?: string } {
  const analysis = analyzeContent(text);

  if (analysis.isSafe) {
    return { isValid: true };
  }

  // High risk - block submission
  if (analysis.riskLevel === 'high') {
    return {
      isValid: false,
      error: `${fieldName} contains contact or payment information. To keep bookings and payments protected by MITHAS GLOW, please remove phone numbers, email addresses, UPI IDs, or external links.`,
    };
  }

  // Medium risk - show warning but allow (with logging)
  return {
    isValid: true,
    warning: `${fieldName} may contain contact information. Sharing phone numbers, emails, or external payment links violates our marketplace policies and may result in account restrictions.`,
  };
}

/**
 * Validate URL to ensure it's a legitimate social media link
 * 
 * @param url - The URL to validate
 * @param allowedDomains - Array of allowed domain patterns
 * @returns Object with isValid flag and sanitized URL
 */
export function validateSocialLink(
  url: string,
  allowedDomains: string[] = ['instagram.com', 'youtube.com', 'facebook.com']
): { isValid: boolean; sanitizedUrl?: string; error?: string } {
  if (!url || url.trim() === '') {
    return { isValid: true, sanitizedUrl: undefined };
  }

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Check if URL matches any allowed domain
    const isAllowed = allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`) || hostname.includes(domain)
    );

    if (!isAllowed) {
      // Check if it's a blocked domain
      const blockedDomains = [
        'wa.me', 'whatsapp.com', 'api.whatsapp.com',
        't.me', 'telegram.me', 'telegram.dog',
        'fresha.com', 'booksy.com', 'mindbodyonline.com',
      ];

      if (blockedDomains.some(domain => hostname.includes(domain))) {
        return {
          isValid: false,
          error: 'This link type is not allowed. Please use Instagram or YouTube for your portfolio.',
        };
      }

      // Unknown domain - warn but allow
      return {
        isValid: true,
        sanitizedUrl: url,
        warning: 'Using external links may direct customers away from MITHAS GLOW.',
      };
    }

    // Valid social media link
    return { isValid: true, sanitizedUrl: url };
  } catch (error) {
    return {
      isValid: false,
      error: 'Please enter a valid URL (e.g., https://instagram.com/yourprofile)',
    };
  }
}

/**
 * Mask sensitive information in text for display
 * Use this when showing user-generated content that might contain contact info
 * 
 * @param text - The text to mask
 * @returns Masked text with sensitive info replaced
 */
export function maskSensitiveInfo(text: string): string {
  if (!text) return text;

  let maskedText = text;

  // Mask phone numbers (show last 2 digits only)
  maskedText = maskedText.replace(/(\+91|0)?([6-9]\d{7})(\d{2})/g, '[PHONE HIDDEN]**');

  // Mask email addresses
  maskedText = maskedText.replace(/[a-zA-Z0-9._%+-]+@/g, '[EMAIL HIDDEN]@');

  // Mask UPI IDs
  maskedText = maskedText.replace(/[a-zA-Z0-9._-]+@(upi|paytm|phonepe|googlepay|bhim)/g, '[UPI HIDDEN]');

  // Mask WhatsApp links
  maskedText = maskedText.replace(/wa\.me\/[^\s]*/gi, '[WHATSAPP LINK REMOVED]');
  maskedText = maskedText.replace(/whatsapp\.com\/[^\s]*/gi, '[WHATSAPP LINK REMOVED]');

  // Mask Telegram links
  maskedText = maskedText.replace(/t\.me\/[^\s]*/gi, '[TELEGRAM LINK REMOVED]');

  return maskedText;
}

/**
 * Get user-friendly warning message based on detected content
 * 
 * @param analysis - ContentSafetyResult from analyzeContent()
 * @returns User-friendly warning message
 */
export function getWarningMessage(analysis: ContentSafetyResult): string {
  const issues: string[] = [];

  if (analysis.hasPhone) {
    issues.push('phone numbers');
  }
  if (analysis.hasEmail) {
    issues.push('email addresses');
  }
  if (analysis.hasUPI) {
    issues.push('UPI IDs or payment links');
  }
  if (analysis.hasWhatsApp) {
    issues.push('WhatsApp links');
  }
  if (analysis.hasTelegram) {
    issues.push('Telegram links');
  }
  if (analysis.hasExternalBooking) {
    issues.push('external booking links');
  }
  if (analysis.hasQRHint) {
    issues.push('QR code payment references');
  }

  if (issues.length === 0) {
    return '';
  }

  const issueList = issues.length === 1 
    ? issues[0]
    : `${issues.slice(0, -1).join(', ')} and ${issues.slice(-1)}`;

  return `To keep bookings and payments protected by MITHAS GLOW, direct contact or external payment details cannot be shared here. We detected ${issueList}.`;
}

// ============================================
// Export Constants for Reuse
// ============================================

export {
  PHONE_PATTERNS,
  EMAIL_PATTERN,
  UPI_PATTERNS,
  UPI_LINK_PATTERNS,
  WHATSAPP_PATTERNS,
  TELEGRAM_PATTERNS,
  EXTERNAL_BOOKING_PATTERNS,
  QR_PATTERNS,
};

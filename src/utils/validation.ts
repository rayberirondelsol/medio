// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Name validation
export const validateName = (name: string): boolean => {
  return name.trim().length >= 2;
};

// Video URL validation
export const validateVideoUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const validHosts = ['youtube.com', 'www.youtube.com', 'youtu.be', 'vimeo.com'];
    return validHosts.some(host => urlObj.hostname.includes(host));
  } catch {
    return false;
  }
};

// NFC UID validation
export const validateNFCUID = (uid: string): boolean => {
  // NFC UIDs are typically hexadecimal strings
  const hexRegex = /^[0-9A-Fa-f]+$/;
  return hexRegex.test(uid) && uid.length >= 8 && uid.length <= 20;
};

// Session time validation
export const validateWatchTime = (minutes: number): boolean => {
  return minutes > 0 && minutes <= 480; // Max 8 hours
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');
};
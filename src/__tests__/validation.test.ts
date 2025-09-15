import {
  validateEmail,
  validatePassword,
  validateName,
  validateVideoUrl,
  validateNFCUID,
  validateWatchTime,
  sanitizeInput
} from '../utils/validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('StrongPass123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should check for uppercase letters', () => {
      const result = validatePassword('lowercase123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should check for lowercase letters', () => {
      const result = validatePassword('UPPERCASE123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should check for numbers', () => {
      const result = validatePassword('NoNumbers');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });
  });

  describe('validateName', () => {
    it('should validate valid names', () => {
      expect(validateName('John')).toBe(true);
      expect(validateName('  Jane  ')).toBe(true);
      expect(validateName('Jo')).toBe(true);
    });

    it('should reject invalid names', () => {
      expect(validateName('J')).toBe(false);
      expect(validateName('')).toBe(false);
      expect(validateName('  ')).toBe(false);
    });
  });

  describe('validateVideoUrl', () => {
    it('should validate YouTube URLs', () => {
      expect(validateVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(validateVideoUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(validateVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    });

    it('should validate Vimeo URLs', () => {
      expect(validateVideoUrl('https://vimeo.com/123456789')).toBe(true);
    });

    it('should reject invalid video URLs', () => {
      expect(validateVideoUrl('https://example.com/video')).toBe(false);
      expect(validateVideoUrl('not-a-url')).toBe(false);
      expect(validateVideoUrl('')).toBe(false);
    });
  });

  describe('validateNFCUID', () => {
    it('should validate valid NFC UIDs', () => {
      expect(validateNFCUID('ABCD1234')).toBe(true);
      expect(validateNFCUID('1234567890ABCDEF')).toBe(true);
      expect(validateNFCUID('deadbeef')).toBe(true);
    });

    it('should reject invalid NFC UIDs', () => {
      expect(validateNFCUID('1234567')).toBe(false); // Too short
      expect(validateNFCUID('123456789012345678901')).toBe(false); // Too long
      expect(validateNFCUID('GHIJKLMN')).toBe(false); // Non-hex characters
      expect(validateNFCUID('')).toBe(false);
    });
  });

  describe('validateWatchTime', () => {
    it('should validate valid watch times', () => {
      expect(validateWatchTime(30)).toBe(true);
      expect(validateWatchTime(60)).toBe(true);
      expect(validateWatchTime(480)).toBe(true); // Max 8 hours
    });

    it('should reject invalid watch times', () => {
      expect(validateWatchTime(0)).toBe(false);
      expect(validateWatchTime(-10)).toBe(false);
      expect(validateWatchTime(481)).toBe(false); // Over 8 hours
      expect(validateWatchTime(1000)).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("XSS")</script> World';
      expect(sanitizeInput(input)).toBe('Hello  World');
    });

    it('should remove HTML tags', () => {
      const input = 'Hello <b>World</b> <a href="#">Link</a>';
      expect(sanitizeInput(input)).toBe('Hello World Link');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      expect(sanitizeInput(input)).toBe('Hello World');
    });

    it('should handle complex script tags', () => {
      const input = 'Test <script type="text/javascript">console.log("test")</script> End';
      expect(sanitizeInput(input)).toBe('Test  End');
    });

    it('should handle empty input', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
    });
  });
});
import {
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isValidZipCode,
  isValidDate,
  isAlphanumeric,
  validatePassword,
  sanitizeInput,
  isValidCreditCard,
  isInRange,
  isNotEmpty,
  type PasswordStrength,
} from "./validation";

describe("Validation Utilities", () => {
  describe("isValidEmail", () => {
    it("should validate correct email addresses", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.co.uk")).toBe(true);
      expect(isValidEmail("user+tag@example.org")).toBe(true);
      expect(isValidEmail("user_name@example-domain.com")).toBe(true);
      expect(isValidEmail("123@numbers.com")).toBe(true);
    });

    it("should reject invalid email addresses", () => {
      expect(isValidEmail("notanemail")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("user@")).toBe(false);
      expect(isValidEmail("user @example.com")).toBe(false);
      expect(isValidEmail("user@example")).toBe(false);
      expect(isValidEmail("user..name@example.com")).toBe(false);
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("user@.com")).toBe(false);
      expect(isValidEmail("user@domain..com")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isValidEmail("a@b.c")).toBe(true); // Minimal valid email
      expect(isValidEmail("test@sub.domain.example.com")).toBe(true); // Multiple subdomains
      expect(isValidEmail("test@localhost")).toBe(false); // No TLD
      expect(isValidEmail("test.email.with+symbol@example.com")).toBe(true);
    });
  });

  describe("isValidPhone", () => {
    it("should validate various phone formats", () => {
      expect(isValidPhone("(123) 456-7890")).toBe(true);
      expect(isValidPhone("123-456-7890")).toBe(true);
      expect(isValidPhone("1234567890")).toBe(true);
      expect(isValidPhone("+1 (123) 456-7890")).toBe(true);
      expect(isValidPhone("+123 456 7890")).toBe(true);
      expect(isValidPhone("123.456.7890")).toBe(true);
      expect(isValidPhone("123 456 7890")).toBe(true);
    });

    it("should reject invalid phone numbers", () => {
      expect(isValidPhone("123")).toBe(false);
      expect(isValidPhone("abc-def-ghij")).toBe(false);
      expect(isValidPhone("")).toBe(false);
      expect(isValidPhone("12345")).toBe(false);
      expect(isValidPhone("123-45-67890")).toBe(false);
      expect(isValidPhone("phone number")).toBe(false);
      expect(isValidPhone("+1234567890123456789")).toBe(false); // Too long
    });

    it("should handle edge cases", () => {
      expect(isValidPhone("000-000-0000")).toBe(true); // All zeros
      expect(isValidPhone("+44 20 7946 0958")).toBe(false); // UK format (not matching this regex)
      expect(isValidPhone("(123)456-7890")).toBe(true); // No space after area code
      expect(isValidPhone("123-456-789012")).toBe(true); // 6 digits at end
    });
  });

  describe("isValidUrl", () => {
    it("should validate correct URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("http://subdomain.example.com/path")).toBe(true);
      expect(isValidUrl("https://example.com:8080/path?query=value")).toBe(
        true,
      );
      expect(isValidUrl("ftp://files.example.com")).toBe(true);
      expect(isValidUrl("http://localhost:3000")).toBe(true);
      expect(isValidUrl("https://example.com#anchor")).toBe(true);
      expect(isValidUrl("https://user:pass@example.com")).toBe(true);
    });

    it("should reject invalid URLs", () => {
      expect(isValidUrl("not a url")).toBe(false);
      expect(isValidUrl("example.com")).toBe(false); // Missing protocol
      expect(isValidUrl("//example.com")).toBe(false);
      expect(isValidUrl("")).toBe(false);
      expect(isValidUrl("http://")).toBe(false);
      expect(isValidUrl("https://   example.com")).toBe(false);
      expect(isValidUrl("javascript:alert(1)")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isValidUrl("http://192.168.1.1")).toBe(true); // IP address
      expect(isValidUrl("https://example.com/path with spaces")).toBe(true); // Spaces in path
      expect(isValidUrl("http://🍕.com")).toBe(true); // Emoji domain
      expect(isValidUrl("file:///path/to/file")).toBe(true); // File protocol
    });
  });

  describe("isValidZipCode", () => {
    it("should validate US ZIP codes", () => {
      expect(isValidZipCode("12345")).toBe(true);
      expect(isValidZipCode("12345-6789")).toBe(true);
      expect(isValidZipCode("00000")).toBe(true);
      expect(isValidZipCode("99999")).toBe(true);
      expect(isValidZipCode("12345-0000")).toBe(true);
    });

    it("should reject invalid ZIP codes", () => {
      expect(isValidZipCode("1234")).toBe(false);
      expect(isValidZipCode("123456")).toBe(false);
      expect(isValidZipCode("ABCDE")).toBe(false);
      expect(isValidZipCode("")).toBe(false);
      expect(isValidZipCode("12345-")).toBe(false);
      expect(isValidZipCode("12345-67")).toBe(false);
      expect(isValidZipCode("12345-67890")).toBe(false);
      expect(isValidZipCode("12345 6789")).toBe(false);
    });
  });

  describe("isValidDate", () => {
    it("should validate correct date strings", () => {
      expect(isValidDate("2023-01-01")).toBe(true);
      expect(isValidDate("01/01/2023")).toBe(true);
      expect(isValidDate("January 1, 2023")).toBe(true);
      expect(isValidDate("2023-01-01T00:00:00")).toBe(true);
      expect(isValidDate("2023-01-01T00:00:00Z")).toBe(true);
      expect(isValidDate(new Date().toISOString())).toBe(true);
    });

    it("should reject invalid date strings", () => {
      expect(isValidDate("not a date")).toBe(false);
      expect(isValidDate("")).toBe(false);
      expect(isValidDate("2023-13-01")).toBe(false); // Invalid month
      expect(isValidDate("2023-01-32")).toBe(false); // Invalid day
      expect(isValidDate("0000-00-00")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isValidDate("2023-02-29")).toBe(false); // Not a leap year
      expect(isValidDate("2024-02-29")).toBe(true); // Leap year
      expect(isValidDate("1970-01-01")).toBe(true); // Unix epoch
      expect(isValidDate("-1")).toBe(true); // Negative timestamp
    });
  });

  describe("isAlphanumeric", () => {
    it("should validate alphanumeric strings", () => {
      expect(isAlphanumeric("abc123")).toBe(true);
      expect(isAlphanumeric("ABC")).toBe(true);
      expect(isAlphanumeric("123")).toBe(true);
      expect(isAlphanumeric("aBc123XyZ")).toBe(true);
    });

    it("should reject non-alphanumeric strings", () => {
      expect(isAlphanumeric("abc-123")).toBe(false);
      expect(isAlphanumeric("abc 123")).toBe(false);
      expect(isAlphanumeric("abc_123")).toBe(false);
      expect(isAlphanumeric("")).toBe(false);
      expect(isAlphanumeric("abc!")).toBe(false);
      expect(isAlphanumeric("abc.123")).toBe(false);
      expect(isAlphanumeric("αβγ")).toBe(false); // Greek letters
    });
  });

  describe("validatePassword", () => {
    it("should validate strong passwords", () => {
      const result = validatePassword("StrongP@ss123");
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(5);
      expect(result.feedback).toHaveLength(0);
    });

    it("should provide feedback for weak passwords", () => {
      const result = validatePassword("weak");
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(1); // Only lowercase
      expect(result.feedback).toContain(
        "Password must be at least 8 characters long",
      );
      expect(result.feedback).toContain(
        "Password must contain uppercase letters",
      );
      expect(result.feedback).toContain("Password must contain numbers");
      expect(result.feedback).toContain(
        "Password should contain special characters",
      );
    });

    it("should handle various password strengths", () => {
      // Missing special chars
      let result = validatePassword("Password123");
      expect(result.isValid).toBe(true); // Score 4/5
      expect(result.score).toBe(4);
      expect(result.feedback).toContain(
        "Password should contain special characters",
      );

      // Missing numbers
      result = validatePassword("Password!");
      expect(result.isValid).toBe(true); // Score 4/5
      expect(result.score).toBe(4);
      expect(result.feedback).toContain("Password must contain numbers");

      // Only lowercase and numbers
      result = validatePassword("password123");
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(3);
    });

    it("should handle edge cases", () => {
      expect(validatePassword("").isValid).toBe(false);
      expect(validatePassword("").feedback).toContain(
        "Password must be at least 8 characters long",
      );

      expect(validatePassword("!@#$%^&*").score).toBe(3); // Special chars but missing letters/numbers
      expect(validatePassword("AAAAAAAA").score).toBe(2); // Only uppercase
      expect(validatePassword("12345678").score).toBe(2); // Only numbers
    });
  });

  describe("sanitizeInput", () => {
    it("should remove HTML tags", () => {
      expect(sanitizeInput('<script>alert("XSS")</script>')).toBe(
        'script>alert("XSS")/script>',
      );
      expect(sanitizeInput("Hello <b>World</b>")).toBe("Hello b>World/b>");
      expect(sanitizeInput('<img src="x" onerror="alert(1)">')).toBe(
        'img src="x" >',
      );
    });

    it("should remove javascript: protocol", () => {
      expect(sanitizeInput("javascript:alert(1)")).toBe("alert(1)");
      expect(sanitizeInput("JAVASCRIPT:alert(1)")).toBe("alert(1)");
      expect(sanitizeInput('href="javascript:void(0)"')).toBe('href="void(0)"');
    });

    it("should remove event handlers", () => {
      expect(sanitizeInput('onclick="alert(1)"')).toBe('"alert(1)"');
      expect(sanitizeInput('onmouseover="doEvil()"')).toBe('"doEvil()"');
      expect(sanitizeInput('ONCLICK="alert(1)"')).toBe('"alert(1)"');
    });

    it("should trim whitespace", () => {
      expect(sanitizeInput("  hello  ")).toBe("hello");
      expect(sanitizeInput("\n\ttext\n\t")).toBe("text");
    });

    it("should handle combined attacks", () => {
      const malicious =
        '<img src="x" onerror="alert(1)" onclick="javascript:evil()">';
      expect(sanitizeInput(malicious)).toBe('img src="x" "alert(1)" "evil()">');
    });

    it("should handle normal text", () => {
      expect(sanitizeInput("Hello World!")).toBe("Hello World!");
      expect(sanitizeInput("user@example.com")).toBe("user@example.com");
      expect(sanitizeInput("")).toBe("");
    });
  });

  describe("isValidCreditCard", () => {
    it("should validate correct credit card numbers", () => {
      // Test cards from different providers
      expect(isValidCreditCard("4532 1488 0343 6467")).toBe(true); // Visa
      expect(isValidCreditCard("5425233430109903")).toBe(true); // Mastercard
      expect(isValidCreditCard("374245455400126")).toBe(true); // Amex (15 digits)
      expect(isValidCreditCard("6011000990139424")).toBe(true); // Discover
      expect(isValidCreditCard("4532148803436467")).toBe(true); // No spaces
    });

    it("should reject invalid credit card numbers", () => {
      expect(isValidCreditCard("1234567890123456")).toBe(false); // Fails Luhn
      expect(isValidCreditCard("0000000000000000")).toBe(false); // All zeros
      expect(isValidCreditCard("123")).toBe(false); // Too short
      expect(isValidCreditCard("12345678901234567890")).toBe(false); // Too long
      expect(isValidCreditCard("")).toBe(false);
      expect(isValidCreditCard("abcd-efgh-ijkl-mnop")).toBe(false);
    });

    it("should handle formatting variations", () => {
      expect(isValidCreditCard("4532-1488-0343-6467")).toBe(true); // Dashes
      expect(isValidCreditCard("4532.1488.0343.6467")).toBe(true); // Dots
      expect(isValidCreditCard(" 4532 1488 0343 6467 ")).toBe(true); // Extra spaces
    });

    it("should validate edge cases", () => {
      expect(isValidCreditCard("4111111111111111")).toBe(true); // Common test card
      expect(isValidCreditCard("5555555555554444")).toBe(true); // Another test card
      expect(isValidCreditCard("1234567890123")).toBe(false); // 13 digits but invalid
      expect(isValidCreditCard("123456789012")).toBe(false); // 12 digits (too short)
    });
  });

  describe("isInRange", () => {
    it("should validate numbers in range", () => {
      expect(isInRange(5, 1, 10)).toBe(true);
      expect(isInRange(1, 1, 10)).toBe(true); // Min boundary
      expect(isInRange(10, 1, 10)).toBe(true); // Max boundary
      expect(isInRange(0, -10, 10)).toBe(true);
      expect(isInRange(-5, -10, -1)).toBe(true);
    });

    it("should reject numbers out of range", () => {
      expect(isInRange(0, 1, 10)).toBe(false);
      expect(isInRange(11, 1, 10)).toBe(false);
      expect(isInRange(-1, 0, 10)).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isInRange(0, 0, 0)).toBe(true); // Single point range
      expect(
        isInRange(Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER),
      ).toBe(true);
      expect(
        isInRange(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, 0),
      ).toBe(true);
      expect(isInRange(0.5, 0, 1)).toBe(true); // Decimals
    });
  });

  describe("isNotEmpty", () => {
    it("should validate non-empty strings", () => {
      expect(isNotEmpty("hello")).toBe(true);
      expect(isNotEmpty(" hello ")).toBe(true);
      expect(isNotEmpty("a")).toBe(true);
      expect(isNotEmpty("  multiple  words  ")).toBe(true);
    });

    it("should reject empty strings", () => {
      expect(isNotEmpty("")).toBe(false);
      expect(isNotEmpty(" ")).toBe(false);
      expect(isNotEmpty("   ")).toBe(false);
      expect(isNotEmpty("\t")).toBe(false);
      expect(isNotEmpty("\n")).toBe(false);
      expect(isNotEmpty("\r\n")).toBe(false);
      expect(isNotEmpty("  \t\n  ")).toBe(false);
    });
  });

  describe("integration tests", () => {
    it("should validate a complete user registration form", () => {
      const form = {
        email: "user@example.com",
        password: "SecureP@ss123",
        phone: "123-456-7890",
        zipCode: "12345",
      };

      expect(isValidEmail(form.email)).toBe(true);
      expect(validatePassword(form.password).isValid).toBe(true);
      expect(isValidPhone(form.phone)).toBe(true);
      expect(isValidZipCode(form.zipCode)).toBe(true);
    });

    it("should validate and sanitize user input", () => {
      const userInput = '<script>alert("xss")</script>Hello World!';
      const sanitized = sanitizeInput(userInput);
      expect(sanitized).toBe('script>alert("xss")/script>Hello World!');
      expect(isNotEmpty(sanitized)).toBe(true);
    });

    it("should validate payment information", () => {
      const payment = {
        cardNumber: "4532 1488 0343 6467",
        zipCode: "12345-6789",
        amount: 99.99,
      };

      expect(isValidCreditCard(payment.cardNumber)).toBe(true);
      expect(isValidZipCode(payment.zipCode)).toBe(true);
      expect(isInRange(payment.amount, 0.01, 10000)).toBe(true);
    });
  });
});

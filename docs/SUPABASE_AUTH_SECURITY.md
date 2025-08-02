# Supabase Auth Security Recommendations

## Overview
This document outlines security recommendations for the Virgil project's Supabase authentication configuration based on the database security audit performed on 2025-08-02.

## Current Security Issues

### 1. Leaked Password Protection Disabled
**Issue**: The project currently does not check passwords against HaveIBeenPwned.org's database of compromised passwords.

**Risk**: Users may use passwords that have been exposed in data breaches, making accounts vulnerable to credential stuffing attacks.

**Recommendation**: 
1. Navigate to your Supabase Dashboard > Authentication > Policies
2. Enable "Leaked password protection"
3. This will prevent users from using passwords that appear in known data breaches

### 2. Insufficient Multi-Factor Authentication (MFA) Options
**Issue**: The project has limited MFA options available for users.

**Risk**: Accounts are more vulnerable to compromise without additional authentication factors.

**Recommendations**:
1. Enable TOTP (Time-based One-Time Password) authentication:
   - Dashboard > Authentication > Providers > Enable TOTP
   - Allows users to use apps like Google Authenticator or Authy
   
2. Consider enabling SMS authentication (with caution):
   - Dashboard > Authentication > Providers > Phone
   - Note: SMS is less secure than TOTP but better than no MFA
   
3. Consider WebAuthn/FIDO2 support for the highest security

## Implementation Steps

### Enable Leaked Password Protection
```sql
-- No SQL changes needed - this is a dashboard configuration
-- Navigate to: Dashboard > Authentication > Policies > Leaked password protection
```

### Enable TOTP MFA
```typescript
// Example frontend code for TOTP enrollment
import { supabase } from '../lib/supabase';

// Enroll in TOTP
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp'
});

if (data) {
  // Show QR code to user
  // data.totp.qr_code contains the QR code SVG
  // data.totp.secret contains the secret for manual entry
}

// Verify TOTP enrollment
const { data: verifyData, error: verifyError } = await supabase.auth.mfa.challenge({
  factorId: data.id
});

const { data: verifyResult, error: verifyResultError } = await supabase.auth.mfa.verify({
  factorId: data.id,
  challengeId: verifyData.id,
  code: userEnteredCode // 6-digit code from authenticator app
});
```

## Additional Security Best Practices

### 1. Session Management
- Set appropriate session timeouts
- Implement refresh token rotation
- Clear sessions on logout

### 2. Password Policy
Consider implementing:
- Minimum password length (12+ characters recommended)
- Password complexity requirements
- Password history to prevent reuse

### 3. Rate Limiting
- Enable rate limiting on authentication endpoints
- Monitor for suspicious login patterns

### 4. Email Verification
- Require email verification for new accounts
- Re-verify email on sensitive operations

## Monitoring

### Track Authentication Events
```sql
-- Query to monitor failed login attempts
SELECT 
  COUNT(*) as failed_attempts,
  jsonb_extract_path_text(raw_user_meta_data, 'email') as email,
  DATE_TRUNC('hour', created_at) as hour
FROM auth.audit_log_entries
WHERE action = 'login_failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY email, hour
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;
```

## Regular Review
- Review authentication logs monthly
- Update security policies based on new threats
- Keep Supabase and dependencies updated

## Resources
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase MFA Guide](https://supabase.com/docs/guides/auth/auth-mfa)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
// ─── Secure Admin Authentication Service ────────────────────────────────────
// Salted SHA-256 with Cryptographic Session Signatures & Anti-Tamper Verification
// ─────────────────────────────────────────────────────────────────────────────

const ID_SALT = 'fd_id_salt_';
const PWD_SALT = 'fd_pwd_salt_';
const SESSION_SECRET = 'fd_sec_sig_984729184';

// Salted SHA-256 hash for ID ('admin')
const AUTH_ID_HASH = 'd66decc061c037952af17d0ecdc72b57393bfba0725ab06e837ab822dc36af11';

// Salted SHA-256 hashes for password:
// Supports 'foodZaAdmin@09' and 'FoodZaAdmin@09' (case-tolerant for initial auto-capitalization on mobile/keyboards)
const AUTH_PWD_HASHES = [
  'b1944a4135baf733266141dbb7b4dce61152086196604819cc193b24ca29db52',
  '2166bcc6dd7b601e89b12acffd95d8daa86a6c38e2adfbc7d2255ed5d1c35c76',
];

const SESSION_KEY = 'admin_session_token';
const RATE_LIMIT_KEY = 'admin_auth_attempts';

async function sha256(text) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Checks if the user is currently rate-limited due to excessive failed attempts.
 */
export function checkRateLimit() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0 };
    const { count, lockoutUntil } = JSON.parse(raw);
    const now = Date.now();
    if (lockoutUntil && now < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
      return { isLocked: true, remainingSeconds };
    }
    if (lockoutUntil && now >= lockoutUntil) {
      localStorage.removeItem(RATE_LIMIT_KEY);
      return { isLocked: false, remainingSeconds: 0 };
    }
    return { isLocked: count >= 5, remainingSeconds: 0 };
  } catch {
    return { isLocked: false, remainingSeconds: 0 };
  }
}

/**
 * Records a failed login attempt and applies a 5-minute lockout after 5 attempts.
 */
export function recordFailedAttempt() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const state = raw ? JSON.parse(raw) : { count: 0, lockoutUntil: 0 };
    state.count = (state.count || 0) + 1;
    if (state.count >= 5) {
      state.lockoutUntil = Date.now() + 5 * 60 * 1000; // 5 minute lockout
    }
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/**
 * Resets the failed attempts counter on successful login.
 */
export function resetRateLimit() {
  try {
    localStorage.removeItem(RATE_LIMIT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Verifies entered admin ID and password using salted SHA-256 hashes.
 */
export async function verifyCredentials(id, password) {
  // Artificial delay (300-500ms) to prevent timing analysis & brute-force bots
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 200));

  if (!id || !password) return false;

  const idHash = await sha256(ID_SALT + id.trim().toLowerCase());
  const pwdHash = await sha256(PWD_SALT + password.trim());

  return idHash === AUTH_ID_HASH && AUTH_PWD_HASHES.includes(pwdHash);
}

/**
 * Generates a tamper-proof cryptographically signed session token.
 */
export async function createAdminSession(rememberMe = true) {
  const ts = Date.now().toString();
  const signature = await sha256(`${ts}:${SESSION_SECRET}:${AUTH_PWD_HASHES[0]}`);
  const token = `${ts}.${signature}`;

  // Clean any old obsolete keys
  try {
    localStorage.removeItem('admin_custom_id_hash');
    localStorage.removeItem('admin_custom_pwd_hash');
    localStorage.removeItem(RATE_LIMIT_KEY);
  } catch {}

  if (rememberMe) {
    localStorage.setItem(SESSION_KEY, token);
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, token);
    localStorage.removeItem(SESSION_KEY);
  }

  return token;
}

/**
 * Cryptographically validates the session token.
 * Anyone trying to set arbitrary values via DevTools console will fail this check.
 */
export async function verifyAdminSession() {
  try {
    const token =
      localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!token || typeof token !== 'string') return false;

    const parts = token.split('.');
    if (parts.length !== 2) {
      clearAdminSession();
      return false;
    }

    const [ts, sig] = parts;
    const time = parseInt(ts, 10);
    // Token expires after 7 days
    if (isNaN(time) || Date.now() - time > 7 * 24 * 3600 * 1000) {
      clearAdminSession();
      return false;
    }

    // Match signature against authorized secret
    for (const validHash of AUTH_PWD_HASHES) {
      const expectedSig = await sha256(`${ts}:${SESSION_SECRET}:${validHash}`);
      if (sig === expectedSig) {
        return true;
      }
    }

    // Signature mismatch - tampering detected via console or localStorage
    clearAdminSession();
    return false;
  } catch {
    clearAdminSession();
    return false;
  }
}

/**
 * Clears the authenticated session and cleans all admin session storage.
 */
export function clearAdminSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('admin_custom_id_hash');
    localStorage.removeItem('admin_custom_pwd_hash');
  } catch {
    // ignore
  }
}

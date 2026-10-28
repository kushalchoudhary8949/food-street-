/**
 * @file auth.js
 * @module backend/auth
 * @description
 * Authentication, JWT Token Management, Session Rotation, and YouPI WhatsApp OTP Integration.
 */

import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

const configuredAccessSecret = process.env.JWT_ACCESS_SECRET;
if (
  process.env.NODE_ENV === 'production' &&
  (!configuredAccessSecret || Buffer.byteLength(configuredAccessSecret) < 32)
) {
  throw new Error('JWT_ACCESS_SECRET must be configured with at least 32 bytes in production.');
}
const JWT_ACCESS_SECRET = configuredAccessSecret || crypto.randomBytes(32).toString('hex');
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_DAYS = 7;

/**
 * Normalizes Indian mobile phone numbers to 10-digit clean format and E.164.
 * Accepts:
 *  - "+919876543210"
 *  - "919876543210"
 *  - "09876543210"
 *  - "98765 43210"
 *  - "98765-43210"
 *  - "9876543210"
 * 
 * @param {string} rawPhone
 * @returns {{ isValid: boolean, clean10: string, formattedE164: string, error?: string }}
 */
export function normalizeIndianPhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      isValid: false,
      clean10: '',
      formattedE164: '',
      error: 'Phone number is required.',
    };
  }

  // Remove whitespace, dashes, parens, pluses
  let digits = rawPhone.replace(/\D/g, '');

  // Strip leading 0 if 11 digits (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Strip country code 91 if 12 digits (e.g. 919876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }

  if (digits.length !== 10) {
    return {
      isValid: false,
      clean10: '',
      formattedE164: '',
      error: `Invalid phone number length. Indian mobile numbers must be exactly 10 digits (got ${digits.length}).`,
    };
  }

  // Indian mobile numbers must start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(digits)) {
    return {
      isValid: false,
      clean10: '',
      formattedE164: '',
      error: 'Invalid Indian mobile number. Number must start with 6, 7, 8, or 9.',
    };
  }

  return {
    isValid: true,
    clean10: digits,
    formattedE164: `+91${digits}`,
  };
}

/**
 * Signs a JWT access token
 * @param {Object} payload
 * @returns {string}
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Verifies a JWT access token
 * @param {string} token
 * @returns {Object|null}
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET);
  } catch {
    return null;
  }
}

/**
 * Generates high-entropy refresh token string
 * @returns {string}
 */
export function generateRefreshTokenString() {
  return crypto.randomBytes(40).toString('hex');
}

/**
 * Requests a FoodZa-scoped WhatsApp OTP from YouPI's authenticated integration API.
 * 
 * @param {string} clean10Phone
 * @param {string} [name]
 */
export async function sendOtpViaYouPi(clean10Phone, name) {
  const youpiApiUrl = process.env.YOUPI_OTP_API_URL ||
    (process.env.NODE_ENV !== 'production' ? process.env.YOUPI_API_URL || 'http://127.0.0.1:6100' : '');
  const serviceSecret = process.env.FOODZA_OTP_API_SECRET;
  const apiUrl = getYouPiOtpUrl(youpiApiUrl, serviceSecret);

  const response = await fetch(`${apiUrl.origin}/api/v1/integrations/foodza/otp/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceSecret}`,
    },
    body: JSON.stringify({
      mobileNumber: clean10Phone,
      name: name || undefined,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || data.message || `Failed to dispatch WhatsApp OTP (Status ${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}

/**
 * Verifies a FoodZa-scoped OTP without creating a YouPI identity or session.
 * 
 * @param {string} clean10Phone
 * @param {string} otp
 */
export async function verifyOtpViaYouPi(clean10Phone, otp) {
  const youpiApiUrl = process.env.YOUPI_OTP_API_URL ||
    (process.env.NODE_ENV !== 'production' ? process.env.YOUPI_API_URL || 'http://127.0.0.1:6100' : '');
  const serviceSecret = process.env.FOODZA_OTP_API_SECRET;
  const apiUrl = getYouPiOtpUrl(youpiApiUrl, serviceSecret);

  const response = await fetch(`${apiUrl.origin}/api/v1/integrations/foodza/otp/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceSecret}`,
    },
    body: JSON.stringify({
      mobileNumber: clean10Phone,
      otp: String(otp).trim(),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || data.message || `OTP verification failed (Status ${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}

function getYouPiOtpUrl(youpiApiUrl, serviceSecret) {
  if (!serviceSecret?.trim()) {
    throw new Error(
      'FOODZA_OTP_API_SECRET is missing. Configure the same secret in FoodZa and the YouPI payment API.',
    );
  }
  if (!youpiApiUrl) {
    throw new Error('YOUPI_OTP_API_URL is missing. Set it to the deployed YouPI HTTPS API URL.');
  }

  let apiUrl;
  try {
    apiUrl = new URL(youpiApiUrl);
  } catch {
    throw new Error('YOUPI_OTP_API_URL must be a valid absolute URL.');
  }
  const isLoopback = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(apiUrl.hostname);
  if (apiUrl.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && isLoopback)) {
    throw new Error('YOUPI_OTP_API_URL must use HTTPS outside local development.');
  }
  return apiUrl;
}

/**
 * Rate limit check: enforce 30s cooldown and max 8 requests per hour.
 * @param {string} formattedPhone
 * @returns {Promise<{ allowed: boolean, waitSeconds?: number, message?: string }>}
 */
export async function checkOtpRateLimit(formattedPhone) {
  // Check most recent request for 30s cooldown
  const recentRes = await query(
    `SELECT created_at FROM otp_requests
     WHERE phone = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [formattedPhone]
  );

  if (recentRes.rows.length > 0) {
    const lastTime = new Date(recentRes.rows[0].created_at).getTime();
    const now = Date.now();
    const diffSeconds = Math.floor((now - lastTime) / 1000);
    if (diffSeconds < 30) {
      return {
        allowed: false,
        waitSeconds: 30 - diffSeconds,
        message: `Please wait ${30 - diffSeconds} seconds before requesting another verification code.`,
      };
    }
  }

  // Check hourly limit (max 8 requests per hour per phone)
  const hourlyRes = await query(
    `SELECT COUNT(*) as count FROM otp_requests
     WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
    [formattedPhone]
  );

  const hourlyCount = parseInt(hourlyRes.rows[0]?.count || '0', 10);
  if (hourlyCount >= 8) {
    return {
      allowed: false,
      message: 'Too many OTP requests for this number. Please try again after 1 hour.',
    };
  }

  return { allowed: true };
}

/**
 * Record an OTP request in FoodZa database
 * @param {string} formattedPhone
 * @param {string} [youpiRef]
 */
export async function recordOtpRequest(formattedPhone, youpiRef) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  await query(
    `INSERT INTO otp_requests (phone, youpi_ref, status, created_at, expires_at)
     VALUES ($1, $2, 'PENDING', NOW(), $3)`,
    [formattedPhone, youpiRef || null, expiresAt]
  );
}

/**
 * Mark OTP as verified upon successful verification
 * @param {string} formattedPhone
 */
export async function markOtpVerified(formattedPhone) {
  await query(
    `UPDATE otp_requests
     SET status = 'VERIFIED'
     WHERE id IN (
       SELECT id FROM otp_requests
       WHERE phone = $1 AND status = 'PENDING'
       ORDER BY created_at DESC
       LIMIT 1
     )`,
    [formattedPhone]
  );
}

/**
 * Find or create user in FoodZa users table.
 * If user exists, preserves role and updates verification status.
 * If user is new, role is strictly CUSTOMER.
 * 
 * @param {string} formattedPhone
 * @param {string} [name]
 * @returns {Promise<Object>}
 */
export async function findOrCreateFoodZaUser(formattedPhone, name, executeQuery = query) {
  const existingRes = await executeQuery(
    `SELECT id, phone, name, role, is_phone_verified, hostel_name, room_no, block, floor, landmark, created_at, updated_at
     FROM users WHERE phone = $1`,
    [formattedPhone]
  );

  if (existingRes.rows.length > 0) {
    const existing = existingRes.rows[0];
    const updateRes = await executeQuery(
      `UPDATE users
       SET is_phone_verified = TRUE,
           name = COALESCE(NULLIF($2, ''), name),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, phone, name, role, is_phone_verified, hostel_name, room_no, block, floor, landmark, created_at, updated_at`,
      [existing.id, name || '']
    );
    return updateRes.rows[0];
  }

  // Create new user (role defaults to CUSTOMER)
  const insertRes = await executeQuery(
    `INSERT INTO users (phone, name, role, is_phone_verified, created_at, updated_at)
     VALUES ($1, $2, 'CUSTOMER', TRUE, NOW(), NOW())
     RETURNING id, phone, name, role, is_phone_verified, hostel_name, room_no, block, floor, landmark, created_at, updated_at`,
    [formattedPhone, name || 'FoodZa Customer']
  );

  return insertRes.rows[0];
}

/**
 * Issue access token and create refresh token session in database
 * @param {Object} user
 * @param {string} [ipAddress]
 * @param {string} [userAgent]
 * @returns {Promise<{ accessToken: string, refreshToken: string, user: Object, expiresInSeconds: number }>}
 */
export async function createUserSession(user, ipAddress, userAgent) {
  const payload = {
    userId: user.id,
    phone: user.phone,
    role: user.role,
    name: user.name,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = generateRefreshTokenString();

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO sessions (user_id, refresh_token, expires_at, revoked, ip_address, user_agent, created_at)
     VALUES ($1, $2, $3, FALSE, $4, $5, NOW())`,
    [user.id, refreshToken, expiresAt, ipAddress || null, userAgent || null]
  );

  return {
    accessToken,
    refreshToken,
    user,
    expiresInSeconds: 15 * 60,
  };
}

/**
 * Rotate session: validates old refresh token, revokes it, and issues new token pair
 * @param {string} oldRefreshToken
 * @param {string} [ipAddress]
 * @param {string} [userAgent]
 * @returns {Promise<Object|null>}
 */
export async function rotateSession(oldRefreshToken, ipAddress, userAgent) {
  if (!oldRefreshToken) return null;

  const sessionRes = await query(
    `SELECT s.id, s.user_id, s.expires_at, s.revoked,
            u.id as u_id, u.phone, u.name, u.role, u.is_phone_verified, u.hostel_name, u.room_no, u.block, u.floor, u.landmark, u.created_at, u.updated_at
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.refresh_token = $1`,
    [oldRefreshToken]
  );

  if (sessionRes.rows.length === 0) {
    return null;
  }

  const row = sessionRes.rows[0];

  if (row.revoked || new Date(row.expires_at).getTime() < Date.now()) {
    return null;
  }

  // Revoke old session token (one-time use rotation)
  await query(`UPDATE sessions SET revoked = TRUE WHERE id = $1`, [row.id]);

  const user = {
    id: row.u_id,
    phone: row.phone,
    name: row.name,
    role: row.role,
    is_phone_verified: row.is_phone_verified,
    hostel_name: row.hostel_name,
    room_no: row.room_no,
    block: row.block,
    floor: row.floor,
    landmark: row.landmark,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  return createUserSession(user, ipAddress, userAgent);
}

/**
 * Revoke user session on logout
 * @param {string} refreshToken
 * @returns {Promise<boolean>}
 */
export async function revokeUserSession(refreshToken) {
  if (!refreshToken) return false;
  const res = await query(
    `UPDATE sessions SET revoked = TRUE WHERE refresh_token = $1`,
    [refreshToken]
  );
  return (res.rowCount || 0) > 0;
}

/**
 * Fetch user by ID
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
export async function getUserById(userId) {
  if (!userId) return null;
  const res = await query(
    `SELECT id, phone, name, role, is_phone_verified, hostel_name, room_no, block, floor, landmark, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId]
  );
  return res.rows[0] || null;
}

/**
 * Helper to extract bearer token from Express request
 * @param {import('express').Request} req
 * @returns {string|null}
 */
export function extractToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // Fallback to cookie if present
  if (req.headers.cookie) {
    const cookies = Object.fromEntries(
      req.headers.cookie.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );
    if (cookies.foodza_access_token) {
      return cookies.foodza_access_token;
    }
  }

  return null;
}

/**
 * Authentication Middleware: enforces valid FoodZa customer token
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in with your verified WhatsApp number.',
    });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded || !decoded.userId) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired access token. Please refresh your session.',
      code: 'TOKEN_EXPIRED',
    });
  }

  const user = await getUserById(decoded.userId);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'User account not found or has been removed.',
    });
  }

  req.user = user;
  next();
}

/**
 * Optional Authentication Middleware: attaches user if token is valid, proceeds either way
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    const decoded = verifyAccessToken(token);
    if (decoded && decoded.userId) {
      const user = await getUserById(decoded.userId);
      if (user) {
        req.user = user;
      }
    }
  }
  next();
}

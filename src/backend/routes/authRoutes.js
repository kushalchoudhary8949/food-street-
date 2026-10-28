/**
 * @file authRoutes.js
 * @module backend/routes/authRoutes
 * @description
 * Express router handling WhatsApp OTP authentication flow via YouPI,
 * session creation, token refresh, and logout.
 */

import express from 'express';
import {
  normalizeIndianPhone,
  checkOtpRateLimit,
  sendOtpViaYouPi,
  verifyOtpViaYouPi,
  recordOtpRequest,
  markOtpVerified,
  findOrCreateFoodZaUser,
  createUserSession,
  rotateSession,
  revokeUserSession,
} from '../auth.js';

export const authRouter = express.Router();

/**
 * Helper to set secure authentication cookies
 * @param {express.Response} res
 * @param {string} accessToken
 * @param {string} refreshToken
 */
function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('foodza_refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.cookie('foodza_access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 mins
  });
}

/**
 * Helper to clear authentication cookies
 * @param {express.Response} res
 */
function clearAuthCookies(res) {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('foodza_refresh_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/v1/auth',
  });
  res.clearCookie('foodza_access_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
}

/**
 * POST /api/v1/auth/whatsapp/send-otp
 * Dispatches a WhatsApp OTP using YouPI's live WhatsApp protocol service.
 */
authRouter.post('/whatsapp/send-otp', async (req, res) => {
  try {
    const { phone, phoneNumber, mobile, name } = req.body || {};
    const rawPhone = phone || phoneNumber || mobile;

    if (!rawPhone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required. Please provide a 10-digit Indian mobile number.',
      });
    }

    // 1. Normalize and validate Indian mobile phone
    const { isValid, clean10, formattedE164, error: phoneError } = normalizeIndianPhone(rawPhone);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: phoneError,
      });
    }

    // 2. Check rate limit & cooldown (30s cooldown, max 8 requests/hr)
    const rateCheck = await checkOtpRateLimit(formattedE164);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: rateCheck.message,
        waitSeconds: rateCheck.waitSeconds,
      });
    }

    // 3. Initiate WhatsApp OTP dispatch via YouPI
    let youpiResult;
    try {
      youpiResult = await sendOtpViaYouPi(clean10, name);
    } catch (youpiErr) {
      console.error('[FoodZa Auth] YouPI sendOtp failed:', youpiErr.message);
      return res.status(502).json({
        success: false,
        error: `WhatsApp OTP service error: ${youpiErr.message}`,
      });
    }

    // 4. Record OTP request in database
    await recordOtpRequest(formattedE164, youpiResult?.dispatchId || youpiResult?.id);

    // 5. Send success response (never expose secret tokens or private credentials)
    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your WhatsApp number.',
      phone: formattedE164,
      expiresInSeconds: youpiResult?.expiresInSeconds || 300,
    });
  } catch (error) {
    console.error('[FoodZa Send OTP Error]', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while sending verification code.',
    });
  }
});

/**
 * POST /api/v1/auth/whatsapp/verify-otp
 * Verifies OTP via YouPI's server-side verification and issues FoodZa session/tokens.
 */
authRouter.post('/whatsapp/verify-otp', async (req, res) => {
  try {
    const { phone, phoneNumber, mobile, otp, code, name } = req.body || {};
    const rawPhone = phone || phoneNumber || mobile;
    const rawOtp = String(otp || code || '').trim();

    if (!rawPhone || !rawOtp) {
      return res.status(400).json({
        success: false,
        error: 'Both phone number and OTP code are required.',
      });
    }

    if (!/^\d{6}$/.test(rawOtp)) {
      return res.status(400).json({
        success: false,
        error: 'OTP must be a 6-digit numeric code.',
      });
    }

    const { isValid, clean10, formattedE164, error: phoneError } = normalizeIndianPhone(rawPhone);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: phoneError,
      });
    }

    // 1. Verify OTP with YouPI server-side
    let youpiVerifyRes;
    try {
      youpiVerifyRes = await verifyOtpViaYouPi(clean10, rawOtp);
    } catch (verifyErr) {
      const status = [400, 404, 410, 429].includes(verifyErr.status) ? verifyErr.status : 502;
      return res.status(status).json({
        success: false,
        error: verifyErr.message || 'Invalid or expired OTP code. Please request a new code.',
      });
    }

    if (!youpiVerifyRes?.success) {
      return res.status(400).json({
        success: false,
        error: youpiVerifyRes?.error || 'OTP verification failed.',
      });
    }

    // 2. Mark OTP verified in database
    await markOtpVerified(formattedE164);

    // 3. Find or create authoritative FoodZa user in PostgreSQL
    const resolvedName = name || youpiVerifyRes?.fullName || youpiVerifyRes?.customer?.name || null;
    const user = await findOrCreateFoodZaUser(formattedE164, resolvedName);

    // 4. Issue authenticated FoodZa session & tokens
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;
    const session = await createUserSession(user, ip, userAgent);

    // 5. Set secure HTTP-only cookies
    setAuthCookies(res, session.accessToken, session.refreshToken);

    // 6. Return response
    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        isPhoneVerified: user.is_phone_verified,
        hostelName: user.hostel_name,
        roomNo: user.room_no,
        block: user.block,
        floor: user.floor,
        landmark: user.landmark,
      },
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresInSeconds: session.expiresInSeconds,
    });
  } catch (error) {
    console.error('[FoodZa Verify OTP Error]', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during OTP verification.',
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Rotates refresh token and issues a new access token.
 */
authRouter.post('/refresh', async (req, res) => {
  try {
    const refreshToken =
      req.body?.refreshToken ||
      req.cookies?.foodza_refresh_token ||
      (req.headers.cookie ? Object.fromEntries(req.headers.cookie.split(';').map(c => c.trim().split('='))).foodza_refresh_token : null);

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token is required.',
      });
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;

    const newSession = await rotateSession(refreshToken, ip, userAgent);
    if (!newSession) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        error: 'Invalid, revoked, or expired refresh token. Please log in again.',
      });
    }

    setAuthCookies(res, newSession.accessToken, newSession.refreshToken);

    return res.status(200).json({
      success: true,
      accessToken: newSession.accessToken,
      refreshToken: newSession.refreshToken,
      expiresInSeconds: newSession.expiresInSeconds,
      user: {
        id: newSession.user.id,
        phone: newSession.user.phone,
        name: newSession.user.name,
        role: newSession.user.role,
        isPhoneVerified: newSession.user.is_phone_verified,
        hostelName: newSession.user.hostel_name,
        roomNo: newSession.user.room_no,
        block: newSession.user.block,
        floor: newSession.user.floor,
        landmark: newSession.user.landmark,
      },
    });
  } catch (error) {
    console.error('[FoodZa Token Refresh Error]', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while refreshing session.',
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Revokes current session and clears cookies.
 */
authRouter.post('/logout', async (req, res) => {
  try {
    const refreshToken =
      req.body?.refreshToken ||
      req.cookies?.foodza_refresh_token ||
      (req.headers.cookie ? Object.fromEntries(req.headers.cookie.split(';').map(c => c.trim().split('='))).foodza_refresh_token : null);

    if (refreshToken) {
      await revokeUserSession(refreshToken);
    }

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    console.error('[FoodZa Logout Error]', error);
    clearAuthCookies(res);
    return res.status(200).json({
      success: true,
      message: 'Logged out.',
    });
  }
});

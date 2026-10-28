/**
 * @file userRoutes.js
 * @module backend/routes/userRoutes
 * @description
 * Customer Profile Management APIs:
 * - GET /api/v1/users/me
 * - PATCH /api/v1/users/me
 */

import express from 'express';
import { requireAuth } from '../auth.js';
import { query } from '../db.js';

export const userRouter = express.Router();

/**
 * GET /api/v1/users/me
 * Retrieves authenticated user profile and default address
 */
userRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const user = req.user;

    // Fetch user's default address if available
    const addrRes = await query(
      `SELECT * FROM addresses
       WHERE user_id = $1 AND is_default = TRUE
       LIMIT 1`,
      [user.id]
    );

    return res.status(200).json({
      success: true,
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
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        defaultAddress: addrRes.rows[0] || null,
      },
    });
  } catch (error) {
    console.error('[Get Profile Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile.',
    });
  }
});

/**
 * PATCH /api/v1/users/me
 * Updates customer profile details (name, hostel, room, block, floor, landmark).
 * NOTE: Changing verified phone number is strictly rejected here — it requires WhatsApp verification.
 */
userRouter.patch('/me', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};

    // Security check: Never allow arbitrary phone number modification via profile update
    if (body.phone && body.phone !== user.phone) {
      return res.status(403).json({
        success: false,
        error: 'Phone number cannot be changed directly. Please verify the new number through WhatsApp OTP.',
      });
    }

    // Sanitize and extract updateable fields
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 255) : user.name;
    const hostelName = typeof (body.hostelName ?? body.hostel_name) === 'string'
      ? (body.hostelName ?? body.hostel_name).trim().slice(0, 255)
      : user.hostel_name;
    const roomNo = typeof (body.roomNo ?? body.room_no) === 'string'
      ? (body.roomNo ?? body.room_no).trim().slice(0, 50)
      : user.room_no;
    const block = typeof body.block === 'string' ? body.block.trim().slice(0, 50) : user.block;
    const floor = typeof body.floor === 'string' ? body.floor.trim().slice(0, 50) : user.floor;
    const landmark = typeof body.landmark === 'string' ? body.landmark.trim().slice(0, 255) : user.landmark;

    const updateRes = await query(
      `UPDATE users
       SET name = $1,
           hostel_name = $2,
           room_no = $3,
           block = $4,
           floor = $5,
           landmark = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, phone, name, role, is_phone_verified, hostel_name, room_no, block, floor, landmark, created_at, updated_at`,
      [name, hostelName, roomNo, block, floor, landmark, user.id]
    );

    const updatedUser = updateRes.rows[0];

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        name: updatedUser.name,
        role: updatedUser.role,
        isPhoneVerified: updatedUser.is_phone_verified,
        hostelName: updatedUser.hostel_name,
        roomNo: updatedUser.room_no,
        block: updatedUser.block,
        floor: updatedUser.floor,
        landmark: updatedUser.landmark,
        updatedAt: updatedUser.updated_at,
      },
    });
  } catch (error) {
    console.error('[Update Profile Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile.',
    });
  }
});

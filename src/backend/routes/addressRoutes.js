/**
 * @file addressRoutes.js
 * @module backend/routes/addressRoutes
 * @description
 * Customer Delivery Address Management APIs:
 * - GET /api/v1/addresses
 * - POST /api/v1/addresses
 * - PATCH /api/v1/addresses/:id
 * - DELETE /api/v1/addresses/:id
 * - POST /api/v1/addresses/:id/default
 */

import express from 'express';
import { requireAuth } from '../auth.js';
import { query, getClient } from '../db.js';

export const addressRouter = express.Router();

// Enforce authentication on all address endpoints
addressRouter.use(requireAuth);

/**
 * GET /api/v1/addresses
 * Lists all delivery addresses belonging to the authenticated customer.
 */
addressRouter.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(
      `SELECT * FROM addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      addresses: result.rows,
    });
  } catch (error) {
    console.error('[List Addresses Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve delivery addresses.',
    });
  }
});

/**
 * POST /api/v1/addresses
 * Creates a new delivery address for the authenticated customer.
 */
addressRouter.post('/', async (req, res) => {
  const client = await getClient();
  try {
    const userId = req.user.id;
    const body = req.body || {};

    const label = (body.label || 'Hostel').trim().slice(0, 50);
    const name = (body.name || req.user.name || '').trim().slice(0, 255);
    const phone = (body.phone || req.user.phone || '').trim().slice(0, 20);
    const hostelName = (body.hostelName || body.hostel_name || '').trim().slice(0, 255);
    const roomNo = (body.roomNo || body.room_no || '').trim().slice(0, 50);
    const block = (body.block || '').trim().slice(0, 50);
    const floor = (body.floor || '').trim().slice(0, 50);
    const addressLine = (body.addressLine || body.address_line || '').trim();
    const locality = (body.locality || 'Campus').trim().slice(0, 255);
    const city = (body.city || 'Campus').trim().slice(0, 100);
    const instructions = (body.instructions || '').trim();
    let isDefault = Boolean(body.isDefault ?? body.is_default);

    if (!hostelName && !addressLine) {
      return res.status(400).json({
        success: false,
        error: 'Hostel or address details are required.',
      });
    }

    await client.query('BEGIN');

    // Check how many addresses exist for this customer
    const countRes = await client.query(
      `SELECT COUNT(*) as count FROM addresses WHERE user_id = $1`,
      [userId]
    );
    const addressCount = parseInt(countRes.rows[0]?.count || '0', 10);

    // If this is the user's first address, make it default automatically
    if (addressCount === 0) {
      isDefault = true;
    }

    // If this address is set to default, clear previous default flag
    if (isDefault) {
      await client.query(
        `UPDATE addresses SET is_default = FALSE WHERE user_id = $1`,
        [userId]
      );
    }

    const insertRes = await client.query(
      `INSERT INTO addresses (
        user_id, label, name, phone, hostel_name, room_no, block, floor,
        address_line, locality, city, instructions, is_default, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *`,
      [
        userId,
        label,
        name,
        phone,
        hostelName,
        roomNo,
        block,
        floor,
        addressLine,
        locality,
        city,
        instructions,
        isDefault,
      ]
    );

    // Also update customer profile with primary hostel/room if not set
    if (!req.user.hostel_name && hostelName) {
      await client.query(
        `UPDATE users
         SET hostel_name = COALESCE(hostel_name, $1),
             room_no = COALESCE(room_no, $2),
             block = COALESCE(block, $3),
             floor = COALESCE(floor, $4),
             updated_at = NOW()
         WHERE id = $5`,
        [hostelName, roomNo, block, floor, userId]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Address saved successfully.',
      address: insertRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Create Address Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create delivery address.',
    });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/v1/addresses/:id
 * Updates an address owned by the authenticated customer.
 */
addressRouter.patch('/:id', async (req, res) => {
  const client = await getClient();
  try {
    const userId = req.user.id;
    const addressId = req.params.id;
    const body = req.body || {};

    // 1. Verify address exists and belongs to this user
    const checkRes = await client.query(
      `SELECT * FROM addresses WHERE id = $1 AND user_id = $2`,
      [addressId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Address not found or unauthorized to modify.',
      });
    }

    const current = checkRes.rows[0];

    const label = body.label !== undefined ? String(body.label).trim().slice(0, 50) : current.label;
    const name = body.name !== undefined ? String(body.name).trim().slice(0, 255) : current.name;
    const phone = body.phone !== undefined ? String(body.phone).trim().slice(0, 20) : current.phone;
    const hostelName = (body.hostelName ?? body.hostel_name) !== undefined
      ? String(body.hostelName ?? body.hostel_name).trim().slice(0, 255)
      : current.hostel_name;
    const roomNo = (body.roomNo ?? body.room_no) !== undefined
      ? String(body.roomNo ?? body.room_no).trim().slice(0, 50)
      : current.room_no;
    const block = body.block !== undefined ? String(body.block).trim().slice(0, 50) : current.block;
    const floor = body.floor !== undefined ? String(body.floor).trim().slice(0, 50) : current.floor;
    const addressLine = (body.addressLine ?? body.address_line) !== undefined
      ? String(body.addressLine ?? body.address_line).trim()
      : current.address_line;
    const locality = body.locality !== undefined ? String(body.locality).trim().slice(0, 255) : current.locality;
    const city = body.city !== undefined ? String(body.city).trim().slice(0, 100) : current.city;
    const instructions = body.instructions !== undefined ? String(body.instructions).trim() : current.instructions;
    const isDefault = (body.isDefault ?? body.is_default) !== undefined
      ? Boolean(body.isDefault ?? body.is_default)
      : current.is_default;

    await client.query('BEGIN');

    if (isDefault && !current.is_default) {
      await client.query(
        `UPDATE addresses SET is_default = FALSE WHERE user_id = $1`,
        [userId]
      );
    }

    const updateRes = await client.query(
      `UPDATE addresses SET
        label = $1, name = $2, phone = $3, hostel_name = $4, room_no = $5,
        block = $6, floor = $7, address_line = $8, locality = $9, city = $10,
        instructions = $11, is_default = $12, updated_at = NOW()
       WHERE id = $13 AND user_id = $14
       RETURNING *`,
      [
        label,
        name,
        phone,
        hostelName,
        roomNo,
        block,
        floor,
        addressLine,
        locality,
        city,
        instructions,
        isDefault,
        addressId,
        userId,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Address updated successfully.',
      address: updateRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Update Address Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update delivery address.',
    });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/v1/addresses/:id
 * Deletes an address owned by the authenticated customer.
 */
addressRouter.delete('/:id', async (req, res) => {
  const client = await getClient();
  try {
    const userId = req.user.id;
    const addressId = req.params.id;

    // Verify ownership
    const checkRes = await client.query(
      `SELECT * FROM addresses WHERE id = $1 AND user_id = $2`,
      [addressId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Address not found or unauthorized to delete.',
      });
    }

    const wasDefault = checkRes.rows[0].is_default;

    await client.query('BEGIN');

    await client.query(
      `DELETE FROM addresses WHERE id = $1 AND user_id = $2`,
      [addressId, userId]
    );

    // If the deleted address was default, promote another address to default if available
    if (wasDefault) {
      await client.query(
        `UPDATE addresses
         SET is_default = TRUE
         WHERE id IN (
           SELECT id FROM addresses
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 1
         )`,
        [userId]
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Address deleted successfully.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Delete Address Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete delivery address.',
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/v1/addresses/:id/default
 * Sets an owned address as the customer's default delivery address.
 */
addressRouter.post('/:id/default', async (req, res) => {
  const client = await getClient();
  try {
    const userId = req.user.id;
    const addressId = req.params.id;

    // Verify ownership
    const checkRes = await client.query(
      `SELECT * FROM addresses WHERE id = $1 AND user_id = $2`,
      [addressId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Address not found or unauthorized to modify.',
      });
    }

    await client.query('BEGIN');

    // Unset all existing defaults for this user
    await client.query(
      `UPDATE addresses SET is_default = FALSE WHERE user_id = $1`,
      [userId]
    );

    // Set this one as default
    const updateRes = await client.query(
      `UPDATE addresses SET is_default = TRUE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [addressId, userId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Default address updated.',
      address: updateRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Set Default Address Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update default address.',
    });
  } finally {
    client.release();
  }
});

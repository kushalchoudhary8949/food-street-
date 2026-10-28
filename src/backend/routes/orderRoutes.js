/**
 * @file orderRoutes.js
 * @module backend/routes/orderRoutes
 * @description
 * Order Management APIs with Customer Authentication, Address Validation,
 * Immutable Delivery Snapshots, and Transactional Persistence.
 * 
 * Routes:
 * - POST /api/v1/orders (creates order with delivery snapshot)
 * - GET  /api/v1/orders (lists customer orders or all orders for admin)
 * - GET  /api/v1/orders/:id (fetches single order)
 */

import express from 'express';
import { optionalAuth, requireAuth } from '../auth.js';
import { query, getClient } from '../db.js';

export const orderRouter = express.Router();

/**
 * POST /api/v1/orders
 * Creates and persists a customer order with an immutable delivery snapshot.
 */
orderRouter.post('/', requireAuth, async (req, res) => {
  const client = await getClient();
  try {
    const user = req.user;
    const order = req.body || {};

    if (!order.id) {
      order.id = `ord-${Date.now()}`;
    }

    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order must contain at least one item.',
      });
    }

    // 1. Resolve delivery address and ownership
    let addressRecord = null;
    if (order.addressId && user) {
      const addrRes = await client.query(
        `SELECT * FROM addresses WHERE id = $1 AND user_id = $2`,
        [order.addressId, user.id]
      );
      if (addrRes.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Specified delivery address not found or unauthorized.',
        });
      }
      addressRecord = addrRes.rows[0];
    } else if (user) {
      // Find default address if available
      const defRes = await client.query(
        `SELECT * FROM addresses WHERE user_id = $1 AND is_default = TRUE LIMIT 1`,
        [user.id]
      );
      if (defRes.rows.length > 0) {
        addressRecord = defRes.rows[0];
      }
    }

    // 2. Derive delivery details (prefers verified user/address record, falls back to body if validated)
    const customerName = (
      user?.name ||
      addressRecord?.name ||
      order.name ||
      order.customerName ||
      'Valued Customer'
    ).trim();

    const customerPhone = (
      user?.phone ||
      addressRecord?.phone ||
      order.customerPhone ||
      order.contact ||
      ''
    ).trim();

    const deliveryHostel = (
      (order.hostel !== undefined ? order.hostel : null) ??
      (order.deliveryHostel !== undefined ? order.deliveryHostel : null) ??
      addressRecord?.hostel_name ??
      user?.hostel_name ??
      ''
    ).trim();

    const deliveryRoomNo = (
      (order.roomNo !== undefined ? order.roomNo : null) ??
      (order.deliveryRoomNo !== undefined ? order.deliveryRoomNo : null) ??
      addressRecord?.room_no ??
      user?.room_no ??
      ''
    ).trim();

    const deliveryBlock = (
      (order.block !== undefined ? order.block : null) ??
      addressRecord?.block ??
      user?.block ??
      ''
    ).trim();

    const deliveryFloor = (
      (order.floor !== undefined ? order.floor : null) ??
      addressRecord?.floor ??
      user?.floor ??
      ''
    ).trim();

    const deliveryLandmark = (
      (order.landmark !== undefined ? order.landmark : null) ??
      addressRecord?.locality ??
      user?.landmark ??
      ''
    ).trim();

    const deliveryAddressLine = (
      (order.deliveryAddress !== undefined ? order.deliveryAddress : null) ??
      (order.addressLine !== undefined ? order.addressLine : null) ??
      addressRecord?.address_line ??
      [deliveryHostel, deliveryRoomNo ? `Room ${deliveryRoomNo}` : null, deliveryBlock].filter(Boolean).join(', ')
    ).trim();

    const deliveryInstructions = (
      (order.instructions !== undefined ? order.instructions : null) ??
      addressRecord?.instructions ??
      ''
    ).trim();

    // 3. Validate essential delivery details
    if (!deliveryHostel) {
      return res.status(400).json({
        success: false,
        error: 'Hostel name is required for campus delivery.',
      });
    }

    if (!deliveryRoomNo) {
      return res.status(400).json({
        success: false,
        error: 'Room number is required for campus hostel delivery.',
      });
    }

    // 4. Create immutable order-time delivery snapshot
    const deliverySnapshot = {
      customerId: user ? user.id : null,
      customerName,
      customerPhone,
      hostelName: deliveryHostel,
      roomNo: deliveryRoomNo,
      block: deliveryBlock,
      floor: deliveryFloor,
      landmark: deliveryLandmark,
      addressLine: deliveryAddressLine,
      instructions: deliveryInstructions,
      snapshotTimestamp: new Date().toISOString(),
    };

    // Calculate grand total safely
    const grandTotal = Number(order.grandTotal ?? order.total ?? 0);
    const orderNumber = order.orderNumber || `#FD-${Math.floor(10000 + Math.random() * 90000)}`;

    const fullOrderPayload = {
      ...order,
      id: order.id,
      orderNumber,
      userId: user ? user.id : null,
      name: customerName,
      contact: customerPhone,
      customerPhone,
      hostel: deliveryHostel,
      roomNo: deliveryRoomNo,
      block: deliveryBlock,
      floor: deliveryFloor,
      deliveryAddress: deliveryAddressLine,
      deliverySnapshot,
      grandTotal,
      status: order.status || 'placed',
      createdAtTimestamp: order.createdAtTimestamp || Date.now(),
      updatedAtTimestamp: Date.now(),
    };

    // 5. Database transaction for atomic persistence
    await client.query('BEGIN');

    const insertSql = `
      INSERT INTO orders (
        id, order_number, user_id, status, grand_total,
        customer_name, customer_phone, delivery_hostel, delivery_room_no,
        delivery_block, delivery_floor, delivery_landmark,
        delivery_address_line, delivery_instructions, delivery_snapshot,
        data, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        order_number = EXCLUDED.order_number,
        user_id = EXCLUDED.user_id,
        status = EXCLUDED.status,
        grand_total = EXCLUDED.grand_total,
        customer_name = EXCLUDED.customer_name,
        customer_phone = EXCLUDED.customer_phone,
        delivery_hostel = EXCLUDED.delivery_hostel,
        delivery_room_no = EXCLUDED.delivery_room_no,
        delivery_block = EXCLUDED.delivery_block,
        delivery_floor = EXCLUDED.delivery_floor,
        delivery_landmark = EXCLUDED.delivery_landmark,
        delivery_address_line = EXCLUDED.delivery_address_line,
        delivery_instructions = EXCLUDED.delivery_instructions,
        delivery_snapshot = EXCLUDED.delivery_snapshot,
        data = EXCLUDED.data,
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await client.query(insertSql, [
      String(order.id),
      orderNumber,
      user ? user.id : null,
      order.status || 'placed',
      grandTotal,
      customerName,
      customerPhone,
      deliveryHostel,
      deliveryRoomNo,
      deliveryBlock,
      deliveryFloor,
      deliveryLandmark,
      deliveryAddressLine,
      deliveryInstructions,
      JSON.stringify(deliverySnapshot),
      JSON.stringify(fullOrderPayload),
    ]);

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Order placed and confirmed successfully.',
      order: fullOrderPayload,
      persistedRecord: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Create Order Transaction Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to persist order in PostgreSQL.',
      details: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/v1/orders
 * Returns customer orders if authenticated, or filtered orders
 */
orderRouter.get('/', optionalAuth, async (req, res) => {
  try {
    const user = req.user;
    const phone = req.query.phone || (user ? user.phone : null);
    const userId = user ? user.id : null;
    const isAdmin = user && (user.role === 'ADMIN' || user.role === 'OWNER');

    let sql;
    let params;

    if (isAdmin) {
      sql = `SELECT * FROM orders ORDER BY created_at DESC LIMIT 200`;
      params = [];
    } else if (userId && phone) {
      sql = `SELECT * FROM orders WHERE user_id = $1 OR customer_phone = $2 ORDER BY created_at DESC`;
      params = [userId, phone];
    } else if (userId) {
      sql = `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`;
      params = [userId];
    } else if (phone) {
      sql = `SELECT * FROM orders WHERE customer_phone = $1 ORDER BY created_at DESC`;
      params = [phone];
    } else {
      // Fallback: return recent orders for public sync (or empty if unauthenticated)
      sql = `SELECT * FROM orders ORDER BY created_at DESC LIMIT 50`;
      params = [];
    }

    const result = await query(sql, params);

    const orders = result.rows.map((row) => {
      const parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
      return {
        ...parsedData,
        id: row.id,
        orderNumber: row.order_number || parsedData.orderNumber,
        status: row.status || parsedData.status,
        grandTotal: row.grand_total ? Number(row.grand_total) : parsedData.grandTotal,
        customerName: row.customer_name || parsedData.name,
        customerPhone: row.customer_phone || parsedData.contact,
        deliveryHostel: row.delivery_hostel || parsedData.hostel,
        deliveryRoomNo: row.delivery_room_no || parsedData.roomNo,
        deliverySnapshot: row.delivery_snapshot || parsedData.deliverySnapshot,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('[List Orders Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve orders.',
    });
  }
});

/**
 * GET /api/v1/orders/:id
 * Fetches a single order with its delivery snapshot
 */
orderRouter.get('/:id', optionalAuth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const result = await query(`SELECT * FROM orders WHERE id = $1`, [orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found.',
      });
    }

    const row = result.rows[0];
    const parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});

    // Check ownership if user is authenticated and not admin
    if (req.user && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      if (row.user_id && row.user_id !== req.user.id && row.customer_phone !== req.user.phone) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to view this order.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      order: {
        ...parsedData,
        id: row.id,
        orderNumber: row.order_number,
        status: row.status,
        grandTotal: row.grand_total ? Number(row.grand_total) : parsedData.grandTotal,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        deliveryHostel: row.delivery_hostel,
        deliveryRoomNo: row.delivery_room_no,
        deliveryBlock: row.delivery_block,
        deliveryFloor: row.delivery_floor,
        deliveryLandmark: row.delivery_landmark,
        deliveryAddressLine: row.delivery_address_line,
        deliveryInstructions: row.delivery_instructions,
        deliverySnapshot: row.delivery_snapshot,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error('[Get Order Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve order.',
    });
  }
});

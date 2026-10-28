/// <reference path="../deno.d.ts" />
// supabase/functions/food-street/index.ts
// Deno Edge Function for Food Street backend
// -------------------------------------------------
// Replaces the original Express API with a lightweight Deno HTTP server.
// Provides endpoints: /stores, /categories, /orders, /status, /seed
// -------------------------------------------------
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createFoodZaAuthHandlers,
  createSupabaseFoodZaAuthRepository,
  parseExpirySeconds,
  stripFoodStreetFunctionPrefix,
} from "./auth.js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || Deno.env.get("SUPABASE_ANON_KEY") || "",
);
const authRepository = supabaseServiceRoleKey
  ? createSupabaseFoodZaAuthRepository(createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }))
  : null;
const authConfig = {
  youpiApiUrl: Deno.env.get("YOUPI_OTP_API_URL") ?? "",
  sharedSecret: Deno.env.get("FOODZA_OTP_API_SECRET") ?? "",
  jwtAccessSecret: Deno.env.get("JWT_ACCESS_SECRET") ?? "",
};
const authHandlers = authRepository &&
    authConfig.youpiApiUrl.startsWith("https://") &&
    authConfig.sharedSecret &&
    new TextEncoder().encode(authConfig.jwtAccessSecret).length >= 32
  ? createFoodZaAuthHandlers({
    repository: authRepository,
    ...authConfig,
    accessTokenTtlSeconds: parseExpirySeconds(Deno.env.get("JWT_ACCESS_EXPIRY") || "15m"),
    secureCookies: supabaseUrl.startsWith("https://"),
  })
  : null;


// ── Helpers ──────────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,Cache-Control,Pragma,Accept,X-Requested-With",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

async function getJsonBody(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) return req.json();
  return {};
}

function paginate(req: Request, records: unknown[]) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit")) || records.length;
  const offset = Number(url.searchParams.get("offset")) || 0;
  return {
    data: records.slice(offset, offset + limit),
    total: records.length,
    limit,
    offset,
  };
}

// ── Health check ─────────────────────────────────────────────────────────────

async function handleStatus() {
  const [
    { count: storesCount, error: err1 },
    { count: categoriesCount, error: err2 },
    { count: ordersCount, error: err3 }
  ] = await Promise.all([
    supabase.from("stores").select("*", { count: "exact", head: true }),
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
  ]);

  if (err1 || err2 || err3) {
    const errorMsg = err1?.message || err2?.message || err3?.message;
    return jsonResponse({
      success: false,
      connected: false,
      database: "Supabase (PostgreSQL)",
      error: errorMsg,
    }, 500);
  }

  return jsonResponse({
    success: true,
    connected: true,
    database: "Supabase (PostgreSQL)",
    counts: {
      stores: storesCount ?? 0,
      categories: categoriesCount ?? 0,
      orders: ordersCount ?? 0,
    },
  });
}

// ── Stores & Categories (shared logic) ───────────────────────────────────────

async function handleList(resource: string, req: Request) {
  const { data, error } = await supabase.from(resource).select("id,data");
  if (error) return jsonResponse({ success: false, error: error.message }, 500);
  const records = (data || []).map((r: any) => r.data);
  const page = paginate(req, records);
  return jsonResponse({
    success: true,
    [resource]: page.data,
    total: page.total,
    limit: page.limit,
    offset: page.offset,
  });
}

async function handleUpsert(resource: string, body: any) {
  const records = Array.isArray(body) ? body : body?.[resource] ?? [body];
  const valid = records.filter((r: any) => r?.id);

  for (const rec of valid) {
    const { error } = await supabase.from(resource).upsert({
      id: rec.id,
      name: rec.name ?? "",
      data: rec,
      updated_at: new Date().toISOString(),
    });
    if (error)
      return jsonResponse({ success: false, error: error.message }, 500);
  }

  // Optional: delete others when replace=true
  if (body?.replace === true && valid.length) {
    const ids = valid.map((r: any) => r.id);
    const { error } = await supabase
      .from(resource)
      .delete()
      .not("id", "in", `(${ids.map((id: string) => `'${id}'`).join(",")})`);
    if (error)
      return jsonResponse({ success: false, error: error.message }, 500);
  }

  return jsonResponse({ success: true, count: valid.length });
}

async function handleDelete(resource: string, req: Request) {
  const url = new URL(req.url);
  const paramKey = resource === "stores" ? "storeId" : "categoryId";
  const id =
    url.searchParams.get(paramKey) || ((await getJsonBody(req)) as any).id;
  if (!id)
    return jsonResponse({ success: false, error: "Missing record id" }, 400);
  const { error } = await supabase.from(resource).delete().eq("id", id);
  if (error) return jsonResponse({ success: false, error: error.message }, 500);
  return jsonResponse({ success: true, deletedId: id });
}

// ── Orders ───────────────────────────────────────────────────────────────────

async function handleOrdersList(req: Request) {
  const { data, error } = await supabase
    .from("orders")
    .select('id,order_number,status,grand_total,"grand Total",created_at,updated_at,name,room_no,"room No.",hostel,"Hostel",contact,data')
    .order("created_at", { ascending: false });
  if (error) return jsonResponse({ success: false, error: error.message }, 500);
  const orders = (data || []).map((r: any) => {
    const rawData = r.data || {};
    const name = r.name || rawData.name || rawData.customerName || '';
    const roomNo = r.room_no || r["room No."] || rawData.roomNo || rawData.room_no || '';
    const hostel = r.hostel || r["Hostel"] || rawData.hostel || rawData.hostelName || '';
    const contact = r.contact || rawData.contact || rawData.customerPhone || '';
    const grandTotalVal = r["grand Total"] ?? r.grand_total ?? rawData.grandTotal ?? rawData.grand_total ?? 0;
    return {
      ...rawData,
      id: r.id,
      orderNumber: r.order_number || rawData.orderNumber || r.id,
      status: r.status || rawData.status || 'placed',
      grandTotal: Number(grandTotalVal),
      grand_total: Number(grandTotalVal),
      "grand Total": Number(grandTotalVal),
      created_at: r.created_at || rawData.created_at,
      updated_at: r.updated_at || rawData.updated_at,
      name,
      roomNo,
      "room No.": roomNo,
      room_no: roomNo,
      hostel,
      "Hostel": hostel,
      contact,
      customerPhone: contact || rawData.customerPhone || '',
      data: rawData,
    };
  });
  const page = paginate(req, orders);
  return jsonResponse({
    success: true,
    orders: page.data,
    total: page.total,
    limit: page.limit,
    offset: page.offset,
  });
}

async function handleOrdersUpsert(body: any) {
  if (!body?.id)
    return jsonResponse(
      { success: false, error: "Invalid order data. Missing order id." },
      400,
    );
  const now = new Date().toISOString();
  const name = body.name ?? body.customerName ?? '';
  const roomNo = body.roomNo ?? body.room_no ?? body['room No.'] ?? '';
  const hostel = body.hostel ?? body.hostelName ?? body['Hostel'] ?? '';
  const contact = body.contact ?? body.customerPhone ?? '';
  const grandTotalVal = Number(body.grandTotal ?? body.grand_total ?? body['grand Total'] ?? 0);
  const orderData = {
    ...body,
    name,
    roomNo,
    hostel,
    contact,
    customerPhone: contact || body.customerPhone || '',
    grandTotal: grandTotalVal,
    created_at: body.createdAtTimestamp ?? body.created_at ?? now,
    updated_at: now,
  };
  const { error } = await supabase.from("orders").upsert({
    id: body.id,
    order_number: body.orderNumber ?? body.id,
    status: body.status ?? "placed",
    grand_total: grandTotalVal,
    "grand Total": grandTotalVal,
    name,
    "room No.": roomNo,
    room_no: roomNo,
    "Hostel": hostel,
    hostel,
    contact,
    data: orderData,
    created_at: orderData.created_at,
    updated_at: orderData.updated_at,
  });
  if (error) return jsonResponse({ success: false, error: error.message }, 500);
  return jsonResponse({ success: true, order: orderData });
}

async function handleOrdersUpdate(body: any) {
  const { orderId, status } = body;
  if (!orderId || !status)
    return jsonResponse(
      { success: false, error: "Missing orderId or status" },
      400,
    );
  const { data, error } = await supabase
    .from("orders")
    .select("data")
    .eq("id", orderId)
    .single();
  if (error) return jsonResponse({ success: false, error: error.message }, 500);
  const now = new Date().toISOString();
  const updated = { ...(data as any).data, status, updated_at: now };
  const { error: updErr } = await supabase
    .from("orders")
    .update({ status, data: updated, updated_at: now })
    .eq("id", orderId);
  if (updErr)
    return jsonResponse({ success: false, error: updErr.message }, 500);
  return jsonResponse({ success: true });
}

async function handleOrdersDelete(req: Request) {
  const url = new URL(req.url);
  const orderId =
    url.searchParams.get("orderId") ||
    ((await getJsonBody(req)) as any).orderId;
  if (!orderId)
    return jsonResponse({ success: false, error: "Missing orderId" }, 400);
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) return jsonResponse({ success: false, error: error.message }, 500);
  return jsonResponse({ success: true });
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function handleSeed(body: any) {
  const { stores = [], categories = [] } = body || {};
  const validStores = stores.filter((s: any) => s?.id);
  const validCats = categories.filter((c: any) => c?.id);

  for (const s of validStores) {
    const { error } = await supabase.from("stores").upsert({
      id: s.id,
      name: s.name ?? "",
      data: s,
      updated_at: new Date().toISOString(),
    });
    if (error) return jsonResponse({ success: false, error: error.message }, 500);
  }

  for (const c of validCats) {
    const { error } = await supabase.from("categories").upsert({
      id: c.id,
      name: c.name ?? "",
      data: c,
      updated_at: new Date().toISOString(),
    });
    if (error) return jsonResponse({ success: false, error: error.message }, 500);
  }

  return jsonResponse({
    success: true,
    message: `Successfully seeded ${validStores.length} stores and ${validCats.length} categories to Supabase.`,
  });
}

// ── Router ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  // Supabase gateways may preserve either the function path or only its name.
  const rawPath = url.pathname;
  const path = stripFoodStreetFunctionPrefix(rawPath);
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Health
  if (path === "/status" && method === "GET") return handleStatus();

  // Customer authentication. OTP state and WhatsApp credentials remain on YouPI;
  // FoodZa accounts and refresh sessions are stored in FoodZa's own Supabase DB.
  if (path.startsWith("/v1/auth/") || path === "/v1/users/me" || path.startsWith("/v1/addresses")) {
    if (!authHandlers) {
      return jsonResponse({ success: false, error: "FoodZa authentication service is not configured." }, 503);
    }
    try {
      if (path === "/v1/auth/whatsapp/send-otp" && method === "POST") return await authHandlers.sendOtp(req);
      if (path === "/v1/auth/whatsapp/verify-otp" && method === "POST") return await authHandlers.verifyOtp(req);
      if (path === "/v1/auth/refresh" && method === "POST") return await authHandlers.refresh(req);
      if (path === "/v1/auth/logout" && method === "POST") return await authHandlers.logout(req);
      if (path === "/v1/users/me" && method === "GET") return await authHandlers.getProfile(req);
      if (path === "/v1/users/me" && method === "PATCH") return await authHandlers.updateProfile(req);
      if (path === "/v1/addresses" && method === "GET") return await authHandlers.getAddresses(req);
      if (path === "/v1/addresses" && method === "POST") return await authHandlers.createAddress(req);

      const addressMatch = /^\/v1\/addresses\/([^/]+)(\/default)?$/.exec(path);
      if (addressMatch) {
        let addressId: string;
        try {
          addressId = decodeURIComponent(addressMatch[1]);
        } catch {
          return jsonResponse({ success: false, error: "Invalid address ID." }, 400);
        }
        if (addressMatch[2] && method === "POST") {
          return await authHandlers.setDefaultAddress(req, addressId);
        }
        if (!addressMatch[2] && method === "PATCH") {
          return await authHandlers.updateAddress(req, addressId);
        }
        if (!addressMatch[2] && method === "DELETE") {
          return await authHandlers.deleteAddress(req, addressId);
        }
      }
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    } catch (error) {
      console.error("[FoodZa Auth] Edge authentication request failed:", error);
      return jsonResponse({ success: false, error: "Authentication service is temporarily unavailable." }, 500);
    }
  }

  // Seed
  if (path === "/seed" && method === "POST") {
    const body = await getJsonBody(req);
    return handleSeed(body);
  }

  // Stores & Categories
  if (path === "/stores" || path === "/categories") {
    const resource = path.slice(1);
    if (method === "GET") return handleList(resource, req);
    if (method === "POST") {
      const body = await getJsonBody(req);
      return handleUpsert(resource, body);
    }
    if (method === "DELETE") return handleDelete(resource, req);
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  // Orders
  if (path === "/orders") {
    if (method === "GET") return handleOrdersList(req);
    if (method === "POST") {
      const body = await getJsonBody(req);
      return handleOrdersUpsert(body);
    }
    if (method === "PUT") {
      const body = await getJsonBody(req);
      return handleOrdersUpdate(body);
    }
    if (method === "DELETE") return handleOrdersDelete(req);
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  // Fallback
  return jsonResponse({ error: "Not found" }, 404);
});

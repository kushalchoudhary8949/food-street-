const OTP_COOLDOWN_MS = 30_000;
const OTP_WINDOW_MS = 60 * 60 * 1000;
const OTP_MAX_REQUESTS_PER_HOUR = 8;
const OTP_TTL_MS = 5 * 60 * 1000;

export function parseExpirySeconds(value) {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) return 900;
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return Number(match[1]) * multipliers[match[2]];
}

export function stripFoodStreetFunctionPrefix(pathname) {
  for (const prefix of ["/functions/v1/food-street", "/food-street"]) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length) || "/";
    }
  }
  return pathname || "/";
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signAccessToken(user, secret, now, accessTokenTtlSeconds) {
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be configured with at least 32 bytes.");
  }
  const issuedAt = Math.floor(now / 1000);
  const header = encodeBase64Url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = encodeBase64Url(new TextEncoder().encode(JSON.stringify({
    userId: user.id,
    phone: user.phone,
    role: user.role,
    name: user.name,
    iat: issuedAt,
    exp: issuedAt + accessTokenTtlSeconds,
  })));
  const unsignedToken = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(unsignedToken));
  return `${unsignedToken}.${encodeBase64Url(new Uint8Array(signature))}`;
}

async function verifyAccessToken(token, secret, now) {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
    if (header.alg !== "HS256" || !claims.userId || claims.exp <= Math.floor(now / 1000)) return null;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    return valid ? claims : null;
  } catch {
    return null;
  }
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(40));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getCookie(req, name) {
  const cookieHeader = req.headers.get("cookie") || "";
  const pair = cookieHeader.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

function getAccessTokenFromRequest(req) {
  const authorization = req.headers.get("authorization") || "";
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  return getCookie(req, "foodza_access_token");
}

function authCookieHeaders(accessToken, refreshToken, secureCookies, accessTokenTtlSeconds, clear = false) {
  const secure = secureCookies ? "; Secure" : "";
  const sameSite = secure ? "None" : "Lax";
  const accessMaxAge = clear ? 0 : accessTokenTtlSeconds;
  const refreshMaxAge = clear ? 0 : 7 * 24 * 60 * 60;
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    `foodza_access_token=${accessToken || ""}; Path=/; Max-Age=${accessMaxAge}; HttpOnly; SameSite=${sameSite}${secure}`,
  );
  headers.append(
    "Set-Cookie",
    `foodza_refresh_token=${refreshToken || ""}; Path=/api/v1/auth; Max-Age=${refreshMaxAge}; HttpOnly; SameSite=${sameSite}${secure}`,
  );
  return headers;
}

function jsonResponse(data, status = 200, headers = new Headers()) {
  headers.set("content-type", "application/json");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization,Cache-Control,Pragma,Accept,X-Requested-With");
  return new Response(JSON.stringify(data), { status, headers });
}

async function readJson(req) {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

function normalizeIndianPhone(value) {
  if (typeof value !== "string") return null;
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  return digits.length === 10 && /^[6-9]\d{9}$/.test(digits)
    ? { clean10: digits, formatted: `+91${digits}` }
    : null;
}

function userResponse(user, defaultAddress = null) {
  return {
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
    ...(defaultAddress ? { defaultAddress } : {}),
  };
}

function boundedString(value, fallback, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

export function createFoodZaAuthHandlers({
  repository,
  youpiApiUrl,
  sharedSecret,
  jwtAccessSecret,
  accessTokenTtlSeconds = 900,
  secureCookies = false,
  fetcher = fetch,
  now = Date.now,
}) {
  async function providerRequest(path, body) {
    if (!youpiApiUrl || !sharedSecret) throw new Error("WhatsApp OTP service is not configured.");
    const base = new URL(youpiApiUrl);
    if (base.protocol !== "https:") throw new Error("YouPI OTP API must use HTTPS.");
    const response = await fetcher(new URL(path, base), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sharedSecret}`,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "WhatsApp verification request failed.");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function sendOtp(req) {
    const body = await readJson(req);
    const phone = normalizeIndianPhone(body?.phone || body?.phoneNumber || body?.mobile);
    if (!phone) return jsonResponse({ success: false, error: "Please enter a valid 10-digit Indian mobile number." }, 400);

    const timestamp = now();
    const since = new Date(timestamp - OTP_WINDOW_MS).toISOString();
    const rate = await repository.getOtpRate(phone.formatted, since);
    const recent = (rate.requests || []).filter((row) => new Date(row.created_at).getTime() >= timestamp - OTP_WINDOW_MS);
    if (recent.length && timestamp - new Date(recent[0].created_at).getTime() < OTP_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_COOLDOWN_MS - (timestamp - new Date(recent[0].created_at).getTime())) / 1000);
      return jsonResponse({ success: false, error: "Please wait before requesting another verification code.", waitSeconds }, 429);
    }
    if (rate.count >= OTP_MAX_REQUESTS_PER_HOUR) {
      return jsonResponse({ success: false, error: "Too many verification code requests. Please try again after 1 hour." }, 429);
    }

    let delivery;
    try {
      delivery = await providerRequest("/api/v1/integrations/foodza/otp/send", { mobileNumber: phone.clean10 });
    } catch (error) {
      console.error("[FoodZa Auth] YouPI OTP send failed:", error.message);
      return jsonResponse({
        success: false,
        error: [400, 429].includes(error.status) ? error.message : "WhatsApp OTP delivery is temporarily unavailable.",
        ...(error.status ? { waitSeconds: error.waitSeconds } : {}),
      }, error.status === 429 ? 429 : error.status === 400 ? 400 : 502);
    }
    if (!delivery.success || delivery.phone !== phone.clean10) {
      return jsonResponse({ success: false, error: "WhatsApp OTP delivery was not confirmed." }, 502);
    }

    await repository.recordOtpRequest({
      phone: phone.formatted,
      dispatchId: delivery.dispatchId || null,
      createdAt: new Date(timestamp).toISOString(),
      expiresAt: new Date(timestamp + OTP_TTL_MS).toISOString(),
    });
    return jsonResponse({
      success: true,
      message: "Verification code sent to your WhatsApp number.",
      phone: phone.formatted,
      expiresInSeconds: delivery.expiresInSeconds || OTP_TTL_MS / 1000,
      waitSeconds: Math.ceil(OTP_COOLDOWN_MS / 1000),
    });
  }

  async function verifyOtp(req) {
    const body = await readJson(req);
    const phone = normalizeIndianPhone(body?.phone || body?.phoneNumber || body?.mobile);
    const otp = String(body?.otp || body?.code || "").trim();
    if (!phone || !/^\d{6}$/.test(otp)) {
      return jsonResponse({ success: false, error: "A valid phone number and 6-digit OTP are required." }, 400);
    }

    let verification;
    try {
      verification = await providerRequest("/api/v1/integrations/foodza/otp/verify", {
        mobileNumber: phone.clean10,
        otp,
      });
    } catch (error) {
      const status = [400, 404, 410, 429].includes(error.status) ? error.status : 502;
      return jsonResponse({
        success: false,
        error: status === 502 ? "WhatsApp verification service is temporarily unavailable." : error.message,
      }, status);
    }
    if (verification.success !== true || verification.phone !== phone.clean10) {
      return jsonResponse({ success: false, error: "OTP verification failed." }, 400);
    }

    const name = typeof body.name === "string" ? body.name.trim().slice(0, 255) : "";
    const user = await repository.findOrCreateUser(phone.formatted, name || null);
    const refreshToken = randomToken();
    const expiresAt = new Date(now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent") || null;
    await repository.createSession({
      userId: user.id,
      refreshToken,
      expiresAt,
      ipAddress,
      userAgent,
    });

    try {
      await repository.markLatestOtpVerified(phone.formatted);
    } catch (error) {
      console.error("[FoodZa Auth] Could not update OTP request audit status:", error.message);
    }

    const accessToken = await signAccessToken(user, jwtAccessSecret, now(), accessTokenTtlSeconds);
    const responseHeaders = authCookieHeaders(accessToken, refreshToken, secureCookies, accessTokenTtlSeconds);
    return jsonResponse({
      success: true,
      message: "Authentication successful.",
      user: userResponse(user),
      accessToken,
      expiresInSeconds: accessTokenTtlSeconds,
    }, 200, responseHeaders);
  }

  async function authenticatedUser(req) {
    const token = getAccessTokenFromRequest(req);
    const claims = await verifyAccessToken(token, jwtAccessSecret, now());
    if (!claims) return null;
    return repository.getUserById(claims.userId);
  }

  async function refresh(req) {
    const refreshToken = getCookie(req, "foodza_refresh_token");
    if (!refreshToken) return jsonResponse({ success: false, error: "Refresh token is required." }, 401);
    const session = await repository.findSession(refreshToken);
    if (!session || session.revoked || new Date(session.expires_at).getTime() <= now()) {
      return jsonResponse({ success: false, error: "Invalid, revoked, or expired refresh token. Please log in again." }, 401, authCookieHeaders("", "", secureCookies, accessTokenTtlSeconds, true));
    }
    const user = await repository.getUserById(session.user_id);
    if (!user) return jsonResponse({ success: false, error: "User account not found." }, 401, authCookieHeaders("", "", secureCookies, accessTokenTtlSeconds, true));
    const updated = await repository.revokeSession(session.id);
    if (!updated) return jsonResponse({ success: false, error: "Refresh token has already been used." }, 401, authCookieHeaders("", "", secureCookies, accessTokenTtlSeconds, true));

    const nextRefreshToken = randomToken();
    await repository.createSession({
      userId: user.id,
      refreshToken: nextRefreshToken,
      expiresAt: new Date(now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: req.headers.get("user-agent") || null,
    });
    const accessToken = await signAccessToken(user, jwtAccessSecret, now(), accessTokenTtlSeconds);
    return jsonResponse({
      success: true,
      accessToken,
      expiresInSeconds: accessTokenTtlSeconds,
      user: userResponse(user),
    }, 200, authCookieHeaders(accessToken, nextRefreshToken, secureCookies, accessTokenTtlSeconds));
  }

  async function logout(req) {
    const refreshToken = getCookie(req, "foodza_refresh_token");
    if (refreshToken) await repository.revokeRefreshToken(refreshToken);
    return jsonResponse({ success: true, message: "Logged out successfully." }, 200, authCookieHeaders("", "", secureCookies, accessTokenTtlSeconds, true));
  }

  async function getProfile(req) {
    const user = await authenticatedUser(req);
    if (!user) return jsonResponse({ success: false, error: "Authentication required." }, 401);
    const address = await repository.getDefaultAddress(user.id);
    return jsonResponse({ success: true, user: userResponse(user, address) });
  }

  async function updateProfile(req) {
    const user = await authenticatedUser(req);
    if (!user) return jsonResponse({ success: false, error: "Authentication required." }, 401);
    const body = await readJson(req);
    if (!body) return jsonResponse({ success: false, error: "A JSON request body is required." }, 400);
    if (body.phone && body.phone !== user.phone) {
      return jsonResponse({ success: false, error: "Phone number cannot be changed directly. Please verify the new number through WhatsApp OTP." }, 403);
    }
    const updated = await repository.updateProfile(user.id, {
      name: typeof body.name === "string" ? body.name.trim().slice(0, 255) : user.name,
      hostel_name: typeof (body.hostelName ?? body.hostel_name) === "string"
        ? String(body.hostelName ?? body.hostel_name).trim().slice(0, 255) : user.hostel_name,
      room_no: typeof (body.roomNo ?? body.room_no) === "string"
        ? String(body.roomNo ?? body.room_no).trim().slice(0, 50) : user.room_no,
      block: typeof body.block === "string" ? body.block.trim().slice(0, 50) : user.block,
      floor: typeof body.floor === "string" ? body.floor.trim().slice(0, 50) : user.floor,
      landmark: typeof body.landmark === "string" ? body.landmark.trim().slice(0, 255) : user.landmark,
    });
    return jsonResponse({ success: true, message: "Profile updated successfully.", user: userResponse(updated) });
  }

  async function getAddresses(req) {
    const user = await authenticatedUser(req);
    if (!user) return jsonResponse({ success: false, error: "Authentication required." }, 401);
    return jsonResponse({ success: true, addresses: await repository.listAddresses(user.id) });
  }

  async function createAddress(req) {
    const user = await authenticatedUser(req);
    if (!user) return jsonResponse({ success: false, error: "Authentication required." }, 401);
    const body = await readJson(req);
    if (!body) return jsonResponse({ success: false, error: "A JSON request body is required." }, 400);

    const hostelName = boundedString(body.hostelName ?? body.hostel_name, "", 255);
    const addressLine = boundedString(body.addressLine ?? body.address_line, "", 10_000);
    if (!hostelName && !addressLine) {
      return jsonResponse({ success: false, error: "Hostel or address details are required." }, 400);
    }

    const address = await repository.createAddress(user, {
      label: boundedString(body.label, "Hostel", 50),
      name: boundedString(body.name, user.name || "", 255),
      phone: boundedString(body.phone, user.phone || "", 20),
      hostel_name: hostelName,
      room_no: boundedString(body.roomNo ?? body.room_no, "", 50),
      block: boundedString(body.block, "", 50),
      floor: boundedString(body.floor, "", 50),
      address_line: addressLine,
      locality: boundedString(body.locality, "Campus", 255),
      city: boundedString(body.city, "Campus", 100),
      instructions: boundedString(body.instructions, "", 10_000),
      is_default: Boolean(body.isDefault ?? body.is_default),
    });
    return jsonResponse({ success: true, message: "Address saved successfully.", address }, 201);
  }

  async function updateAddress(req, addressId) {
    const user = await authenticatedUser(req);
    if (!user) return jsonResponse({ success: false, error: "Authentication required." }, 401);
    const body = await readJson(req);
    if (!body) return jsonResponse({ success: false, error: "A JSON request body is required." }, 400);
    const address = await repository.updateAddress(user.id, addressId, body);
    if (!address) return jsonResponse({ success: false, error: "Address not found or unauthorized to modify." }, 404);
    return jsonResponse({ success: true, message: "Address updated successfully.", address });
  }

  async function deleteAddress(req, addressId) {
    const user = await authenticatedUser(req);
    if (!user) return jsonResponse({ success: false, error: "Authentication required." }, 401);
    const deleted = await repository.deleteAddress(user.id, addressId);
    if (!deleted) return jsonResponse({ success: false, error: "Address not found or unauthorized to delete." }, 404);
    return jsonResponse({ success: true, message: "Address deleted successfully." });
  }

  async function setDefaultAddress(req, addressId) {
    const user = await authenticatedUser(req);
    if (!user) return jsonResponse({ success: false, error: "Authentication required." }, 401);
    const address = await repository.setDefaultAddress(user.id, addressId);
    if (!address) return jsonResponse({ success: false, error: "Address not found or unauthorized to modify." }, 404);
    return jsonResponse({ success: true, message: "Default address updated.", address });
  }

  return {
    sendOtp,
    verifyOtp,
    refresh,
    logout,
    getProfile,
    updateProfile,
    getAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  };
}

export function createSupabaseFoodZaAuthRepository(supabase) {
  function unwrap(result) {
    if (result.error) throw result.error;
    return result;
  }

  return {
    async getOtpRate(phone, since) {
      const result = unwrap(await supabase
        .from("otp_requests")
        .select("created_at", { count: "exact" })
        .eq("phone", phone)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(OTP_MAX_REQUESTS_PER_HOUR));
      return { requests: result.data || [], count: result.count || 0 };
    },

    async recordOtpRequest({ phone, dispatchId, createdAt, expiresAt }) {
      unwrap(await supabase.from("otp_requests").insert({
        phone,
        youpi_ref: dispatchId,
        status: "PENDING",
        attempts: 0,
        created_at: createdAt,
        expires_at: expiresAt,
      }));
    },

    async markLatestOtpVerified(phone) {
      const selected = unwrap(await supabase
        .from("otp_requests")
        .select("id")
        .eq("phone", phone)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle());
      if (!selected.data) return;
      unwrap(await supabase
        .from("otp_requests")
        .update({ status: "VERIFIED" })
        .eq("id", selected.data.id));
    },

    async findOrCreateUser(phone, name) {
      const columns = "id,phone,name,role,is_phone_verified,hostel_name,room_no,block,floor,landmark,created_at,updated_at";
      const existing = unwrap(await supabase.from("users").select(columns).eq("phone", phone).maybeSingle());
      if (existing.data) {
        const updated = unwrap(await supabase
          .from("users")
          .update({
            is_phone_verified: true,
            ...(name ? { name } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.data.id)
          .select(columns)
          .single());
        return updated.data;
      }

      const inserted = await supabase.from("users").insert({
        phone,
        name: name || "FoodZa Customer",
        role: "CUSTOMER",
        is_phone_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).select(columns).single();
      if (!inserted.error) return inserted.data;
      if (inserted.error.code !== "23505") throw inserted.error;

      const raced = unwrap(await supabase.from("users").select(columns).eq("phone", phone).single());
      const updated = unwrap(await supabase
        .from("users")
        .update({
          is_phone_verified: true,
          ...(name ? { name } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", raced.data.id)
        .select(columns)
        .single());
      return updated.data;
    },

    async createSession(session) {
      unwrap(await supabase.from("sessions").insert({
        user_id: session.userId,
        refresh_token: session.refreshToken,
        expires_at: session.expiresAt,
        revoked: false,
        ip_address: session.ipAddress,
        user_agent: session.userAgent,
      }));
    },

    async findSession(refreshToken) {
      const result = unwrap(await supabase
        .from("sessions")
        .select("id,user_id,expires_at,revoked")
        .eq("refresh_token", refreshToken)
        .maybeSingle());
      return result.data;
    },

    async revokeSession(id) {
      const result = unwrap(await supabase
        .from("sessions")
        .update({ revoked: true })
        .eq("id", id)
        .eq("revoked", false)
        .select("id")
        .maybeSingle());
      return Boolean(result.data);
    },

    async revokeRefreshToken(refreshToken) {
      unwrap(await supabase
        .from("sessions")
        .update({ revoked: true })
        .eq("refresh_token", refreshToken)
        .eq("revoked", false));
    },

    async getUserById(userId) {
      const result = unwrap(await supabase
        .from("users")
        .select("id,phone,name,role,is_phone_verified,hostel_name,room_no,block,floor,landmark,created_at,updated_at")
        .eq("id", userId)
        .maybeSingle());
      return result.data;
    },

    async getDefaultAddress(userId) {
      const result = unwrap(await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userId)
        .eq("is_default", true)
        .limit(1)
        .maybeSingle());
      return result.data;
    },

    async listAddresses(userId) {
      const result = unwrap(await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false }));
      return result.data || [];
    },

    async createAddress(user, address) {
      const count = unwrap(await supabase
        .from("addresses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id));
      const isDefault = count.count === 0 || address.is_default;
      if (isDefault) {
        unwrap(await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id));
      }
      const inserted = unwrap(await supabase
        .from("addresses")
        .insert({ ...address, user_id: user.id, is_default: isDefault })
        .select("*")
        .single());

      if (!user.hostel_name && address.hostel_name) {
        unwrap(await supabase.from("users")
          .update({
            hostel_name: address.hostel_name,
            room_no: address.room_no,
            block: address.block,
            floor: address.floor,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id));
      }
      return inserted.data;
    },

    async updateAddress(userId, addressId, body) {
      const existing = unwrap(await supabase.from("addresses")
        .select("*")
        .eq("id", addressId)
        .eq("user_id", userId)
        .maybeSingle());
      if (!existing.data) return null;
      const current = existing.data;
      const field = (camel, snake, currentValue, maxLength) => {
        const value = body[camel] ?? body[snake];
        return value === undefined ? currentValue : boundedString(value, currentValue || "", maxLength);
      };
      const isDefault = body.isDefault ?? body.is_default ?? current.is_default;
      if (isDefault && !current.is_default) {
        unwrap(await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId));
      }
      const updated = unwrap(await supabase.from("addresses")
        .update({
          label: field("label", "label", current.label, 50),
          name: field("name", "name", current.name, 255),
          phone: field("phone", "phone", current.phone, 20),
          hostel_name: field("hostelName", "hostel_name", current.hostel_name, 255),
          room_no: field("roomNo", "room_no", current.room_no, 50),
          block: field("block", "block", current.block, 50),
          floor: field("floor", "floor", current.floor, 50),
          address_line: field("addressLine", "address_line", current.address_line, 10_000),
          locality: field("locality", "locality", current.locality, 255),
          city: field("city", "city", current.city, 100),
          instructions: field("instructions", "instructions", current.instructions, 10_000),
          is_default: Boolean(isDefault),
          updated_at: new Date().toISOString(),
        })
        .eq("id", addressId)
        .eq("user_id", userId)
        .select("*")
        .single());
      return updated.data;
    },

    async deleteAddress(userId, addressId) {
      const existing = unwrap(await supabase.from("addresses")
        .select("id,is_default")
        .eq("id", addressId)
        .eq("user_id", userId)
        .maybeSingle());
      if (!existing.data) return false;
      unwrap(await supabase.from("addresses").delete().eq("id", addressId).eq("user_id", userId));
      if (existing.data.is_default) {
        const newest = unwrap(await supabase.from("addresses")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle());
        if (newest.data) {
          unwrap(await supabase.from("addresses")
            .update({ is_default: true })
            .eq("id", newest.data.id)
            .eq("user_id", userId));
        }
      }
      return true;
    },

    async setDefaultAddress(userId, addressId) {
      const existing = unwrap(await supabase.from("addresses")
        .select("id")
        .eq("id", addressId)
        .eq("user_id", userId)
        .maybeSingle());
      if (!existing.data) return null;
      unwrap(await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId));
      const updated = unwrap(await supabase.from("addresses")
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq("id", addressId)
        .eq("user_id", userId)
        .select("*")
        .single());
      return updated.data;
    },

    async updateProfile(userId, profile) {
      const result = unwrap(await supabase
        .from("users")
        .update({ ...profile, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select("id,phone,name,role,is_phone_verified,hostel_name,room_no,block,floor,landmark,created_at,updated_at")
        .single());
      return result.data;
    },
  };
}

export { jsonResponse };

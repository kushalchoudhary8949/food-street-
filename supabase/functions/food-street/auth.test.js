import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createFoodZaAuthHandlers, stripFoodStreetFunctionPrefix } from "./auth.js";

const NOW = Date.parse("2026-03-28T12:00:00.000Z");
const SECRET = "foodza-test-jwt-secret-at-least-32-bytes";
const PHONE = "9123456789";

function createHarness({
  providerResponse = { status: 200, body: { success: true, phone: PHONE, dispatchId: "dispatch-1" } },
  providerError,
  existingUser,
  now = NOW,
} = {}) {
  const records = {
    otpRequests: [],
    sessions: [],
    users: existingUser ? [{ ...existingUser }] : [],
    providerCalls: [],
  };
  let nextId = 1;
  const repository = {
    async getOtpRate(phone, since) {
      const recent = records.otpRequests
        .filter((entry) => entry.phone === phone && entry.created_at >= since)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return { requests: recent, count: recent.length };
    },
    async recordOtpRequest(request) {
      records.otpRequests.push({ id: String(nextId++), status: "PENDING", ...request });
    },
    async markLatestOtpVerified(phone) {
      const request = records.otpRequests.find((entry) => entry.phone === phone && entry.status === "PENDING");
      if (request) request.status = "VERIFIED";
    },
    async findOrCreateUser(phone, name) {
      let user = records.users.find((entry) => entry.phone === phone);
      if (!user) {
        user = {
          id: "foodza-user-1",
          phone,
          name: name || "FoodZa Customer",
          role: "CUSTOMER",
          is_phone_verified: true,
        };
        records.users.push(user);
      } else {
        if (name) user.name = name;
        user.is_phone_verified = true;
      }
      return { ...user };
    },
    async createSession(session) {
      records.sessions.push({ id: String(nextId++), revoked: false, ...session });
    },
    async findSession(token) {
      return records.sessions.find((session) => session.refreshToken === token) || null;
    },
    async revokeSession(id) {
      const session = records.sessions.find((entry) => entry.id === id && !entry.revoked);
      if (!session) return false;
      session.revoked = true;
      return true;
    },
    async revokeRefreshToken(token) {
      const session = records.sessions.find((entry) => entry.refreshToken === token);
      if (session) session.revoked = true;
    },
    async getUserById(id) {
      return records.users.find((user) => user.id === id) || null;
    },
    async getDefaultAddress() {
      return null;
    },
    async updateProfile() {
      throw new Error("Not implemented in test harness");
    },
  };

  const handlers = createFoodZaAuthHandlers({
    repository,
    youpiApiUrl: "https://youpi.example",
    sharedSecret: "foodza-integration-test-secret",
    jwtAccessSecret: SECRET,
    accessTokenTtlSeconds: 900,
    secureCookies: true,
    now: () => now,
    fetcher: async (url, options) => {
      records.providerCalls.push({ url: String(url), options });
      if (providerError) throw providerError;
      return new Response(JSON.stringify(providerResponse.body), {
        status: providerResponse.status,
        headers: { "content-type": "application/json" },
      });
    },
  });
  return { handlers, records };
}

function request(path, body, headers = {}) {
  return new Request(`https://foodza.example${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("send OTP uses YouPI's authenticated HTTPS delivery endpoint and records the request", async () => {
  const { handlers, records } = createHarness();
  const response = await handlers.sendOtp(request("/v1/auth/whatsapp/send-otp", { phone: PHONE }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(records.providerCalls[0].url, "https://youpi.example/api/v1/integrations/foodza/otp/send");
  assert.equal(records.providerCalls[0].options.headers.Authorization, "Bearer foodza-integration-test-secret");
  assert.deepEqual(JSON.parse(records.providerCalls[0].options.body), { mobileNumber: PHONE });
  assert.equal(records.otpRequests.length, 1);
  assert.equal(records.otpRequests[0].expiresAt, new Date(NOW + 5 * 60 * 1000).toISOString());
});

test("send OTP rejects invalid numbers, rate limits requests, and surfaces delivery failures", async () => {
  const invalid = createHarness();
  assert.equal((await invalid.handlers.sendOtp(request("/send", { phone: "123" }))).status, 400);
  assert.equal(invalid.records.providerCalls.length, 0);

  const failed = createHarness({ providerResponse: { status: 503, body: { error: "unavailable" } } });
  assert.equal((await failed.handlers.sendOtp(request("/send", { phone: PHONE }))).status, 502);
  assert.equal(failed.records.otpRequests.length, 0);

  const limited = createHarness();
  limited.records.otpRequests.push({
    phone: `+91${PHONE}`,
    created_at: new Date(NOW - 1_000).toISOString(),
  });
  assert.equal((await limited.handlers.sendOtp(request("/send", { phone: PHONE }))).status, 429);
  assert.equal(limited.records.providerCalls.length, 0);
});

test("valid OTP creates/retrieves only a FoodZa user and issues FoodZa session tokens", async () => {
  const { handlers, records } = createHarness();
  const response = await handlers.verifyOtp(request("/verify", {
    phone: `+91${PHONE}`,
    otp: "123456",
    name: "FoodZa Customer",
  }, { "user-agent": "test-client", "x-forwarded-for": "203.0.113.1" }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.user.phone, `+91${PHONE}`);
  assert.equal(payload.user.role, "CUSTOMER");
  assert.equal(records.users.length, 1);
  assert.equal(records.sessions.length, 1);
  assert.equal(records.sessions[0].userId, "foodza-user-1");
  assert.equal(records.sessions[0].ipAddress, "203.0.113.1");
  assert.equal(records.providerCalls[0].url, "https://youpi.example/api/v1/integrations/foodza/otp/verify");
  assert.equal(JSON.parse(records.providerCalls[0].options.body).otp, "123456");
  assert.match(response.headers.getSetCookie().join(";"), /HttpOnly/);
  assert.match(response.headers.getSetCookie().join(";"), /Secure/);
  assert.equal(records.otpRequests.length, 0);

  const profileResponse = await handlers.getProfile(new Request("https://foodza.example/v1/users/me", {
    headers: { "x-foodza-access-token": payload.accessToken },
  }));
  assert.equal(profileResponse.status, 200);
  assert.equal((await profileResponse.json()).user.id, "foodza-user-1");

  const priorFoodZaUser = {
    id: "existing-foodza-user",
    phone: `+91${PHONE}`,
    name: "FoodZa Admin",
    role: "ADMIN",
    is_phone_verified: false,
  };
  const existing = createHarness({ existingUser: priorFoodZaUser });
  const existingResponse = await existing.handlers.verifyOtp(request("/verify", { phone: PHONE, otp: "123456" }));
  const existingPayload = await existingResponse.json();
  assert.equal(existingPayload.user.role, "ADMIN");
  assert.equal(existing.records.users.length, 1);
});

test("invalid, expired, and unavailable OTP verification never creates a FoodZa session", async () => {
  for (const status of [400, 410, 429, 503]) {
    const harness = createHarness({
      providerResponse: {
        status,
        body: { success: false, error: status === 410 ? "OTP expired." : "OTP invalid." },
      },
    });
    const response = await harness.handlers.verifyOtp(request("/verify", { phone: PHONE, otp: "000000" }));
    assert.equal(response.status, status === 503 ? 502 : status);
    assert.equal(harness.records.users.length, 0);
    assert.equal(harness.records.sessions.length, 0);
  }

  const unavailable = createHarness({ providerError: new Error("network down") });
  const failedResponse = await unavailable.handlers.verifyOtp(request("/verify", { phone: PHONE, otp: "123456" }));
  assert.equal(failedResponse.status, 502);
  assert.equal(unavailable.records.sessions.length, 0);
});

test("Vercel forwards same-origin API paths to the Food Street Edge Function", async () => {
  const config = JSON.parse(await readFile(new URL("../../../vercel.json", import.meta.url), "utf8"));
  const apiRewrite = config.rewrites.find((rewrite) => rewrite.source === "/api/(.*)");
  assert.equal(
    apiRewrite.destination,
    "https://pdteqhpihbgxcsyrxdgj.supabase.co/functions/v1/food-street/$1",
  );
  assert.equal(apiRewrite.destination.endsWith("/$1"), true);
});

test("Edge Function route matching accepts Supabase gateway path formats", () => {
  assert.equal(stripFoodStreetFunctionPrefix("/functions/v1/food-street/v1/auth/refresh"), "/v1/auth/refresh");
  assert.equal(stripFoodStreetFunctionPrefix("/food-street/v1/orders"), "/v1/orders");
  assert.equal(stripFoodStreetFunctionPrefix("/v1/addresses"), "/v1/addresses");
});

test("an invalid shared secret rejected by YouPI cannot create a FoodZa session", async () => {
  const invalidSecret = createHarness({
    providerResponse: { status: 401, body: { success: false, error: "Unauthorized." } },
  });
  const response = await invalidSecret.handlers.verifyOtp(request("/verify", { phone: PHONE, otp: "123456" }));
  assert.equal(response.status, 502);
  assert.equal(invalidSecret.records.users.length, 0);
  assert.equal(invalidSecret.records.sessions.length, 0);
});

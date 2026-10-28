import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findOrCreateFoodZaUser,
  sendOtpViaYouPi,
  verifyOtpViaYouPi
} from '../src/backend/auth.js';

const originalEnv = {
  nodeEnv: process.env.NODE_ENV,
  youpiUrl: process.env.YOUPI_API_URL,
  integrationSecret: process.env.FOODZA_OTP_API_SECRET
};

test.before(() => {
  process.env.NODE_ENV = 'test';
  process.env.YOUPI_API_URL = 'http://127.0.0.1:6100';
  process.env.FOODZA_OTP_API_SECRET = 'test-foodza-secret';
});

test.after(() => {
  if (originalEnv.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnv.nodeEnv;
  if (originalEnv.youpiUrl === undefined) delete process.env.YOUPI_API_URL;
  else process.env.YOUPI_API_URL = originalEnv.youpiUrl;
  if (originalEnv.integrationSecret === undefined) delete process.env.FOODZA_OTP_API_SECRET;
  else process.env.FOODZA_OTP_API_SECRET = originalEnv.integrationSecret;
});

test('sendOtpViaYouPi calls the authenticated FoodZa send endpoint', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:6100/api/v1/integrations/foodza/otp/send');
    assert.equal(options.headers.Authorization, 'Bearer test-foodza-secret');
    assert.deepEqual(JSON.parse(options.body), { mobileNumber: '9123456789', name: 'Customer' });
    return new Response(JSON.stringify({ success: true, dispatchId: 'message-1', expiresInSeconds: 300 }), { status: 200 });
  };

  const result = await sendOtpViaYouPi('9123456789', 'Customer');
  assert.equal(result.success, true);
  assert.equal(result.dispatchId, 'message-1');
});

test('verifyOtpViaYouPi returns verified status and surfaces provider failures', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let responseStatus = 200;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:6100/api/v1/integrations/foodza/otp/verify');
    assert.equal(options.headers.Authorization, 'Bearer test-foodza-secret');
    const requestBody = JSON.parse(options.body);
    assert.equal(requestBody.mobileNumber, '9123456789');
    assert.equal(requestBody.otp, responseStatus === 200 ? '123456' : '000000');
    return responseStatus === 200
      ? new Response(JSON.stringify({ success: true, phone: '9123456789' }), { status: 200 })
      : new Response(JSON.stringify({ success: false, error: 'Invalid verification code.' }), { status: responseStatus });
  };

  assert.equal((await verifyOtpViaYouPi('9123456789', '123456')).success, true);
  responseStatus = 400;
  await assert.rejects(verifyOtpViaYouPi('9123456789', '000000'), (error) => {
    assert.equal(error.status, 400);
    assert.match(error.message, /Invalid verification code/);
    return true;
  });
});

test('FoodZa account creation defaults to CUSTOMER and never imports a YouPI role', async () => {
  const calls = [];
  const executeQuery = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.startsWith('SELECT')) return { rows: [] };
    return {
      rows: [{
        id: 'foodza-user-id',
        phone: params[0],
        name: params[1],
        role: 'CUSTOMER',
        is_phone_verified: true
      }]
    };
  };

  const user = await findOrCreateFoodZaUser('+919123456789', 'FoodZa Customer', executeQuery);
  assert.equal(user.role, 'CUSTOMER');
  assert.equal(user.phone, '+919123456789');
  assert.equal(calls.length, 2);
  assert.match(calls[1].sql, /'CUSTOMER'/);
});

test('FoodZa account retrieval preserves its existing role', async () => {
  const executeQuery = async (sql) => ({
    rows: sql.startsWith('SELECT')
      ? [{ id: 'foodza-admin-id', phone: '+919123456789', name: 'Existing', role: 'ADMIN' }]
      : [{ id: 'foodza-admin-id', phone: '+919123456789', name: 'Updated', role: 'ADMIN' }]
  });

  const user = await findOrCreateFoodZaUser('+919123456789', 'Updated', executeQuery);
  assert.equal(user.role, 'ADMIN');
});

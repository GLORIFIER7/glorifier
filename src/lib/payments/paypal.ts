import crypto from 'node:crypto';
const PAYPAL_BASE = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

function credentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('PayPal credentials are not configured');
  return { clientId, clientSecret };
}

export async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret } = credentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) throw new Error(`PayPal OAuth failed: ${response.status}`);
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error('PayPal did not return an access token');
  return data.access_token;
}

export async function createPayPalOrder(amount: string, currency = 'USD', referenceId?: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
    throw new Error('Invalid PayPal amount');
  }
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Invalid currency');

  const token = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': referenceId || crypto.randomUUID(),
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: currency, value: amount } }],
    }),
  });
  if (!response.ok) throw new Error(`PayPal order creation failed: ${response.status}`);
  return response.json();
}

export async function capturePayPalOrder(orderId: string) {
  if (!/^[A-Z0-9-]+$/i.test(orderId)) throw new Error('Invalid PayPal order ID');
  const token = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`PayPal capture failed: ${response.status}`);
  return response.json();
}

export function paypalEnvironment() {
  return process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
}

import { describe, it, expect } from 'vitest';
import { handleCheckout } from '../paymentController';

describe('PaymentController', () => {
  it('should process regular checkout with valid metadata', async () => {
    let responseData: any = null;
    const req = {
      body: {
        amount: 4900,
        currency: 'usd',
        customerId: 'cus_9941a',
        metadata: { billingDetails: { postalCode: '94103' } }
      }
    };
    const res = { status: () => ({ json: (d: any) => { responseData = d; } }) };

    await handleCheckout(req, res);
    expect(responseData.success).toBe(true);
    expect(responseData.zip).toBe('94103');
  });

  // Reproduction Test: Client transmits null or undefined metadata
  it('fails when client transmits null or empty metadata', async () => {
    const req = {
      body: {
        amount: 2500,
        currency: 'usd',
        customerId: 'cus_empty'
        // metadata is omitted
      }
    };
    const res = { status: () => ({ json: (d: any) => d }) };

    // This will throw TypeError: Cannot read properties of undefined (reading 'billingDetails')
    await expect(handleCheckout(req as any, res)).rejects.toThrow();
  });
});

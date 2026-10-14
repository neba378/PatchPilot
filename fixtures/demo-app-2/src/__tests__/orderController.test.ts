import { describe, it, expect } from 'vitest';
import { handleCreateOrder } from '../orderController';

describe('OrderController', () => {
  it('should process order when valid discount is provided', async () => {
    let responseData: any = null;
    const req = {
      body: {
        orderId: 'ord_1001',
        customerId: 'cus_9941a',
        items: [{ sku: 'SKU_SHIRT', quantity: 2, price: 25 }],
        discount: { code: 'SAVE10', percentage: 10 }
      }
    };
    const res = {
      status: (code: number) => ({
        json: (d: any) => { responseData = { code, ...d }; }
      })
    };

    await handleCreateOrder(req, res);
    expect(responseData.success).toBe(true);
    expect(responseData.total).toBe(45);
  });

  // Reproduction Test: Client creates order without discount
  it('should process order successfully when discount is omitted', async () => {
    let responseData: any = null;
    const req = {
      body: {
        orderId: 'ord_1002',
        customerId: 'cus_9942b',
        items: [{ sku: 'SKU_PANTS', quantity: 1, price: 60 }]
        // discount is omitted
      }
    };
    const res = {
      status: (code: number) => ({
        json: (d: any) => { responseData = { code, ...d }; }
      })
    };

    // Defect: This throws TypeError: Cannot read properties of undefined (reading 'percentage')
    await handleCreateOrder(req as any, res);
    expect(responseData.success).toBe(true);
    expect(responseData.total).toBe(60);
  });
});

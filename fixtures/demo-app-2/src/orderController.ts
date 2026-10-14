export interface OrderItem {
  sku: string;
  quantity: number;
  price: number;
}

export interface OrderRequest {
  orderId: string;
  customerId: string;
  items: OrderItem[];
  discount?: {
    code?: string;
    percentage?: number;
  };
  shippingAddress?: {
    street?: string;
    city?: string;
    postalCode?: string;
  };
}

export async function handleCreateOrder(req: { body: OrderRequest }, res: any) {
  try {
    const { orderId, customerId, items, discount } = req.body;

    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

    // Defect: Unsafe cast assuming discount is always an object, throws TypeError when client sends null or undefined
    const discountAmount = (subtotal * (discount as any).percentage) / 100;
    const finalTotal = subtotal - discountAmount;

    return res.status(201).json({
      success: true,
      orderId,
      customerId,
      subtotal,
      discountAmount,
      total: finalTotal
    });
  } catch (error: any) {
    throw error;
  }
}

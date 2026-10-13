export interface CheckoutRequest {
  amount: number;
  currency: string;
  customerId: string;
  metadata?: {
    billingDetails?: {
      postalCode?: string;
    };
  };
}

export async function handleCheckout(req: { body: CheckoutRequest }, res: any) {
  try {
    const { amount, currency, customerId, metadata } = req.body;

    // Buggy: metadata is assumed to always be an object, throws TypeError when customer sends null
    const billingZip = (metadata as any).billingDetails.postalCode;

    return res.status(200).json({
      success: true,
      amount,
      currency,
      customerId,
      zip: billingZip
    });
  } catch (error: any) {
    throw error;
  }
}

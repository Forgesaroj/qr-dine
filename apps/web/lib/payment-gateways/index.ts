// Payment Gateway Integration
// Supports: eSewa, Khalti, Fonepay
// Sandbox Mode: Toggle between test and production environments

export interface PaymentInitiateRequest {
  amount: number;
  billId: string;
  billNumber: string;
  restaurantId: string;
  restaurantName: string;
  customerName?: string;
  customerPhone?: string;
  sandboxMode?: boolean; // Override global sandbox setting
}

export interface PaymentVerifyRequest {
  gateway: "ESEWA" | "KHALTI" | "FONEPAY";
  transactionId: string;
  billId: string;
  amount: number;
  data?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  message: string;
  data?: Record<string, unknown>;
  sandboxMode?: boolean;
}

export interface PaymentGatewayConfig {
  sandboxMode: boolean;
  esewa: {
    enabled: boolean;
    merchantId: string;
    secretKey: string;
  };
  khalti: {
    enabled: boolean;
    publicKey: string;
    secretKey: string;
  };
  fonepay: {
    enabled: boolean;
    merchantCode: string;
    secretKey: string;
  };
}

// Default config from environment variables
const DEFAULT_CONFIG: PaymentGatewayConfig = {
  // SANDBOX MODE: Set to true for testing, false for production
  sandboxMode: process.env.PAYMENT_SANDBOX_MODE === "true" || process.env.NODE_ENV !== "production",
  esewa: {
    enabled: !!process.env.ESEWA_MERCHANT_ID,
    merchantId: process.env.ESEWA_MERCHANT_ID || "",
    secretKey: process.env.ESEWA_SECRET_KEY || "",
  },
  khalti: {
    enabled: !!process.env.KHALTI_SECRET_KEY,
    publicKey: process.env.KHALTI_PUBLIC_KEY || "",
    secretKey: process.env.KHALTI_SECRET_KEY || "",
  },
  fonepay: {
    enabled: !!process.env.FONEPAY_MERCHANT_CODE,
    merchantCode: process.env.FONEPAY_MERCHANT_CODE || "",
    secretKey: process.env.FONEPAY_SECRET_KEY || "",
  },
};

// Get current config (can be overridden by restaurant settings)
let currentConfig = { ...DEFAULT_CONFIG };

export const setPaymentConfig = (config: Partial<PaymentGatewayConfig>) => {
  currentConfig = { ...currentConfig, ...config };
};

export const getPaymentConfig = (): PaymentGatewayConfig => currentConfig;

export const isSandboxMode = (): boolean => currentConfig.sandboxMode;

export const setSandboxMode = (enabled: boolean) => {
  currentConfig.sandboxMode = enabled;
};

// API URLs based on sandbox mode
const getEsewaUrl = (sandbox?: boolean) => {
  const useSandbox = sandbox ?? currentConfig.sandboxMode;
  return useSandbox
    ? "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
    : "https://epay.esewa.com.np/api/epay/main/v2/form";
};

const getKhaltiUrl = (sandbox?: boolean) => {
  const useSandbox = sandbox ?? currentConfig.sandboxMode;
  return useSandbox
    ? "https://a.khalti.com/api/v2"
    : "https://khalti.com/api/v2";
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Get available payment methods based on config
export const getAvailableGateways = () => {
  return {
    esewa: currentConfig.esewa.enabled,
    khalti: currentConfig.khalti.enabled,
    fonepay: currentConfig.fonepay.enabled,
    sandboxMode: currentConfig.sandboxMode,
  };
};

// eSewa Integration
export const esewa = {
  // Check if eSewa is enabled
  isEnabled: () => currentConfig.esewa.enabled,

  // Generate payment form data for eSewa
  initiate: (request: PaymentInitiateRequest): Record<string, string> => {
    const { amount, billId, restaurantId, sandboxMode } = request;
    const config = currentConfig.esewa;
    const useSandbox = sandboxMode ?? currentConfig.sandboxMode;

    // Generate signature for eSewa v2
    const message = `total_amount=${amount},transaction_uuid=${billId},product_code=${config.merchantId}`;
    const crypto = require("crypto");
    const signature = crypto
      .createHmac("sha256", config.secretKey)
      .update(message)
      .digest("base64");

    return {
      amount: amount.toString(),
      tax_amount: "0",
      total_amount: amount.toString(),
      transaction_uuid: billId,
      product_code: config.merchantId,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: `${APP_URL}/api/payments/esewa/success?billId=${billId}&restaurant=${restaurantId}&sandbox=${useSandbox}`,
      failure_url: `${APP_URL}/api/payments/esewa/failure?billId=${billId}&restaurant=${restaurantId}&sandbox=${useSandbox}`,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature,
    };
  },

  // Verify eSewa payment
  verify: async (data: Record<string, string>): Promise<PaymentResult> => {
    try {
      const config = currentConfig.esewa;

      // Decode base64 response from eSewa
      const decodedData = JSON.parse(
        Buffer.from(data.data || "", "base64").toString("utf-8")
      );

      const {
        transaction_code,
        status,
        total_amount,
        transaction_uuid,
        signed_field_names,
        signature,
      } = decodedData;

      // Verify signature
      const crypto = require("crypto");
      const message = signed_field_names
        .split(",")
        .map((field: string) => `${field}=${decodedData[field]}`)
        .join(",");

      const expectedSignature = crypto
        .createHmac("sha256", config.secretKey)
        .update(message)
        .digest("base64");

      if (signature !== expectedSignature) {
        return {
          success: false,
          message: "Invalid signature - payment verification failed",
          sandboxMode: currentConfig.sandboxMode,
        };
      }

      if (status !== "COMPLETE") {
        return {
          success: false,
          message: `Payment status: ${status}`,
          sandboxMode: currentConfig.sandboxMode,
        };
      }

      return {
        success: true,
        transactionId: transaction_code,
        message: "Payment verified successfully",
        sandboxMode: currentConfig.sandboxMode,
        data: {
          amount: parseFloat(total_amount),
          billId: transaction_uuid,
          gateway: "ESEWA",
        },
      };
    } catch (error) {
      console.error("eSewa verification error:", error);
      return {
        success: false,
        message: "Failed to verify eSewa payment",
        sandboxMode: currentConfig.sandboxMode,
      };
    }
  },

  getFormUrl: (sandbox?: boolean) => getEsewaUrl(sandbox),
};

// Khalti Integration
export const khalti = {
  // Check if Khalti is enabled
  isEnabled: () => currentConfig.khalti.enabled,

  // Initiate Khalti payment
  initiate: async (request: PaymentInitiateRequest): Promise<PaymentResult> => {
    try {
      const { amount, billId, billNumber, restaurantId, restaurantName, customerName, customerPhone, sandboxMode } = request;
      const config = currentConfig.khalti;
      const useSandbox = sandboxMode ?? currentConfig.sandboxMode;
      const apiUrl = getKhaltiUrl(useSandbox);

      const response = await fetch(`${apiUrl}/epayment/initiate/`, {
        method: "POST",
        headers: {
          Authorization: `Key ${config.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          return_url: `${APP_URL}/api/payments/khalti/verify?billId=${billId}&restaurant=${restaurantId}&sandbox=${useSandbox}`,
          website_url: APP_URL,
          amount: amount * 100, // Khalti uses paisa
          purchase_order_id: billId,
          purchase_order_name: `Bill #${billNumber} - ${restaurantName}`,
          customer_info: {
            name: customerName || "Guest",
            phone: customerPhone || "",
          },
        }),
      });

      const data = await response.json();

      if (data.payment_url) {
        return {
          success: true,
          transactionId: data.pidx,
          message: "Payment initiated",
          sandboxMode: useSandbox,
          data: {
            paymentUrl: data.payment_url,
            pidx: data.pidx,
          },
        };
      }

      return {
        success: false,
        message: data.detail || "Failed to initiate Khalti payment",
        sandboxMode: useSandbox,
      };
    } catch (error) {
      console.error("Khalti initiation error:", error);
      return {
        success: false,
        message: "Failed to initiate Khalti payment",
        sandboxMode: currentConfig.sandboxMode,
      };
    }
  },

  // Verify Khalti payment
  verify: async (pidx: string, sandbox?: boolean): Promise<PaymentResult> => {
    try {
      const config = currentConfig.khalti;
      const useSandbox = sandbox ?? currentConfig.sandboxMode;
      const apiUrl = getKhaltiUrl(useSandbox);

      const response = await fetch(`${apiUrl}/epayment/lookup/`, {
        method: "POST",
        headers: {
          Authorization: `Key ${config.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pidx }),
      });

      const data = await response.json();

      if (data.status === "Completed") {
        return {
          success: true,
          transactionId: data.transaction_id,
          message: "Payment verified successfully",
          sandboxMode: useSandbox,
          data: {
            amount: data.total_amount / 100, // Convert from paisa
            billId: data.purchase_order_id,
            gateway: "KHALTI",
            pidx,
          },
        };
      }

      return {
        success: false,
        message: `Payment status: ${data.status}`,
        sandboxMode: useSandbox,
      };
    } catch (error) {
      console.error("Khalti verification error:", error);
      return {
        success: false,
        message: "Failed to verify Khalti payment",
        sandboxMode: currentConfig.sandboxMode,
      };
    }
  },
};

// Fonepay Integration
export const fonepay = {
  // Generate Fonepay QR
  generateQR: async (request: PaymentInitiateRequest): Promise<PaymentResult> => {
    // Fonepay QR integration would go here
    // This is a placeholder - actual implementation depends on Fonepay API
    return {
      success: false,
      message: "Fonepay integration pending - contact support",
    };
  },

  verify: async (data: Record<string, string>): Promise<PaymentResult> => {
    return {
      success: false,
      message: "Fonepay verification pending",
    };
  },
};

// Generic QR payment verification
export const verifyPayment = async (
  gateway: string,
  data: Record<string, string>
): Promise<PaymentResult> => {
  switch (gateway.toUpperCase()) {
    case "ESEWA":
      return esewa.verify(data);
    case "KHALTI":
      return khalti.verify(data.pidx ?? "");
    case "FONEPAY":
      return fonepay.verify(data);
    default:
      return {
        success: false,
        message: `Unknown payment gateway: ${gateway}`,
      };
  }
};

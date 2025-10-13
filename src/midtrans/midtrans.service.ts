import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { PaymentMethod } from "@/common/enums/payment-method.enum";

type MidtransEnvironment = "sandbox" | "production";

type SnapTransactionPayload = {
  orderId: string;
  grossAmount: number;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
};

type MidtransConfig = {
  baseUrl: string;
  serverKey: string | undefined;
  clientKey: string | undefined;
};

type MidtransTransactionResult = {
  token: string;
  redirectUrl: string;
  environment: MidtransEnvironment;
};

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);

  private readonly sandbox: MidtransConfig = {
    baseUrl: process.env.MIDTRANS_BASE_URL_SANDBOX ?? "https://app.sandbox.midtrans.com",
    serverKey: process.env.MIDTRANS_SERVER_KEY_SANDBOX,
    clientKey: process.env.MIDTRANS_CLIENT_KEY_SANDBOX,
  };

  private readonly production: MidtransConfig = {
    baseUrl: process.env.MIDTRANS_BASE_URL_PRODUCTION ?? "https://app.midtrans.com",
    serverKey: process.env.MIDTRANS_SERVER_KEY_PRODUCTION,
    clientKey: process.env.MIDTRANS_CLIENT_KEY_PRODUCTION,
  };

  resolveEnvironment(method: PaymentMethod): MidtransEnvironment | null {
    if (method === "midtrans_sandbox") {
      return "sandbox";
    }
    if (method === "midtrans_production") {
      return "production";
    }
    return null;
  }

  getClientKeys() {
    return {
      sandboxClientKey: this.sandbox.clientKey ?? null,
      productionClientKey: this.production.clientKey ?? null,
    };
  }

  private getConfig(env: MidtransEnvironment): MidtransConfig {
    return env === "sandbox" ? this.sandbox : this.production;
  }

  isEnvironmentConfigured(env: MidtransEnvironment) {
    const config = this.getConfig(env);
    return Boolean(config.baseUrl && config.serverKey && config.clientKey);
  }

  async createSnapTransaction(
    environment: MidtransEnvironment,
    payload: SnapTransactionPayload
  ): Promise<MidtransTransactionResult> {
    const config = this.getConfig(environment);
    if (!config.serverKey) {
      throw new InternalServerErrorException("Midtrans server key is not configured.");
    }

    const requestBody = {
      transaction_details: {
        order_id: payload.orderId,
        gross_amount: Math.ceil(payload.grossAmount),
      },
      customer_details: {
        first_name: payload.customer.name,
        email: payload.customer.email,
        phone: payload.customer.phone,
      },
    };

    const endpoint = `${config.baseUrl.replace(/\/$/, "")}/snap/v1/transactions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${config.serverKey}:`).toString("base64")}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      this.logger.error(`Midtrans Snap API error: ${response.status} - ${errorPayload}`);
      throw new InternalServerErrorException("Failed to create Midtrans transaction.");
    }

    const data = (await response.json()) as { token: string; redirect_url: string };

    return {
      token: data.token,
      redirectUrl: data.redirect_url,
      environment,
    };
  }

  getSnapScriptUrl(environment: MidtransEnvironment) {
    return environment === "production"
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
  }
}

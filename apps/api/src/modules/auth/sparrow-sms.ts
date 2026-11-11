import { env } from "../../config/env.js";
import { AuthError, SmsDeliveryError } from "./errors.js";
import { toSparrowRecipient } from "./phone.js";
import type { SmsSender } from "./types.js";

const SPARROW_SMS_URL = "https://api.sparrowsms.com/v2/sms/";

type SparrowResponse = {
  response_code?: number;
  response?: string;
};

export class SparrowSmsSender implements SmsSender {
  constructor(
    private readonly configuration = {
      token: env.SPARROW_SMS_TOKEN,
      senderId: env.SPARROW_SMS_SENDER_ID
    },
    private readonly fetcher: typeof fetch = fetch
  ) {}

  get configured(): boolean {
    return Boolean(this.configuration.token && this.configuration.senderId);
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const { token, senderId } = this.configuration;
    if (!token || !senderId) {
      throw new AuthError("SMS delivery is not configured.", 503, "SMS_NOT_CONFIGURED");
    }

    const body = new URLSearchParams({
      token,
      from: senderId,
      to: toSparrowRecipient(phone),
      text: `Amatya Traders verification code: ${code}. It expires in 5 minutes. Do not share it.`
    });

    let response: Response;
    try {
      response = await this.fetcher(SPARROW_SMS_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(8000)
      });
    } catch (error) {
      throw new SmsDeliveryError("SMS provider request failed.", { cause: error });
    }

    let result: SparrowResponse;
    try {
      result = (await response.json()) as SparrowResponse;
    } catch (error) {
      throw new SmsDeliveryError("SMS provider returned an invalid response.", { cause: error });
    }

    if (!response.ok || result.response_code !== 200) {
      throw new SmsDeliveryError("SMS provider rejected the message.");
    }
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class SmsDeliveryError extends Error {
  constructor(message = "SMS could not be sent.", options?: ErrorOptions) {
    super(message, options);
    this.name = "SmsDeliveryError";
  }
}

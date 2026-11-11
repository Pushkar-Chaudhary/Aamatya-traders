import { parsePhoneNumberFromString } from "libphonenumber-js";

export class InvalidPhoneNumberError extends Error {
  constructor() {
    super("Enter a valid Nepal mobile number.");
    this.name = "InvalidPhoneNumberError";
  }
}

export function normalizeNepalPhone(input: string): string {
  const parsed = parsePhoneNumberFromString(input.trim(), "NP");

  if (
    !parsed ||
    !parsed.isValid() ||
    parsed.country !== "NP" ||
    parsed.nationalNumber.length !== 10 ||
    !parsed.nationalNumber.startsWith("9")
  ) {
    throw new InvalidPhoneNumberError();
  }

  return parsed.number;
}

export function toSparrowRecipient(e164Phone: string): string {
  const parsed = parsePhoneNumberFromString(e164Phone);

  if (!parsed || parsed.country !== "NP") {
    throw new InvalidPhoneNumberError();
  }

  return parsed.nationalNumber;
}

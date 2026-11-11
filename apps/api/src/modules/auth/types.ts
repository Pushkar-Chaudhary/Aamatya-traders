export const USER_ROLES = [
  "OWNER",
  "ADMIN",
  "ACCOUNTANT",
  "SALES",
  "WAREHOUSE",
  "DELIVERY",
  "RETAILER"
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = "ACTIVE" | "DISABLED";

export type PublicUser = {
  id: string;
  phone?: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  name?: string;
  businessName?: string;
  address?: string;
};

export type AuthContext = {
  user: PublicUser;
  sessionId: string;
  csrfToken: string;
};

export interface SmsSender {
  readonly configured: boolean;
  sendOtp(phone: string, code: string): Promise<void>;
}

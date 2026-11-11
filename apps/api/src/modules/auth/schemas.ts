import { z } from "zod";

export const loginWithPasswordSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or phone number"),
  password: z.string().min(1, "Enter your password")
});

export const registerBuyerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  phone: z.string().trim().min(7, "Enter a valid Nepal mobile number").max(20),
  password: z.string().min(6, "Password must be at least 6 characters"),
  businessName: z.string().trim().min(2, "Business or shop name is required").max(120),
  address: z.string().trim().max(200).optional(),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal(""))
});

export const requestOtpSchema = z.object({
  phone: z.string().trim().min(3).max(40)
});

export const verifyOtpSchema = z.object({
  phone: z.string().trim().min(3).max(40),
  code: z.string().regex(/^\d{6}$/)
});

export const createUserSchema = z.object({
  email: z.string().trim().email().optional(),
  password: z.string().min(6).optional(),
  phone: z.string().trim().min(3).max(40).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(["ADMIN", "ACCOUNTANT", "SALES", "WAREHOUSE", "DELIVERY", "RETAILER"])
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED"])
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  role: z.string().optional()
});

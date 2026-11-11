import { Router } from "express";
import { z } from "zod";
import { AuthError } from "../auth/errors.js";
import { authContext, requireAuth, requireCsrf, requireRoles, requireTrustedOrigin } from "../auth/middleware.js";
import { createOrder, listOrders, updateOrderStatus } from "./service.js";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.get("/", async (request, response) => {
  const auth = authContext(response);
  const status = typeof request.query.status === "string" ? request.query.status : undefined;
  const page = typeof request.query.page === "string" ? Number(request.query.page) : 1;
  const pageSize = typeof request.query.pageSize === "string" ? Number(request.query.pageSize) : 25;

  // Retailers only see their own orders
  const buyerId = auth.user.role === "RETAILER" ? auth.user.id : (typeof request.query.buyerId === "string" ? request.query.buyerId : undefined);

  response.json(await listOrders({ buyerId, status, page, pageSize }));
});

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1)
    })
  ).min(1),
  deliveryAddress: z.string().min(1),
  notes: z.string().optional()
});

ordersRouter.post("/", requireTrustedOrigin, requireCsrf, async (request, response) => {
  const parsed = createOrderSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AuthError("Order details are invalid. Provide valid items and delivery address.", 400, "INVALID_INPUT");
  }

  const auth = authContext(response);
  const order = await createOrder({
    buyerId: auth.user.id,
    items: parsed.data.items,
    deliveryAddress: parsed.data.deliveryAddress,
    notes: parsed.data.notes
  });

  response.status(201).json({ order });
});

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "DISPATCHED", "DELIVERED", "CANCELLED"])
});

ordersRouter.patch(
  "/:orderId/status",
  requireTrustedOrigin,
  requireCsrf,
  requireRoles("OWNER", "ADMIN", "SALES", "WAREHOUSE"),
  async (request, response) => {
    const parsed = updateStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AuthError("Invalid status value.", 400, "INVALID_INPUT");
    }

    const orderId = request.params.orderId;
    if (typeof orderId !== "string" || !/^[a-f\d]{24}$/i.test(orderId)) {
      throw new AuthError("Invalid order ID.", 400, "INVALID_INPUT");
    }

    const order = await updateOrderStatus(orderId, parsed.data.status);
    response.json({ order });
  }
);


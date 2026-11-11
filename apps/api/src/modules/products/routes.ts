import { Router } from "express";
import { AuthError } from "../auth/errors.js";
import { requireAuth, requireCsrf, requireRoles, requireTrustedOrigin } from "../auth/middleware.js";
import { createProductSchema, listProductsSchema, updateProductSchema } from "./schemas.js";
import { createProduct, listProducts, productSummary, updateProduct } from "./service.js";

export const productsRouter = Router();

productsRouter.use(requireAuth);

productsRouter.get("/summary", requireRoles("OWNER", "ADMIN", "ACCOUNTANT", "SALES"), async (_request, response) => {
  response.json(await productSummary());
});

productsRouter.get("/", requireRoles("OWNER", "ADMIN", "ACCOUNTANT", "SALES", "WAREHOUSE", "RETAILER"), async (request, response) => {
  const parsed = listProductsSchema.safeParse(request.query);
  if (!parsed.success) throw new AuthError("Product list parameters are invalid.", 400, "INVALID_INPUT");
  response.json(await listProducts(parsed.data.page, parsed.data.pageSize, parsed.data.search));
});

productsRouter.post("/", requireTrustedOrigin, requireCsrf, requireRoles("OWNER", "ADMIN"), async (request, response) => {
  const parsed = createProductSchema.safeParse(request.body);
  if (!parsed.success) throw new AuthError("Product details are invalid.", 400, "INVALID_INPUT");
  response.status(201).json({ product: await createProduct(parsed.data) });
});

productsRouter.patch("/:productId", requireTrustedOrigin, requireCsrf, requireRoles("OWNER", "ADMIN"), async (request, response) => {
  const productId = request.params.productId;
  const parsed = updateProductSchema.safeParse(request.body);
  if (!parsed.success || typeof productId !== "string" || !/^[a-f\d]{24}$/i.test(productId)) {
    throw new AuthError("Product update details are invalid.", 400, "INVALID_INPUT");
  }
  response.json({ product: await updateProduct(productId, parsed.data) });
});

import { Order } from "./model.js";
import { Invoice } from "../financial/models.js";
import { Product } from "../products/model.js";
import { User } from "../auth/models.js";

export async function createOrder(input: {
  buyerId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  deliveryAddress: string;
  notes?: string;
}) {
  const buyer = await User.findById(input.buyerId);
  if (!buyer) throw new Error("Buyer not found");

  const productIds = input.items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  let subtotalPaisa = 0;
  const orderItems = input.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    const unitPricePaisa = product.wholesalePricePaisa ?? 0;
    const totalPaisa = unitPricePaisa * item.quantity;
    subtotalPaisa += totalPaisa;

    return {
      productId: product._id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      quantity: item.quantity,
      unitPricePaisa,
      totalPaisa
    };
  });

  const count = await Order.countDocuments();
  const orderNumber = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const order = await Order.create({
    orderNumber,
    buyerId: buyer._id,
    buyerName: buyer.name || "Retail Buyer",
    buyerPhone: buyer.phone || "",
    buyerBusinessName: buyer.businessName,
    deliveryAddress: input.deliveryAddress,
    items: orderItems,
    subtotalPaisa,
    taxPaisa: 0,
    totalPaisa: subtotalPaisa,
    status: "PENDING",
    notes: input.notes
  });

  // Automatically generate an associated invoice for Financial Management
  const invoiceCount = await Invoice.countDocuments();
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, "0")}`;
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days credit terms

  await Invoice.create({
    invoiceNumber,
    orderId: order._id,
    buyerId: buyer._id,
    buyerName: buyer.name || "Retail Buyer",
    buyerPhone: buyer.phone,
    buyerBusinessName: buyer.businessName,
    issuedDate: new Date(),
    dueDate,
    totalAmountPaisa: subtotalPaisa,
    paidAmountPaisa: 0,
    status: "PENDING",
    items: orderItems.map((i) => ({
      description: `${i.name} (${i.sku}) - ${i.quantity} ${i.unit}`,
      quantity: i.quantity,
      unitPricePaisa: i.unitPricePaisa,
      totalPaisa: i.totalPaisa
    })),
    notes: `Invoice for Order #${orderNumber}`
  });

  return order;
}

export async function listOrders(params: {
  buyerId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));

  const query: Record<string, unknown> = {};
  if (params.buyerId) query.buyerId = params.buyerId;
  if (params.status && params.status !== "ALL") query.status = params.status;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Order.countDocuments(query)
  ]);

  return {
    orders: orders.map((o) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      buyerId: o.buyerId.toString(),
      buyerName: o.buyerName,
      buyerPhone: o.buyerPhone,
      buyerBusinessName: o.buyerBusinessName,
      deliveryAddress: o.deliveryAddress,
      items: o.items.map((i) => ({
        productId: i.productId.toString(),
        name: i.name,
        sku: i.sku,
        unit: i.unit,
        quantity: i.quantity,
        unitPricePaisa: i.unitPricePaisa,
        totalPaisa: i.totalPaisa
      })),
      subtotalPaisa: o.subtotalPaisa,
      taxPaisa: o.taxPaisa,
      totalPaisa: o.totalPaisa,
      status: o.status,
      notes: o.notes,
      createdAt: o.createdAt
    })),
    total,
    page,
    pageSize
  };
}

export async function updateOrderStatus(orderId: string, status: string) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  order.status = status as any;
  await order.save();
  return order;
}

export async function seedSampleOrders(): Promise<void> {
  const orderCount = await Order.countDocuments();
  if (orderCount > 0) return;

  const demoBuyer = await User.findOne({ role: "RETAILER" });
  const products = await Product.find({ status: "ACTIVE" }).limit(3);

  if (!demoBuyer || products.length === 0) return;

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const sampleItems1 = [
    {
      productId: products[0]._id,
      name: products[0].name,
      sku: products[0].sku,
      unit: products[0].unit,
      quantity: 5,
      unitPricePaisa: products[0].wholesalePricePaisa ?? 250000,
      totalPaisa: (products[0].wholesalePricePaisa ?? 250000) * 5
    }
  ];

  await Order.create({
    orderNumber: "ORD-2026-0001",
    buyerId: demoBuyer._id,
    buyerName: demoBuyer.name || "Ramesh Sah",
    buyerPhone: demoBuyer.phone || "9848730175",
    buyerBusinessName: demoBuyer.businessName || "Lahan Kirana Store",
    deliveryAddress: demoBuyer.address || "Main Bazaar, Lahan",
    items: sampleItems1,
    subtotalPaisa: sampleItems1[0].totalPaisa,
    taxPaisa: 0,
    totalPaisa: sampleItems1[0].totalPaisa,
    status: "DELIVERED",
    notes: "Direct depot dispatch",
    createdAt: daysAgo(10)
  });

  const sampleItems2 = products.map((p, idx) => ({
    productId: p._id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    quantity: (idx + 1) * 3,
    unitPricePaisa: p.wholesalePricePaisa ?? 200000,
    totalPaisa: (p.wholesalePricePaisa ?? 200000) * (idx + 1) * 3
  }));

  const total2 = sampleItems2.reduce((s, i) => s + i.totalPaisa, 0);

  await Order.create({
    orderNumber: "ORD-2026-0002",
    buyerId: demoBuyer._id,
    buyerName: demoBuyer.name || "Ramesh Sah",
    buyerPhone: demoBuyer.phone || "9848730175",
    buyerBusinessName: demoBuyer.businessName || "Lahan Kirana Store",
    deliveryAddress: demoBuyer.address || "Main Bazaar, Lahan",
    items: sampleItems2,
    subtotalPaisa: total2,
    taxPaisa: 0,
    totalPaisa: total2,
    status: "CONFIRMED",
    notes: "Urgent wholesale order for weekend restocking",
    createdAt: daysAgo(1)
  });
}


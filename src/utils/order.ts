import { Types } from "mongoose";

type OrderProductInput = {
  productId?: unknown;
  quantity?: unknown;
};

type CustomerInput = {
  name?: unknown;
  email?: unknown;
  city?: unknown;
  postalCode?: unknown;
  streetAddress?: unknown;
  country?: unknown;
};

export type NormalizedCustomer = {
  name: string;
  email: string;
  city: string;
  postalCode: string;
  streetAddress: string;
  country: string;
};

export type NormalizedOrderProduct = {
  productId: string;
  quantity: number;
};

export const normalizeCustomerField = (value: unknown) => String(value || "").trim();

export const normalizeCustomer = (value: CustomerInput): NormalizedCustomer => ({
  name: normalizeCustomerField(value.name),
  email: normalizeCustomerField(value.email).toLowerCase(),
  city: normalizeCustomerField(value.city),
  postalCode: normalizeCustomerField(value.postalCode),
  streetAddress: normalizeCustomerField(value.streetAddress),
  country: normalizeCustomerField(value.country),
});

export const hasMissingCustomerFields = (customer: NormalizedCustomer) =>
  !customer.name ||
  !customer.email ||
  !customer.city ||
  !customer.postalCode ||
  !customer.streetAddress ||
  !customer.country;

export const mergeOrderProducts = (products: OrderProductInput[]) => {
  const merged = new Map<string, number>();

  for (const item of products) {
    const productId = String(item?.productId || "");
    const quantity = Number(item?.quantity || 0);
    merged.set(productId, Number(merged.get(productId) || 0) + quantity);
  }

  return [...merged.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
};

export const normalizeOrderProducts = (products: unknown): NormalizedOrderProduct[] => {
  if (!Array.isArray(products)) {
    return [];
  }

  return mergeOrderProducts(products as OrderProductInput[]).map((item) => ({
    productId: String(item?.productId || ""),
    quantity: Number(item?.quantity || 0),
  }));
};

export const hasInvalidOrderProducts = (products: NormalizedOrderProduct[]) =>
  products.some(
    (item) => !Types.ObjectId.isValid(item.productId) || !Number.isFinite(item.quantity) || item.quantity < 1
  );

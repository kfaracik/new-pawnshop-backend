import { Types } from "mongoose";

export type ProductInput = {
  title?: string;
  description?: string;
  price?: number;
  images?: string[];
  category?: string;
  properties?: Record<string, string>;
  stock?: number;
  quantity?: number;
  isAuction?: boolean;
  auctionLink?: string | null;
  availabilityMode?: string;
  availableLocations?: string[];
};

const AVAILABILITY_MODES = new Set([
  "online_only",
  "single_location",
  "multiple_locations",
]);

const normalizeOptionalString = (value: unknown) =>
  typeof value === "string" ? value.trim() : undefined;

const normalizeOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : NaN;
};

const normalizeProperties = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key.trim(), String(entry ?? "").trim()])
      .filter(([key]) => key)
  );
};

export const normalizeProductInput = (body: Record<string, unknown> = {}) => {
  const input: ProductInput = {};
  const title = normalizeOptionalString(body.title);
  const description = normalizeOptionalString(body.description);
  const price = normalizeOptionalNumber(body.price);
  const stock = normalizeOptionalNumber(body.stock);
  const quantity = normalizeOptionalNumber(body.quantity);
  const category = normalizeOptionalString(body.category);
  const availabilityMode = normalizeOptionalString(body.availabilityMode);
  const auctionLink =
    body.auctionLink === null ? null : normalizeOptionalString(body.auctionLink);
  const properties = normalizeProperties(body.properties);

  if (title !== undefined) input.title = title;
  if (description !== undefined) input.description = description;
  if (price !== undefined) input.price = price;
  if (stock !== undefined) input.stock = stock;
  if (quantity !== undefined) input.quantity = quantity;
  if (category !== undefined) input.category = category;
  if (properties !== undefined) input.properties = properties;
  if (typeof body.isAuction === "boolean") input.isAuction = body.isAuction;
  if (auctionLink !== undefined) input.auctionLink = auctionLink;
  if (availabilityMode !== undefined) input.availabilityMode = availabilityMode;

  if (Array.isArray(body.images)) {
    input.images = body.images
      .map((image) => normalizeOptionalString(image))
      .filter((image): image is string => Boolean(image));
  }

  if (Array.isArray(body.availableLocations)) {
    input.availableLocations = body.availableLocations
      .map((locationId) => normalizeOptionalString(locationId))
      .filter((locationId): locationId is string => Boolean(locationId));
  }

  return input;
};

export const validateProductInput = (
  input: ProductInput,
  options: { requireRequiredFields?: boolean } = {}
) => {
  const requireRequiredFields = options.requireRequiredFields ?? false;

  if (!requireRequiredFields && Object.keys(input).length === 0) {
    return "At least one product field is required";
  }

  if (requireRequiredFields) {
    if (!input.title) return "Product title is required";
    if (input.price === undefined) return "Product price is required";
    if (!input.category) return "Product category is required";
    if (!input.images?.length) return "At least one image is required";
  }

  if (input.title !== undefined && input.title.length < 3) {
    return "Product title must be at least 3 characters";
  }

  if (input.price !== undefined && (!Number.isFinite(input.price) || input.price < 0)) {
    return "Invalid product price";
  }

  if (input.stock !== undefined && (!Number.isFinite(input.stock) || input.stock < 0)) {
    return "Invalid product stock";
  }

  if (
    input.quantity !== undefined &&
    (!Number.isFinite(input.quantity) || input.quantity < 0)
  ) {
    return "Invalid product quantity";
  }

  if (input.category !== undefined && !Types.ObjectId.isValid(input.category)) {
    return "Invalid product category";
  }

  if (
    input.availabilityMode !== undefined &&
    !AVAILABILITY_MODES.has(input.availabilityMode)
  ) {
    return "Invalid availability mode";
  }

  if (
    input.availableLocations?.some(
      (locationId) => !Types.ObjectId.isValid(locationId)
    )
  ) {
    return "Invalid available location";
  }

  return "";
};

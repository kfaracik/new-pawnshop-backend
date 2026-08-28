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
  isFeatured?: boolean;
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

const MAX_IMAGE_LENGTH = 4_000_000;
const MAX_IMAGES = 12;

// Reject images that could reach storefront rendering as a script vector or as
// an oversized blob. Relative paths and https URLs are fine; the only data:
// URIs allowed are base64-encoded images. Anything with another scheme
// (javascript:, vbscript:, data:text, file:, …) is dropped.
const isAllowedImage = (value: string) => {
  if (!value || value.length > MAX_IMAGE_LENGTH) return false;
  const schemeMatch = value.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!schemeMatch) return true; // relative / same-origin path
  const scheme = schemeMatch[1].toLowerCase();
  if (scheme === "https" || scheme === "http") return true;
  if (scheme === "data") {
    return /^data:image\/(jpeg|jpg|png|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/.test(value);
  }
  return false;
};

// Only http(s) auction links are stored (blocks javascript:/data: hrefs).
const normalizeAuctionLink = (value: unknown): string | null | undefined => {
  if (value === null) return null;
  const str = normalizeOptionalString(value);
  if (str === undefined) return undefined;
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:" ? str : null;
  } catch {
    return null;
  }
};

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
  const auctionLink = normalizeAuctionLink(body.auctionLink);
  const properties = normalizeProperties(body.properties);

  if (title !== undefined) input.title = title;
  if (description !== undefined) input.description = description;
  if (price !== undefined) input.price = price;
  if (stock !== undefined) input.stock = stock;
  if (quantity !== undefined) input.quantity = quantity;
  if (category !== undefined) input.category = category;
  if (properties !== undefined) input.properties = properties;
  if (typeof body.isAuction === "boolean") input.isAuction = body.isAuction;
  if (typeof body.isFeatured === "boolean") input.isFeatured = body.isFeatured;
  if (auctionLink !== undefined) input.auctionLink = auctionLink;
  if (availabilityMode !== undefined) input.availabilityMode = availabilityMode;

  if (Array.isArray(body.images)) {
    input.images = body.images
      .map((image) => normalizeOptionalString(image))
      .filter((image): image is string => Boolean(image) && isAllowedImage(image as string))
      .slice(0, MAX_IMAGES);
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

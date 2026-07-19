import { Product } from "../models/productModel";
import { Location } from "../models/locationModel";
import { Types } from "mongoose";
import { IUser, User } from "../models/userModel";
import { Order } from "../models/orderModel";
import { sanitizeHtml } from "../utils/html";
import { buildSearchRegex } from "../utils/search";
import { logError } from "../utils/logger";
import { isActiveReservationPaymentStatus } from "../utils/checkout";
import { buildSalesIncrementOps, buildSalesDecrementOps } from "../utils/orderSales";
import type { ProductInput } from "../utils/product";

const enrichProductsWithAvailability = async (products: any[]) => {
  if (!Array.isArray(products) || products.length === 0) return [];

  const now = new Date();
  const productIds = products
    .map((product) => String(product?._id || ""))
    .filter((id) => Types.ObjectId.isValid(id));

  if (!productIds.length) return products;

  const locationIds = [
    ...new Set(
      products.flatMap((product) => {
        const plain = product?.toObject ? product.toObject() : product;
        if (!Array.isArray(plain?.availableLocations)) return [];

        return plain.availableLocations
          .map((locationId: unknown) => String(locationId || ""))
          .filter((locationId: string) => Types.ObjectId.isValid(locationId));
      })
    ),
  ];

  const [activeReservations, locations] = await Promise.all([
    Order.find({
      orderStatus: "pending_payment",
      paymentStatus: { $in: ["unpaid", "pending"] },
      reservationExpiresAt: { $gt: now },
      "products.productId": { $in: productIds },
    })
      .select("products paymentStatus reservationExpiresAt")
      .lean<any[]>(),
    locationIds.length
      ? Location.find({ _id: { $in: locationIds }, isActive: true })
          .select(
            "name city addressLine1 addressLine2 postalCode phone email description sortOrder"
          )
          .sort({ sortOrder: 1, name: 1 })
          .lean<any[]>()
      : Promise.resolve([]),
  ]);

  const reservationMap = new Map<string, Date>();
  const locationMap = new Map(
    locations.map((location) => [String(location._id), location])
  );

  for (const order of activeReservations) {
    const expiresAt = order?.reservationExpiresAt ? new Date(order.reservationExpiresAt) : null;
    if (!expiresAt || Number.isNaN(expiresAt.getTime())) continue;
    if (!isActiveReservationPaymentStatus(order?.paymentStatus)) continue;

    for (const orderedProduct of order.products || []) {
      const productId = String(orderedProduct?.productId || "");
      if (!Types.ObjectId.isValid(productId)) continue;

      const existing = reservationMap.get(productId);
      if (!existing || expiresAt > existing) {
        reservationMap.set(productId, expiresAt);
      }
    }
  }

  return products.map((product) => {
    const plain = product?.toObject ? product.toObject() : product;
    const productId = String(plain?._id || "");
    const quantity = Number(plain?.quantity);
    const hasQuantity = Number.isFinite(quantity);
    const stock = Number(plain?.stock);
    const hasPositiveStock = Number.isFinite(stock) && stock > 0;
    const reservationExpiresAt = reservationMap.get(productId) || null;

    let availabilityStatus: "available" | "reserved" | "unavailable" = "available";
    let availableQuantity = Infinity;

    if (hasQuantity && quantity <= 0) {
      availabilityStatus = reservationExpiresAt ? "reserved" : "unavailable";
    }

    if (hasQuantity) {
      availableQuantity = Math.max(0, quantity);
    } else if (hasPositiveStock) {
      availableQuantity = Math.max(0, stock);
    } else if (availabilityStatus !== "available") {
      availableQuantity = 0;
    }

    return {
      ...plain,
      availabilityStatus,
      availableQuantity,
      reservationExpiresAt,
      availabilityMode: plain?.availabilityMode || "online_only",
      availableLocations: Array.isArray(plain?.availableLocations)
        ? plain.availableLocations
            .map((locationId: unknown) => {
              const normalizedId = String(locationId || "");
              return locationMap.get(normalizedId)?.name || normalizedId;
            })
            .filter(Boolean)
        : [],
      availableLocationDetails: Array.isArray(plain?.availableLocations)
        ? plain.availableLocations
            .map((locationId: unknown) => locationMap.get(String(locationId || "")))
            .filter(Boolean)
            .map((location) => ({
              _id: String(location._id),
              name: location.name || "",
              city: location.city || "",
              addressLine1: location.addressLine1 || "",
              addressLine2: location.addressLine2 || "",
              postalCode: location.postalCode || "",
              phone: location.phone || "",
              email: location.email || "",
              description: location.description || "",
            }))
        : [],
    };
  });
};

const SORT_OPTIONS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { price: 1, createdAt: -1 },
  price_desc: { price: -1, createdAt: -1 },
  popular: { views: -1, salesCount: -1, createdAt: -1 },
};

export const resolveSort = (sort?: string) =>
  (sort && SORT_OPTIONS[sort]) || SORT_OPTIONS.newest;

const getProducts = async (
  skip: number,
  limit: number,
  category?: string,
  sort?: string
) => {
  const query =
    category && Types.ObjectId.isValid(category)
      ? { category: new Types.ObjectId(category) }
      : {};

  const products = await Product.find(query, null, {
    skip,
    limit,
    sort: resolveSort(sort),
  }).exec();

  return enrichProductsWithAvailability(products as any[]);
};

const getProduct = async (id: string, options: { trackView?: boolean } = {}) => {
  const product = options.trackView
    ? await Product.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })
        .populate("category", "name")
        .exec()
    : await Product.findById(id).populate("category", "name").exec();
  if (!product) return null;
  const [enriched] = await enrichProductsWithAvailability([product as any]);
  return enriched;
};

const getTotalProducts = async (category?: string) => {
  const query =
    category && Types.ObjectId.isValid(category)
      ? { category: new Types.ObjectId(category) }
      : {};

  return await Product.countDocuments(query);
};

const getNewProducts = async () => {
  const products = await Product.find({}, null, {
    sort: { createdAt: -1 },
    limit: 8,
  }).exec();

  return enrichProductsWithAvailability(products as any[]);
};

const getFeaturedProducts = async (limit = 8) => {
  const featured = await Product.find({ isFeatured: true })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .exec();

  if (featured.length >= limit) {
    return enrichProductsWithAvailability(featured as any[]);
  }

  const featuredIds = featured.map((product) => product._id);
  const fillers = await Product.find({ _id: { $nin: featuredIds } })
    .sort({ createdAt: -1 })
    .limit(limit - featured.length)
    .exec();

  return enrichProductsWithAvailability([...featured, ...fillers] as any[]);
};

const searchProducts = async (
  query: string,
  skip: number,
  limit: number,
  category?: string,
  sort?: string
) => {
  const safeRegex = buildSearchRegex(query);
  const filter: any = safeRegex
    ? {
        $or: [
          { title: safeRegex },
          { description: safeRegex },
        ],
      }
    : {};

  if (category && Types.ObjectId.isValid(category)) {
    filter.category = new Types.ObjectId(category);
  }

  const productsPromise = Product.find(filter)
    .skip(skip)
    .limit(limit)
    .sort(resolveSort(sort))
    .exec();
  const totalProductsPromise = Product.countDocuments(filter).exec();

  const [products, totalProducts] = await Promise.all([
    productsPromise,
    totalProductsPromise,
  ]);

  const enrichedProducts = await enrichProductsWithAvailability(products as any[]);

  return { products: enrichedProducts, totalProducts };
};

const createProduct = async (productData: ProductInput) => {
  const product = new Product({
    ...productData,
    description: sanitizeHtml(productData.description),
  });
  return await product.save();
};

const updateProduct = async (productId: string, productData: ProductInput) => {
  const normalizedProductData = {
    ...productData,
    ...(productData.description !== undefined
      ? { description: sanitizeHtml(productData.description) }
      : {}),
  };

  return await Product.findByIdAndUpdate(productId, normalizedProductData, {
    new: true,
    runValidators: true,
  }).exec();
};

const deleteProduct = async (productId: string) => {
  return await Product.findByIdAndDelete(productId).exec();
};

const getSuggestedProducts = async (userId?: string) => {
  try {
    let favoriteCategories: string[] = [];

    if (userId && Types.ObjectId.isValid(userId)) {
      const user = await User.findById(userId)
        .select("favoriteCategories")
        .lean<IUser>();

      favoriteCategories = user?.favoriteCategories || [];
    }

    const query = favoriteCategories.length
      ? {
          category: {
            $in: favoriteCategories.map((cat) => new Types.ObjectId(cat)),
          },
        }
      : {};

    const products = await Product.find(query).sort({ createdAt: -1 }).limit(8).exec();
    return enrichProductsWithAvailability(products as any[]);
  } catch (error) {
    logError("suggested_products_failed", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw new Error("Failed to fetch suggested products.");
  }
};

const recordOrderSales = async (order: any, session?: any) => {
  if (!order || order.salesCounted) {
    return;
  }

  const products = order.products || [];
  if (products.length > 0) {
    await Product.bulkWrite(
      buildSalesIncrementOps(products),
      session ? { session } : undefined
    );
  }

  order.salesCounted = true;
};

const reverseOrderSales = async (order: any, session?: any) => {
  if (!order || !order.salesCounted) {
    return;
  }

  const products = order.products || [];
  if (products.length > 0) {
    await Product.bulkWrite(
      buildSalesDecrementOps(products),
      session ? { session } : undefined
    );
  }

  order.salesCounted = false;
};

const getPopularProducts = async (limit: number) => {
  const products = await Product.find({})
    .sort({ salesCount: -1, views: -1, createdAt: -1 })
    .limit(limit)
    .exec();

  return enrichProductsWithAvailability(products as any[]);
};

export default {
  getProducts,
  getProduct,
  getTotalProducts,
  getNewProducts,
  getFeaturedProducts,
  recordOrderSales,
  reverseOrderSales,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSuggestedProducts,
  getPopularProducts,
};

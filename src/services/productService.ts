import { Product } from "../models/productModel";
import { Types } from "mongoose";
import { IUser, User } from "../models/userModel";
import { Order } from "../models/orderModel";

const enrichProductsWithAvailability = async (products: any[]) => {
  if (!Array.isArray(products) || products.length === 0) return [];

  const now = new Date();
  const productIds = products
    .map((product) => String(product?._id || ""))
    .filter((id) => Types.ObjectId.isValid(id));

  if (!productIds.length) return products;

  const activeReservations = await Order.find({
    orderStatus: "pending_payment",
    paymentStatus: "unpaid",
    reservationExpiresAt: { $gt: now },
    "products.productId": { $in: productIds },
  })
    .select("products reservationExpiresAt")
    .lean<any[]>();

  const reservationMap = new Map<string, Date>();

  for (const order of activeReservations) {
    const expiresAt = order?.reservationExpiresAt ? new Date(order.reservationExpiresAt) : null;
    if (!expiresAt || Number.isNaN(expiresAt.getTime())) continue;

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
    const reservationExpiresAt = reservationMap.get(productId) || null;

    let availabilityStatus: "available" | "reserved" | "unavailable" = "available";

    if (hasQuantity && quantity <= 0) {
      availabilityStatus = reservationExpiresAt ? "reserved" : "unavailable";
    }

    return {
      ...plain,
      availabilityStatus,
      reservationExpiresAt,
    };
  });
};

const getProducts = async (skip: number, limit: number, category?: string) => {
  const query =
    category && Types.ObjectId.isValid(category)
      ? { category: new Types.ObjectId(category) }
      : {};

  const products = await Product.find(query, null, {
    skip,
    limit,
    sort: { createdAt: -1 },
  }).exec();

  return enrichProductsWithAvailability(products as any[]);
};

const getProduct = async (id: string) => {
  const product = await Product.findById(id).populate("category", "name").exec();
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

const searchProducts = async (query: string, skip: number, limit: number) => {
  const filter = query
    ? {
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      }
    : {};

  const productsPromise = Product.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .exec();
  const totalProductsPromise = Product.countDocuments(filter).exec();

  const [products, totalProducts] = await Promise.all([
    productsPromise,
    totalProductsPromise,
  ]);

  const enrichedProducts = await enrichProductsWithAvailability(products as any[]);

  return { products: enrichedProducts, totalProducts };
};

const createProduct = async (productData: {
  title: string;
  description?: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
  quantity?: number;
  isAuction?: boolean;
  auctionLink?: string | null;
}) => {
  const product = new Product(productData);
  return await product.save();
};

const updateProduct = async (
  productId: string,
  productData: {
    title?: string;
    description?: string;
    price?: number;
    images?: string[];
    category?: string;
    stock?: number;
    quantity?: number;
    isAuction?: boolean;
    auctionLink?: string | null;
  }
) => {
  return await Product.findByIdAndUpdate(productId, productData, {
    new: true,
  }).exec();
};

const deleteProduct = async (productId: string) => {
  return await Product.findByIdAndDelete(productId).exec();
};

const getSuggestedProducts = async (userId?: string) => {
  try {
    let favoriteCategories: string[] = [];

    if (userId) {
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
    console.error("Error in getSuggestedProducts:", error);
    throw new Error("Failed to fetch suggested products.");
  }
};

const getPopularProducts = async (limit: number) => {
  const products = await Product.find({})
    .sort({ price: -1 })
    .limit(limit)
    .exec();

  return enrichProductsWithAvailability(products as any[]);
};

export default {
  getProducts,
  getProduct,
  getTotalProducts,
  getNewProducts,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSuggestedProducts,
  getPopularProducts,
};

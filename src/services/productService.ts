import { Product } from "../models/productModel";
import { Types } from "mongoose";
import { User } from "../models/userModel";

const getProducts = async (skip: number, limit: number) => {
  return await Product.find({}, null, {
    skip,
    limit,
    sort: { createdAt: -1 },
  }).exec();
};

const getProduct = async (id: string) => {
  return await Product.findById(id).populate("category", "name").exec();
};

const getTotalProducts = async () => {
  return await Product.countDocuments();
};

const getNewProducts = async () => {
  return await Product.find({}, null, {
    sort: { createdAt: -1 },
    limit: 8,
  }).exec();
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

  return { products, totalProducts };
};

const createProduct = async (productData: {
  title: string;
  description?: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
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
        .lean();

      favoriteCategories = user?.favoriteCategories || [];
    }

    const query = favoriteCategories.length
      ? {
          category: {
            $in: favoriteCategories.map(
              (cat: string) => new Types.ObjectId(cat)
            ),
          },
          stock: { $gt: 0 },
        }
      : { stock: { $gt: 0 } };

    return await Product.find(query).sort({ createdAt: -1 }).limit(8).exec();
  } catch (error) {
    console.error("Error in getSuggestedProducts:", error);
    throw new Error("Failed to fetch suggested products.");
  }
};

const getPopularProducts = async (limit: number) => {
  return await Product.find({
    stock: { $gt: 0 },
  })
    .sort({ stock: -1 })
    .limit(limit)
    .exec();
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

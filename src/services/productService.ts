import { Product } from "../models/productModel";

const getProducts = async (skip: number, limit: number) => {
  return await Product.find().skip(skip).limit(limit);
};

const getTotalProducts = async () => {
  return await Product.countDocuments();
};

const getNewProducts = async () => {
  return await Product.find({}, null, {
    sort: { _id: -1 },
    limit: 8,
  });
};

const searchProducts = async (query: string, skip: number, limit: number) => {
  try {
    const partialMatch = await Product.find({
      title: { $regex: query, $options: "i" },
    })
      .skip(skip)
      .limit(limit);

    return partialMatch;
  } catch (error) {
    console.error("Error while searching products:", error);
    throw new Error("Error while searching products");
  }
};

const createProduct = async (productData: { name: string; price: number }) => {
  const product = new Product(productData);
  return await product.save();
};

export default {
  getProducts,
  getTotalProducts,
  searchProducts,
  getNewProducts,
  createProduct,
};

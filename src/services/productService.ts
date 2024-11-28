import { Product } from "../models/productModel";

const getProducts = async (skip: number, limit: number) => {
  return await Product.find().skip(skip).limit(limit);
};

const getTotalProducts = async () => {
  return await Product.countDocuments();
};

const createProduct = async (productData: { name: string; price: number }) => {
  const product = new Product(productData);
  return await product.save();
};

export default { getProducts, getTotalProducts, createProduct };

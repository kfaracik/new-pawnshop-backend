import { Product } from "../models/productModel";

const getAllProducts = async () => {
  return await Product.find();
};

const createProduct = async (productData: { name: string; price: number }) => {
  const product = new Product(productData);
  return await product.save();
};

export default { getAllProducts, createProduct };

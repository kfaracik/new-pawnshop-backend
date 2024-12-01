import { Request, Response, NextFunction } from "express";
import ProductService from "../services/productService";

const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      ProductService.getProducts(skip, limit),
      ProductService.getTotalProducts(),
    ]);

    res.status(200).json({
      total,
      page,
      limit,
      products,
    });
  } catch (error) {
    next(error);
  }
};

const searchProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const query = (req.query.query as string) || "";
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const { products, totalProducts } = await ProductService.searchProducts(
      query,
      skip,
      limit
    );

    res.status(200).json({
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
      },
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

const getNewProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const newProducts = await ProductService.getNewProducts();
    res.status(200).json(newProducts);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const newProduct = await ProductService.createProduct(req.body);
    res.status(201).json(newProduct);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const updatedProduct = await ProductService.updateProduct(req.params.id, req.body);
    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(updatedProduct);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const deletedProduct = await ProductService.deleteProduct(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllProducts,
  getNewProducts,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};

import { Request, Response, NextFunction } from "express";
import ProductService from "../services/productService";
import { getSingleValue } from "../utils/request";
import { logAudit, logError } from "../utils/logger";

const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const category = (req.query.category as string) || "";
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      ProductService.getProducts(skip, limit, category),
      ProductService.getTotalProducts(category),
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

const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getSingleValue(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "Product id is required" });
    }
    const product = await ProductService.getProduct(id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    logError("product_fetch_failed", {
      error: error instanceof Error ? error.message : String(error),
      productId: req.params.id,
    });
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
    logError("product_search_failed", {
      error: error instanceof Error ? error.message : String(error),
      query: req.query.query,
    });
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

const getSuggestedProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = getSingleValue(req.query.userId as string | string[] | undefined) || "";
    const suggestions = await ProductService.getSuggestedProducts(userId);

    res.status(200).json(suggestions);
  } catch (error) {
    next(error);
  }
};

const getPopularProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const popularProducts = await ProductService.getPopularProducts(limit);

    res.status(200).json(popularProducts);
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
    logAudit("product_created", {
      productId: newProduct?._id,
      userId: req.user?._id,
      title: newProduct?.title,
    });
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
    const id = getSingleValue(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Product id is required" });
    }
    const updatedProduct = await ProductService.updateProduct(
      id,
      req.body
    );
    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    logAudit("product_updated", {
      productId: updatedProduct?._id,
      userId: req.user?._id,
      title: updatedProduct?.title,
    });
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
    const id = getSingleValue(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Product id is required" });
    }

    const deletedProduct = await ProductService.deleteProduct(id);
    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    logAudit("product_deleted", {
      productId: deletedProduct?._id,
      userId: req.user?._id,
      title: deletedProduct?.title,
    });
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllProducts,
  getProduct,
  getNewProducts,
  getSuggestedProducts,
  getPopularProducts,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};

import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import ProductService from "../services/productService";
import { getSingleValue, parsePagination, parsePositiveInteger } from "../utils/request";
import { logAudit, logError } from "../utils/logger";
import { normalizeProductInput, validateProductInput } from "../utils/product";

const VIEW_THROTTLE_MS = 10 * 60 * 1000;
const VIEW_THROTTLE_MAX_ENTRIES = 20_000;
const recentViews = new Map<string, number>();

const shouldCountView = (req: Request, productId: string) => {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const key = `${ip}:${productId}`;
  const now = Date.now();
  const last = recentViews.get(key);

  if (last && now - last < VIEW_THROTTLE_MS) {
    return false;
  }

  if (recentViews.size > VIEW_THROTTLE_MAX_ENTRIES) {
    for (const [entryKey, timestamp] of recentViews) {
      if (now - timestamp >= VIEW_THROTTLE_MS) {
        recentViews.delete(entryKey);
      }
    }
  }

  recentViews.set(key, now);
  return true;
};

const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const category = (req.query.category as string) || "";

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
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }
    const trackView =
      getSingleValue(req.query.trackView as string | string[] | undefined) === "1" &&
      shouldCountView(req, id);
    const product = await ProductService.getProduct(id, { trackView });

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
    const category = (req.query.category as string) || "";
    const { page, limit, skip } = parsePagination(req.query);

    const { products, totalProducts } = await ProductService.searchProducts(
      query,
      skip,
      limit,
      category
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

const getFeaturedProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parsePositiveInteger(req.query.limit, 8, 24);
    const featuredProducts = await ProductService.getFeaturedProducts(limit);
    res.status(200).json(featuredProducts);
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
    const limit = parsePositiveInteger(req.query.limit, 10, 24);
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
    const productInput = normalizeProductInput(req.body);
    const validationError = validateProductInput(productInput, {
      requireRequiredFields: true,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const newProduct = await ProductService.createProduct(productInput);
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
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    const productInput = normalizeProductInput(req.body);
    const validationError = validateProductInput(productInput);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const updatedProduct = await ProductService.updateProduct(
      id,
      productInput
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
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
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
  getFeaturedProducts,
  getSuggestedProducts,
  getPopularProducts,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};

import { Request, Response, NextFunction } from "express";
import { Category, ICategoryProperty } from "../models/categoryModel";
import { Types } from "mongoose";
import { getSingleValue } from "../utils/request";
import { logAudit } from "../utils/logger";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeCategoryProperties = (value: unknown): ICategoryProperty[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const name = typeof item.name === "string" ? item.name.trim() : "";
      const rawValues = Array.isArray(item.values) ? item.values : [];
      const values = rawValues
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean);

      if (!name) {
        return null;
      }

      return {
        name,
        values: [...new Set(values)],
      };
    })
    .filter((item): item is ICategoryProperty => Boolean(item));
};

const hasParentCycle = async (
  categoryId: string,
  parentId: string | null
): Promise<boolean> => {
  if (!parentId) {
    return false;
  }

  let currentParentId: string | null = parentId;

  while (currentParentId) {
    if (currentParentId === categoryId) {
      return true;
    }

    const parent = await Category.findById(currentParentId)
      .select("parentId")
      .lean<{ parentId?: Types.ObjectId | null }>();
    currentParentId = parent?.parentId ? String(parent.parentId) : null;
  }

  return false;
};

const getAllCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await Category.find()
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};

const getCategoryTree = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await Category.find()
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const nodesById = new Map(
      categories.map((item) => [
        String(item._id),
        { ...item, children: [] as Record<string, unknown>[] },
      ])
    );

    const tree: Record<string, unknown>[] = [];

    for (const category of categories) {
      const node = nodesById.get(String(category._id));
      const parentId = category.parentId ? String(category.parentId) : null;

      if (parentId && nodesById.has(parentId)) {
        nodesById.get(parentId)?.children.push(node);
      } else {
        tree.push(node);
      }
    }

    res.status(200).json(tree);
  } catch (error) {
    next(error);
  }
};

const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      slug,
      parentId = null,
      isActive = true,
      sortOrder = 0,
      properties,
    } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Name is required" });
    }

    const normalizedSlug =
      typeof slug === "string" && slug.trim().length > 0
        ? slugify(slug)
        : slugify(name);

    if (!normalizedSlug) {
      return res.status(400).json({ message: "Invalid slug" });
    }

    if (parentId && !Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ message: "Invalid parentId" });
    }

    if (parentId) {
      const parentCategory = await Category.findById(parentId).select("_id");
      if (!parentCategory) {
        return res.status(400).json({ message: "Parent category not found" });
      }
    }

    const newCategory = new Category({
      name,
      slug: normalizedSlug,
      parentId,
      isActive: Boolean(isActive),
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      properties: normalizeCategoryProperties(properties),
    });

    await newCategory.save();
    logAudit("category_created", {
      categoryId: newCategory._id,
      userId: req.user?._id,
      name: newCategory.name,
    });
    res.status(201).json(newCategory);
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = getSingleValue(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Category id is required" });
    }
    const { name, slug, parentId, isActive, sortOrder, properties } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const existing = await Category.findById(id).lean<any>();
    if (!existing) {
      return res.status(404).json({ message: "Category not found" });
    }

    const updateData: Record<string, unknown> = {};
    const nextName = typeof name === "string" ? name : existing.name;

    if (typeof name === "string") {
      updateData.name = name;
    }

    if (typeof slug === "string") {
      const normalizedSlug = slugify(slug);
      if (!normalizedSlug) {
        return res.status(400).json({ message: "Invalid slug" });
      }
      updateData.slug = normalizedSlug;
    } else if (typeof name === "string" && !existing.slug) {
      updateData.slug = slugify(nextName);
    }

    if (parentId !== undefined) {
      if (parentId !== null && !Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ message: "Invalid parentId" });
      }

      if (parentId) {
        const parentCategory = await Category.findById(parentId).select("_id");
        if (!parentCategory) {
          return res.status(400).json({ message: "Parent category not found" });
        }
      }

      const hasCycle = await hasParentCycle(id, parentId);
      if (hasCycle) {
        return res
          .status(400)
          .json({ message: "Invalid hierarchy: cycle detected" });
      }

      updateData.parentId = parentId;
    }

    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }

    if (sortOrder !== undefined) {
      if (!Number.isFinite(Number(sortOrder)) || Number(sortOrder) < 0) {
        return res.status(400).json({ message: "Invalid sortOrder" });
      }
      updateData.sortOrder = Number(sortOrder);
    }

    if (properties !== undefined) {
      updateData.properties = normalizeCategoryProperties(properties);
    }

    const category = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    logAudit("category_updated", {
      categoryId: category?._id,
      userId: req.user?._id,
      name: category?.name,
    });
    res.status(200).json(category);
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = getSingleValue(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Category id is required" });
    }

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const hasChildren = await Category.exists({ parentId: id });
    if (hasChildren) {
      return res.status(409).json({
        message: "Category has child categories. Reassign or delete children first.",
      });
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    logAudit("category_deleted", {
      categoryId: category._id,
      userId: req.user?._id,
      name: category.name,
    });
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllCategories,
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
};

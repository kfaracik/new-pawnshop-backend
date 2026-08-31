import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { Inquiry, INQUIRY_STATUSES, INQUIRY_TYPES } from "../models/inquiryModel";
import { getSingleValue, parsePositiveInteger } from "../utils/request";
import { logAudit } from "../utils/logger";

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;

// Public: anyone can submit a valuation request, availability alert or
// newsletter sign-up. Body is already validated by zod at the route level.
const createInquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, any>;

    const payload = {
      type: body.type || "question",
      name: body.name || "",
      email: body.email || "",
      phone: body.phone || "",
      message: body.message || "",
      itemCategory: body.itemCategory || "",
      productId:
        body.productId && Types.ObjectId.isValid(String(body.productId))
          ? new Types.ObjectId(String(body.productId))
          : null,
      productTitle: body.productTitle || "",
      source: body.source || "",
    };

    if (payload.type === "newsletter") {
      // Idempotent: repeating a sign-up must not reveal whether the address is
      // already on the list, and must not look like an error to the visitor.
      await Inquiry.updateOne(
        { type: "newsletter", email: payload.email },
        { $setOnInsert: { ...payload, status: "new" } },
        { upsert: true }
      );
      logAudit("inquiry_created", { type: payload.type });
      return res.status(201).json({ ok: true });
    }

    const inquiry = await Inquiry.create(payload);
    logAudit("inquiry_created", {
      type: payload.type,
      inquiryId: String(inquiry._id),
    });

    // Never echo the stored document back to an anonymous caller.
    return res.status(201).json({ ok: true });
  } catch (error: any) {
    if (error?.code === 11000) {
      // Duplicate newsletter address — treat as success (see above).
      return res.status(201).json({ ok: true });
    }
    next(error);
  }
};

// Admin: list with optional type/status filters.
const getAllInquiries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = getSingleValue(req.query.type as string | string[] | undefined);
    const status = getSingleValue(req.query.status as string | string[] | undefined);
    const limit = parsePositiveInteger(req.query.limit, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX);

    const filter: Record<string, unknown> = {};
    if (type && (INQUIRY_TYPES as readonly string[]).includes(type)) {
      filter.type = type;
    }
    if (status && (INQUIRY_STATUSES as readonly string[]).includes(status)) {
      filter.status = status;
    }

    const [inquiries, total, newCount] = await Promise.all([
      Inquiry.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
      Inquiry.countDocuments(filter),
      Inquiry.countDocuments({ status: "new" }),
    ]);

    return res.status(200).json({ inquiries, total, newCount });
  } catch (error) {
    next(error);
  }
};

// Admin: move an inquiry through new -> contacted -> closed, add a note.
const updateInquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getSingleValue(req.params.id);
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Nieprawidłowy identyfikator zapytania." });
    }

    const update: Record<string, unknown> = {};
    if (req.body?.status !== undefined) update.status = req.body.status;
    if (req.body?.adminNote !== undefined) update.adminNote = req.body.adminNote;

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "Brak danych do aktualizacji." });
    }

    const inquiry = await Inquiry.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!inquiry) {
      return res.status(404).json({ message: "Nie znaleziono zapytania." });
    }

    return res.status(200).json(inquiry);
  } catch (error) {
    next(error);
  }
};

const deleteInquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getSingleValue(req.params.id);
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Nieprawidłowy identyfikator zapytania." });
    }

    const removed = await Inquiry.findByIdAndDelete(id).lean();
    if (!removed) {
      return res.status(404).json({ message: "Nie znaleziono zapytania." });
    }

    return res.status(200).json({ message: "Zapytanie zostało usunięte." });
  } catch (error) {
    next(error);
  }
};

export default {
  createInquiry,
  getAllInquiries,
  updateInquiry,
  deleteInquiry,
};

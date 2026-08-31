import { z } from "zod";
import { INQUIRY_TYPES } from "../models/inquiryModel";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const createInquirySchema = z
  .object({
    type: z.enum(INQUIRY_TYPES).default("question"),
    name: optionalText(120),
    email: z
      .string()
      .trim()
      .max(160)
      .email("Podaj prawidłowy adres e-mail.")
      .optional()
      .or(z.literal("")),
    phone: optionalText(40),
    message: optionalText(4000),
    itemCategory: optionalText(120),
    productId: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, "Nieprawidłowy identyfikator produktu.")
      .optional()
      .or(z.literal("")),
    productTitle: optionalText(200),
    source: optionalText(80),
  })
  .strip()
  .superRefine((value, ctx) => {
    const hasEmail = Boolean(value.email);
    const hasPhone = Boolean(value.phone);

    if (value.type === "newsletter") {
      if (!hasEmail) {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: "Podaj adres e-mail.",
        });
      }
      return;
    }

    if (value.type === "availability") {
      if (!hasEmail) {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: "Podaj adres e-mail, na który wyślemy powiadomienie.",
        });
      }
      return;
    }

    // Valuation / loan / question: we must be able to reach the person back.
    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Podaj telefon lub adres e-mail, żebyśmy mogli odpowiedzieć.",
      });
    }

    if (!value.message && value.type !== "loan") {
      ctx.addIssue({
        code: "custom",
        path: ["message"],
        message: "Opisz krótko, czego dotyczy zapytanie.",
      });
    }
  });

export const updateInquirySchema = z
  .object({
    status: z.enum(["new", "contacted", "closed"]).optional(),
    adminNote: optionalText(2000),
  })
  .strip();

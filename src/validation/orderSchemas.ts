import { z } from "zod";

const orderProductSchema = z.object({
  productId: z.string().trim().min(1, "productId jest wymagane"),
  quantity: z.coerce.number().int("Ilość musi być liczbą całkowitą").positive().max(999),
});

export const createOrderSchema = z
  .object({
    name: z.string().trim().min(1, "Podaj imię i nazwisko").max(200),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Podaj poprawny adres e-mail")
      .max(200),
    city: z.string().trim().min(1, "Podaj miasto").max(200),
    postalCode: z.string().trim().min(1, "Podaj kod pocztowy").max(20),
    streetAddress: z.string().trim().min(1, "Podaj ulicę i numer").max(300),
    country: z.string().trim().min(1, "Podaj kraj").max(120),
    products: z
      .array(orderProductSchema)
      .min(1, "Zamówienie musi zawierać co najmniej jeden produkt")
      .max(100, "Zbyt wiele pozycji w zamówieniu"),
    deliveryMethod: z.string().trim().max(60).optional(),
    paymentMethod: z.string().trim().max(60).optional(),
  })
  .passthrough();

import nodemailer, { type Transporter } from "nodemailer";
import { logAudit, logError } from "../utils/logger";

const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM =
  process.env.SMTP_FROM?.trim() || "Nowy Lombard <no-reply@nowylombard.pl>";
const SMTP_SECURE = ["1", "true", "yes"].includes(
  String(process.env.SMTP_SECURE || "").toLowerCase()
);

let transporter: Transporter | null = null;

export const isMailConfigured = () => Boolean(SMTP_HOST);

const getTransporter = (): Transporter | null => {
  if (!SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }
  return transporter;
};

const formatAmount = (value: unknown) => `${Number(value || 0).toFixed(2)} zł`;

const buildOrderEmailHtml = (order: any) => {
  const rows = (order.products || [])
    .map(
      (product: any) =>
        `<tr><td style="padding:6px 0;color:#333">${product.name} × ${product.quantity}</td>` +
        `<td style="padding:6px 0;text-align:right;color:#333">${formatAmount(
          Number(product.price) * Number(product.quantity)
        )}</td></tr>`
    )
    .join("");

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#151515">
    <div style="background:#0F0F0F;color:#E1C76A;padding:20px 24px;border-radius:12px 12px 0 0">
      <strong style="font-size:18px">Nowy Lombard</strong>
    </div>
    <div style="border:1px solid #ececec;border-top:0;padding:24px;border-radius:0 0 12px 12px">
      <h2 style="margin:0 0 8px">Dziękujemy za zamówienie!</h2>
      <p style="margin:0 0 16px;color:#4a4a4a">Twoja płatność została potwierdzona. Numer zamówienia: <strong>${
        order._id
      }</strong>.</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #ececec;margin-top:8px">${rows}</table>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #ececec;margin-top:8px">
        <tr><td style="padding:8px 0;color:#616161">Dostawa</td><td style="padding:8px 0;text-align:right">${formatAmount(
          order.deliveryPrice
        )}</td></tr>
        <tr><td style="padding:8px 0;font-weight:700">Razem</td><td style="padding:8px 0;text-align:right;font-weight:700">${formatAmount(
          order.grandTotal
        )}</td></tr>
      </table>
      <p style="margin:16px 0 0;color:#616161;font-size:13px">W razie pytań odpowiedz na tę wiadomość.</p>
    </div>
  </div>`;
};

export const sendOrderConfirmation = async (order: any) => {
  const mailer = getTransporter();
  const recipient = order?.customer?.email;
  if (!mailer || !recipient) {
    return;
  }

  try {
    await mailer.sendMail({
      from: SMTP_FROM,
      to: recipient,
      subject: `Potwierdzenie zamówienia ${order._id} — Nowy Lombard`,
      html: buildOrderEmailHtml(order),
    });
    logAudit("order_confirmation_email_sent", {
      orderId: String(order._id),
    });
  } catch (error) {
    logError("order_confirmation_email_failed", {
      orderId: String(order?._id),
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let mongod: MongoMemoryServer;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Order: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Bid: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let User: any;

const orderBase = (overrides: Record<string, unknown> = {}) => ({
  customer: {
    name: "Jan Testowy",
    email: "jan.testowy@example.com",
    city: "Częstochowa",
    postalCode: "42-200",
    streetAddress: "Al. NMP 1",
    country: "Polska",
  },
  products: [
    {
      productId: new Types.ObjectId(),
      name: "Testowy zegarek",
      price: 100,
      quantity: 1,
    },
  ],
  totalAmount: 100,
  subtotalAmount: 100,
  deliveryPrice: 16.9,
  grandTotal: 116.9,
  deliveryEtaLabel: "1-2 dni robocze",
  paymentMethod: "stripe_card",
  paymentProvider: "stripe",
  ...overrides,
});

const registerUser = async (email: string) => {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ email, password: "Haslo1234" });
  expect(res.status).toBe(201);
  return { token: res.body.token as string, id: res.body.user.id as string };
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = (await import("../app")).default;
  Order = (await import("../models/orderModel")).Order;
  Bid = (await import("../models/bidModel")).Bid;
  User = (await import("../models/userModel")).User;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

describe("payment endpoints — ownership (IDOR) and PII", () => {
  it("hides a user-linked order from anonymous callers (404)", async () => {
    const owner = await registerUser("owner1@example.com");
    const order = await Order.create(orderBase({ userId: owner.id }));

    const res = await request(app)
      .post(`/api/v1/orders/${order._id}/confirm-payment`)
      .send({});
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Nie znaleziono zamówienia.");
  });

  it("hides a user-linked order from a DIFFERENT logged-in user (404)", async () => {
    const owner = await registerUser("owner2@example.com");
    const stranger = await registerUser("stranger@example.com");
    const order = await Order.create(orderBase({ userId: owner.id }));

    const res = await request(app)
      .post(`/api/v1/orders/${order._id}/confirm-payment`)
      .set("Authorization", `Bearer ${stranger.token}`)
      .send({});
    expect(res.status).toBe(404);
  });

  it("lets the owner past the guard (fails later on missing session, not 404)", async () => {
    const owner = await registerUser("owner3@example.com");
    const order = await Order.create(orderBase({ userId: owner.id }));

    const res = await request(app)
      .post(`/api/v1/orders/${order._id}/confirm-payment`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Brak identyfikatora sesji płatności.");
  });

  it("keeps guest orders reachable by id (checkout capability)", async () => {
    const order = await Order.create(orderBase({ userId: null }));

    const res = await request(app)
      .post(`/api/v1/orders/${order._id}/confirm-payment`)
      .send({});
    expect(res.status).toBe(400); // past ownership, stopped on missing session
  });

  it("never returns customer PII from confirm-payment (safeOrderView)", async () => {
    const order = await Order.create(
      orderBase({ userId: null, paid: true, paymentStatus: "paid" })
    );

    const res = await request(app)
      .post(`/api/v1/orders/${order._id}/confirm-payment`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.paid).toBe(true);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("jan.testowy@example.com");
    expect(serialized).not.toContain("Jan Testowy");
    expect(serialized).not.toContain("NMP");
    expect(res.body.order).toEqual({
      _id: String(order._id),
      paid: true,
      paymentStatus: "paid",
      orderStatus: expect.any(String),
      paymentMethod: "stripe_card",
    });
  });
});

describe("public auction endpoints — bidder email masking", () => {
  it("returns maskedEmail and never the raw email on /auctions/:id/bids", async () => {
    const bidder = await User.create({
      email: "bidder.secret@example.com",
      password: "irrelevant-hash",
    });
    const auctionId = new Types.ObjectId();
    await Bid.create({ auctionId, userId: bidder._id, amount: 50 });

    const res = await request(app).get(`/api/v1/auctions/${auctionId}/bids`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    // "bidder.secret" -> first char + 12 masked chars
    expect(res.body[0].userId.maskedEmail).toBe("b************@example.com");
    expect(res.body[0].userId).not.toHaveProperty("email");
    expect(JSON.stringify(res.body)).not.toContain("bidder.secret@example.com");
  });
});

describe("request hardening", () => {
  it("strips $-operator query keys (sanitizeMongo) without crashing", async () => {
    const res = await request(app).get("/api/v1/auctions?status[$ne]=x");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("rejects oversized bodies on auth routes (256kb limit)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "a@b.pl", password: "x".repeat(300_000) });
    expect(res.status).toBe(413);
  });

  it("responds with Polish error messages on public endpoints", async () => {
    const res = await request(app).get("/api/v1/auctions/not-an-id");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Nieprawidłowy identyfikator aukcji.");
  });
});

describe("auth flow", () => {
  it("register -> login -> /auth/user round-trip", async () => {
    await registerUser("roundtrip@example.com");

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "roundtrip@example.com", password: "Haslo1234" });
    expect(login.status).toBe(200);

    const me = await request(app)
      .get("/api/v1/auth/user")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("roundtrip@example.com");
    expect(me.body.isAdmin).toBe(false);
  });

  it("rejects a bad password with a generic Polish message", async () => {
    await registerUser("badpass@example.com");
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "badpass@example.com", password: "Wrong1234" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Nieprawidłowy e-mail lub hasło.");
  });
});

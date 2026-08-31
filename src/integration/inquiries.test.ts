import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let mongod: MongoMemoryServer;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Inquiry: any;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = (await import("../app")).default;
  Inquiry = (await import("../models/inquiryModel")).Inquiry;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

describe("POST /api/v1/inquiries — public submissions", () => {
  it("accepts a valuation request with a phone number", async () => {
    const res = await request(app).post("/api/v1/inquiries").send({
      type: "valuation",
      name: "Anna Nowak",
      phone: "515 671 666",
      itemCategory: "Złoto",
      message: "Pierścionek 585, około 3 gramy.",
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });

    const stored = await Inquiry.findOne({ type: "valuation" }).lean();
    expect(stored.name).toBe("Anna Nowak");
    expect(stored.status).toBe("new");
  });

  it("rejects a valuation with no way to reach the person", async () => {
    const res = await request(app)
      .post("/api/v1/inquiries")
      .send({ type: "valuation", message: "Coś tam" });
    expect(res.status).toBe(400);
  });

  it("requires an email for availability alerts", async () => {
    const res = await request(app)
      .post("/api/v1/inquiries")
      .send({ type: "availability", phone: "500100200" });
    expect(res.status).toBe(400);
  });

  it("never echoes the stored record back to an anonymous caller", async () => {
    const res = await request(app).post("/api/v1/inquiries").send({
      type: "question",
      email: "ktos@example.com",
      message: "Czy macie zegarki?",
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
    expect(JSON.stringify(res.body)).not.toContain("ktos@example.com");
  });

  it("treats a repeated newsletter sign-up as success (no enumeration)", async () => {
    const payload = { type: "newsletter", email: "zapis@example.com" };
    const first = await request(app).post("/api/v1/inquiries").send(payload);
    const second = await request(app).post("/api/v1/inquiries").send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await Inquiry.countDocuments({ type: "newsletter" })).toBe(1);
  });

  it("rejects an invalid email", async () => {
    const res = await request(app)
      .post("/api/v1/inquiries")
      .send({ type: "newsletter", email: "nie-jest-emailem" });
    expect(res.status).toBe(400);
  });
});

describe("inquiry admin endpoints require admin auth", () => {
  it("refuses anonymous listing", async () => {
    const res = await request(app).get("/api/v1/inquiries");
    expect([401, 403]).toContain(res.status);
  });

  it("refuses anonymous status updates", async () => {
    const inquiry = await Inquiry.create({ type: "question", message: "x" });
    const res = await request(app)
      .put(`/api/v1/inquiries/${inquiry._id}`)
      .send({ status: "closed" });
    expect([401, 403]).toContain(res.status);
  });

  it("refuses anonymous deletion", async () => {
    const inquiry = await Inquiry.create({ type: "question", message: "y" });
    const res = await request(app).delete(`/api/v1/inquiries/${inquiry._id}`);
    expect([401, 403]).toContain(res.status);
  });
});

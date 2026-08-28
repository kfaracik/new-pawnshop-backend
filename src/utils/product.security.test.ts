import { describe, expect, it } from "vitest";
import { normalizeProductInput } from "./product";

describe("normalizeProductInput — image + auctionLink hardening", () => {
  it("keeps https, relative, and base64 image URIs", () => {
    const input = normalizeProductInput({
      images: [
        "https://cdn.example.com/a.jpg",
        "/uploads/b.png",
        "photo.webp",
        "data:image/png;base64,iVBORw0KGgo=",
      ],
    });
    expect(input.images).toEqual([
      "https://cdn.example.com/a.jpg",
      "/uploads/b.png",
      "photo.webp",
      "data:image/png;base64,iVBORw0KGgo=",
    ]);
  });

  it("drops javascript:, data:text and other script-capable image values", () => {
    const input = normalizeProductInput({
      images: [
        "javascript:alert(1)",
        "data:text/html;base64,PHNjcmlwdD4=",
        "vbscript:msgbox(1)",
        "https://ok.example.com/x.jpg",
      ],
    });
    expect(input.images).toEqual(["https://ok.example.com/x.jpg"]);
  });

  it("caps the number of images at 12", () => {
    const many = Array.from({ length: 20 }, (_, i) => `/img/${i}.jpg`);
    const input = normalizeProductInput({ images: many });
    expect(input.images).toHaveLength(12);
  });

  it("nulls a javascript: auctionLink but keeps a valid https one", () => {
    expect(
      normalizeProductInput({ auctionLink: "javascript:alert(1)" }).auctionLink
    ).toBeNull();
    expect(
      normalizeProductInput({ auctionLink: "https://facebook.com/x" }).auctionLink
    ).toBe("https://facebook.com/x");
  });
});

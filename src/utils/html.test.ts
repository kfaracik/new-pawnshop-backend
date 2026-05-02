import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./html";

describe("sanitizeHtml", () => {
  it("removes scripts and inline handlers", () => {
    const unsafe =
      '<p onclick="alert(1)">Hello</p><script>alert(1)</script><img src="x" onerror="alert(1)">';

    expect(sanitizeHtml(unsafe)).toBe("<p>Hello</p>");
  });

  it("keeps basic formatting tags", () => {
    expect(sanitizeHtml("<p><strong>Test</strong><br><em>Opis</em></p>")).toBe(
      "<p><strong>Test</strong><br><em>Opis</em></p>"
    );
  });
});

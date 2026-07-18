import { describe, expect, it } from "vitest";
import { createViewThrottle } from "./viewThrottle";

describe("createViewThrottle", () => {
  it("counts the first view and throttles repeats within the window", () => {
    let time = 1_000;
    const throttle = createViewThrottle({ windowMs: 10_000, now: () => time });

    expect(throttle.shouldCount("ip:prod")).toBe(true);
    expect(throttle.shouldCount("ip:prod")).toBe(false);

    time += 5_000;
    expect(throttle.shouldCount("ip:prod")).toBe(false);
  });

  it("counts again once the window elapses", () => {
    let time = 0;
    const throttle = createViewThrottle({ windowMs: 10_000, now: () => time });

    expect(throttle.shouldCount("a")).toBe(true);
    time += 10_000;
    expect(throttle.shouldCount("a")).toBe(true);
  });

  it("tracks distinct keys independently", () => {
    const time = 0;
    const throttle = createViewThrottle({ windowMs: 10_000, now: () => time });

    expect(throttle.shouldCount("ip1:prod")).toBe(true);
    expect(throttle.shouldCount("ip2:prod")).toBe(true);
    expect(throttle.shouldCount("ip1:prod")).toBe(false);
  });
});

import { describe, it, expect } from "vitest";

// Pure logic: tier calculation extracted from user.service.ts
const getTier = (points: number): string =>
  points >= 5000 ? "PLATINUM" : points >= 2000 ? "GOLD" : points >= 500 ? "SILVER" : "BRONZE";

describe("Loyalty tier calculation", () => {
  it("awards BRONZE for 0 points", () => {
    expect(getTier(0)).toBe("BRONZE");
  });

  it("awards SILVER at exactly 500 points", () => {
    expect(getTier(500)).toBe("SILVER");
  });

  it("awards PLATINUM at 5000+ points", () => {
    expect(getTier(5000)).toBe("PLATINUM");
    expect(getTier(9999)).toBe("PLATINUM");
  });
});

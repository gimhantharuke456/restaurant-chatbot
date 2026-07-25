import { describe, it, expect } from "vitest";

// Pure logic: order verification + total computation, extracted from payment.service.ts
const SERVICE_CHARGE_RATE = 0.10;

interface OrderItemInput {
  menuItemId?: string | null;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

const computeVerifiedTotal = (
  orderItems: OrderItemInput[],
  dbPriceMap: Map<string, number>,
) => {
  const verifiedItems = orderItems.map((item) => {
    if (!item.menuItemId) return item;
    const dbPrice = dbPriceMap.get(item.menuItemId);
    if (dbPrice === undefined) {
      throw Object.assign(
        new Error(`Menu item ${item.menuItemId} not found or unavailable`),
        { status: 400 },
      );
    }
    return { ...item, price: dbPrice };
  });

  const subtotal = verifiedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE);
  return { verifiedItems, subtotal, serviceCharge, total: subtotal + serviceCharge };
};

describe("computeVerifiedTotal (payment pricing)", () => {
  it("ignores a forged client price for an identified menu item and uses the DB price instead", () => {
    const dbPriceMap = new Map([["item-1", 1000]]);
    const result = computeVerifiedTotal(
      [{ menuItemId: "item-1", name: "Burger", price: 1, quantity: 2 }],
      dbPriceMap,
    );
    expect(result.verifiedItems[0].price).toBe(1000);
    expect(result.subtotal).toBe(2000);
  });

  it("computes a 10% service charge, rounded", () => {
    const dbPriceMap = new Map([["item-1", 999]]);
    const result = computeVerifiedTotal(
      [{ menuItemId: "item-1", name: "Burger", price: 999, quantity: 1 }],
      dbPriceMap,
    );
    expect(result.serviceCharge).toBe(100); // round(99.9) = 100
    expect(result.total).toBe(1099);
  });

  it("keeps the client-supplied price for an item with no menuItemId", () => {
    const result = computeVerifiedTotal(
      [{ name: "Custom request", price: 500, quantity: 1 }],
      new Map(),
    );
    expect(result.verifiedItems[0].price).toBe(500);
  });

  it("throws when a menuItemId isn't in the DB price map", () => {
    expect(() =>
      computeVerifiedTotal(
        [{ menuItemId: "missing", name: "Ghost item", price: 1, quantity: 1 }],
        new Map(),
      ),
    ).toThrow("Menu item missing not found or unavailable");
  });
});

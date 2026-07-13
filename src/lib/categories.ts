export const CATEGORIES = ["Transport", "Flights", "Meals", "Technology"] as const;
export type Category = (typeof CATEGORIES)[number];
export const CURRENCY = "USD";

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
  }).format(amount);
}

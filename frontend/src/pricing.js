// Wholesale Bulk Tiered Pricing Utility
export function getTierPricing(product, quantity = 1) {
  const qty = Number(quantity) > 0 ? Number(quantity) : 1;
  const basePrice = Number(product?.price) || 0;
  const unit = product?.unit || "kg";

  // Tier 1: 51 - 200 units (10% discount default)
  // Tier 2: 201+ units (20% discount default)
  const tier1Min = Number(product?.tier1MinQty ?? product?.tier1_min_qty ?? 51);
  const tier1Pct = Number(product?.tier1DiscountPct ?? product?.tier1_discount_pct ?? 10);
  const tier2Min = Number(product?.tier2MinQty ?? product?.tier2_min_qty ?? 201);
  const tier2Pct = Number(product?.tier2DiscountPct ?? product?.tier2_discount_pct ?? 20);

  let discountPct = 0;
  let activeTierLabel = "Standard Price";
  let tierBadge = "";

  if (qty >= tier2Min && tier2Pct > 0) {
    discountPct = tier2Pct;
    activeTierLabel = `Bulk Tier (${tier2Pct}% OFF for ${tier2Min}+ ${unit})`;
    tierBadge = `${tier2Pct}% OFF`;
  } else if (qty >= tier1Min && tier1Pct > 0) {
    discountPct = tier1Pct;
    activeTierLabel = `Wholesale Tier (${tier1Pct}% OFF for ${tier1Min}-${tier2Min - 1} ${unit})`;
    tierBadge = `${tier1Pct}% OFF`;
  }

  const originalTotal = basePrice * qty;
  const discountedUnitPrice = basePrice * (1 - discountPct / 100);
  const total = originalTotal * (1 - discountPct / 100);
  const savings = originalTotal - total;

  return {
    basePrice,
    discountedUnitPrice: Math.round(discountedUnitPrice * 100) / 100,
    unitPrice: Math.round(discountedUnitPrice * 100) / 100,
    discountPct,
    activeTierLabel,
    tierBadge,
    originalTotal: Math.round(originalTotal * 100) / 100,
    total: Math.round(total * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    isDiscounted: discountPct > 0,
    unit,
    tier1Min,
    tier1Pct,
    tier2Min,
    tier2Pct,
  };
}

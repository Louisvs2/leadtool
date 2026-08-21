export const TARGET_INDUSTRIES = [
  "Fashion",
  "Food",
  "Technology",
  "Automotive",
  "Beauty",
  "Sports",
  "Lifestyle",
  "E-Commerce",
  "Hospitality",
  "Real Estate",
  "Architecture",
  "Industry",
] as const;

export const COUNTRIES = [
  "Germany",
  "Austria",
  "Switzerland",
  "United Kingdom",
  "Netherlands",
  "France",
  "United States",
] as const;

export const DEFAULT_RESEARCH_KEYWORDS = [
  "campaign",
  "launch",
  "rebranding",
  "new product",
  "marketing",
  "social media",
  "content",
] as const;

export const OPPORTUNITY_VALUE_PRESETS = [10000, 15000, 25000, 50000] as const;

export const CAPABILITIES = ["Film", "Design", "AI", "3D", "Digital"] as const;

// High-budget-potential industries get a small scoring bonus — matches the
// spec's guidance to prioritize brand-quality / marketing-active companies
// over generic small businesses.
export const HIGH_BUDGET_INDUSTRIES = new Set([
  "Fashion",
  "Automotive",
  "Beauty",
  "Technology",
  "Hospitality",
  "Real Estate",
]);

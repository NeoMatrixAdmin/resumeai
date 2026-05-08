export type PricingTier = 'TIER1' | 'TIER2' | 'TIER3';

export interface PricingInfo {
  currency: string;
  symbol: string;
  amount: number;
  amountDisplay: string;
  countryCode: string;
  countryName: string;
  tier: PricingTier;
}

// TIER 1: High Income (~$9 / Billed at ₹750)
const TIER1 = new Set(['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'CH', 'SE', 'NO', 'DK', 'FI', 'SG', 'AE', 'JP', 'KR', 'IL', 'AT', 'BE', 'LU']);

// TIER 2: Medium Income (~$5 / Billed at ₹400)
const TIER2 = new Set(['BR', 'MX', 'AR', 'CL', 'CO', 'ZA', 'TR', 'PL', 'RO', 'RU', 'CN', 'MY', 'TH', 'SA', 'QA', 'HU', 'CZ', 'GR', 'PT', 'BG', 'HR', 'RS']);

// TIER 3: Lower Income (~$2.50 / Billed at ₹199)
const TIER3 = new Set(['IN', 'PK', 'BD', 'LK', 'NP', 'NG', 'KE', 'GH', 'UG', 'TZ', 'PH', 'ID', 'VN', 'EG', 'UA', 'MA', 'DZ']);

// Localized Display Pricing (For the landing page UI)
// If a country is not listed here, it will automatically fall back to the USD equivalent for its tier.
const DISPLAY_PRICING: Record<string, { currency: string; symbol: string; amount: number; name: string }> = {
  IN: { currency: 'INR', symbol: '₹', amount: 199, name: 'India' },
  US: { currency: 'USD', symbol: '$', amount: 9, name: 'United States' },
  GB: { currency: 'GBP', symbol: '£', amount: 7, name: 'United Kingdom' },
  CA: { currency: 'CAD', symbol: 'CA$', amount: 12, name: 'Canada' },
  AU: { currency: 'AUD', symbol: 'A$', amount: 13, name: 'Australia' },
  SG: { currency: 'SGD', symbol: 'S$', amount: 12, name: 'Singapore' },
  AE: { currency: 'AED', symbol: 'AED', amount: 33, name: 'UAE' },
  BR: { currency: 'BRL', symbol: 'R$', amount: 25, name: 'Brazil' }, 
  NG: { currency: 'NGN', symbol: '₦', amount: 4000, name: 'Nigeria' }, 
  ZA: { currency: 'ZAR', symbol: 'R', amount: 95, name: 'South Africa' }, 
  KE: { currency: 'KES', symbol: 'KSh', amount: 350, name: 'Kenya' },
  GH: { currency: 'GHS', symbol: 'GH₵', amount: 40, name: 'Ghana' },
  JP: { currency: 'JPY', symbol: '¥', amount: 1300, name: 'Japan' },
  KR: { currency: 'KRW', symbol: '₩', amount: 12000, name: 'South Korea' },
  CN: { currency: 'CNY', symbol: '¥', amount: 35, name: 'China' }, 
  RU: { currency: 'RUB', symbol: '₽', amount: 450, name: 'Russia' },
  TR: { currency: 'TRY', symbol: '₺', amount: 160, name: 'Turkey' },
  PL: { currency: 'PLN', symbol: 'zł', amount: 20, name: 'Poland' },
  UA: { currency: 'UAH', symbol: '₴', amount: 100, name: 'Ukraine' },
  RO: { currency: 'RON', symbol: 'RON', amount: 25, name: 'Romania' },
};

export function getPricingForCountry(countryCode: string): PricingInfo {
  const code = countryCode.toUpperCase();
  
  // 1. Determine the Billing Tier (Default to Tier 1 to prevent VPN abuse from unknown regions)
  let tier: PricingTier = 'TIER1'; 
  if (TIER2.has(code)) tier = 'TIER2';
  if (TIER3.has(code)) tier = 'TIER3';

  // 2. Determine Display Info
  let display = DISPLAY_PRICING[code];
  
  if (!display) {
    // Fallback if country is not in the explicit display dictionary
    if (tier === 'TIER1') {
      display = { currency: 'USD', symbol: '$', amount: 9, name: 'International' };
    } else if (tier === 'TIER2') {
      display = { currency: 'USD', symbol: '$', amount: 5, name: 'International' };
    } else {
      display = { currency: 'USD', symbol: '$', amount: 2.50, name: 'International' };
    }
  }

  // Ensure trailing zero for cents if needed (e.g., $2.50)
  const formattedAmount = Number.isInteger(display.amount) 
    ? display.amount.toString() 
    : display.amount.toFixed(2);

  return {
    currency: display.currency,
    symbol: display.symbol,
    amount: display.amount,
    amountDisplay: `${display.symbol}${formattedAmount}`,
    countryCode: code,
    countryName: display.name,
    tier
  };
}
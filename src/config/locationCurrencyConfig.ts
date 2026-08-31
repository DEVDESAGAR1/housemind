// ============================================================================
// HOUSEMIND GLOBAL LOCATION & CURRENCY CONFIGURATION ENGINE
// Deterministic Country, Timezone, Locale, Currency & Financial Rails Registry
// ============================================================================

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  defaultLocale: string;
  minorUnits: number;
  flag: string;
}

export interface CountryConfig {
  code: string;
  name: string;
  defaultCurrency: string;
  defaultLocale: string;
  defaultTimezone: string;
  flag: string;
  regions: string[];
  localizedCategories: string[];
  paymentRails: string[];
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    defaultLocale: 'en-IN',
    minorUnits: 2,
    flag: '🇮🇳',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    defaultLocale: 'en-US',
    minorUnits: 2,
    flag: '🇺🇸',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    defaultLocale: 'de-DE',
    minorUnits: 2,
    flag: '🇪🇺',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    defaultLocale: 'en-GB',
    minorUnits: 2,
    flag: '🇬🇧',
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    defaultLocale: 'en-AE',
    minorUnits: 2,
    flag: '🇦🇪',
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    defaultLocale: 'en-CA',
    minorUnits: 2,
    flag: '🇨🇦',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    defaultLocale: 'en-AU',
    minorUnits: 2,
    flag: '🇦🇺',
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    defaultLocale: 'en-SG',
    minorUnits: 2,
    flag: '🇸🇬',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    defaultLocale: 'ja-JP',
    minorUnits: 0,
    flag: '🇯🇵',
  },
  NZD: {
    code: 'NZD',
    symbol: 'NZ$',
    name: 'New Zealand Dollar',
    defaultLocale: 'en-NZ',
    minorUnits: 2,
    flag: '🇳🇿',
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Swiss Franc',
    defaultLocale: 'de-CH',
    minorUnits: 2,
    flag: '🇨🇭',
  },
  HKD: {
    code: 'HKD',
    symbol: 'HK$',
    name: 'Hong Kong Dollar',
    defaultLocale: 'en-HK',
    minorUnits: 2,
    flag: '🇭🇰',
  },
  SEK: {
    code: 'SEK',
    symbol: 'kr',
    name: 'Swedish Krona',
    defaultLocale: 'sv-SE',
    minorUnits: 2,
    flag: '🇸🇪',
  },
};

export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  {
    code: 'IN',
    name: 'India',
    defaultCurrency: 'INR',
    defaultLocale: 'en-IN',
    defaultTimezone: 'Asia/Kolkata',
    flag: '🇮🇳',
    regions: [
      'Maharashtra',
      'Karnataka',
      'Delhi (NCR)',
      'Tamil Nadu',
      'Telangana',
      'Gujarat',
      'Uttar Pradesh',
      'West Bengal',
      'Kerala',
      'Rajasthan',
      'Haryana',
      'Punjab',
      'Andhra Pradesh',
      'Madhya Pradesh',
      'Bihar',
      'Odisha',
      'Goa',
      'Chandigarh',
      'Assam',
      'Uttarakhand',
    ],
    localizedCategories: [
      'Electricity (DISCOM)',
      'Water & Sewerage',
      'LPG / Piped Natural Gas',
      'Society Maintenance / HOA',
      'House Rent',
      'Property Tax (Municipal)',
      'Home Insurance',
      'Home Loan EMI / Mortgage',
      'Broadband & WiFi',
      'Mobile Postpaid / Recharge',
      'Groceries & Provisions',
      'Domestic Help / Cook / Maid',
      'Vehicle Fuel (Petrol/Diesel/CNG)',
      'School / Education Fees',
      'Subscriptions & OTT',
      'Home Repairs & Maintenance',
    ],
    paymentRails: [
      'UPI (GPay / PhonePe / Paytm / CRED)',
      'IMPS (Immediate Payment)',
      'NEFT / RTGS',
      'Net Banking',
      'Debit Card',
      'Credit Card',
      'NACH / e-Mandate (Auto-Debit)',
      'Cheque',
      'Cash',
    ],
  },
  {
    code: 'US',
    name: 'United States',
    defaultCurrency: 'USD',
    defaultLocale: 'en-US',
    defaultTimezone: 'America/New_York',
    flag: '🇺🇸',
    regions: [
      'California',
      'New York',
      'Texas',
      'Washington',
      'Florida',
      'Illinois',
      'Pennsylvania',
      'Ohio',
      'Georgia',
      'North Carolina',
      'Michigan',
      'New Jersey',
      'Virginia',
      'Massachusetts',
      'Colorado',
      'Arizona',
      'Oregon',
      'Minnesota',
      'Maryland',
      'Utah',
    ],
    localizedCategories: [
      'Mortgage / Rent',
      'Electricity',
      'Natural Gas / Heating Oil',
      'Water & Sewer',
      'Trash & Recycling',
      'HOA Dues / Condo Fees',
      'Property Tax',
      'Homeowners / Renters Insurance',
      'Internet & Cable',
      'Mobile Phone',
      'Groceries & Supermarket',
      'Auto Fuel / EV Charging',
      'Auto Loan / Lease',
      'Home Maintenance & Landscaping',
      'Streaming & Subscriptions',
      'Healthcare / Medical Copays',
    ],
    paymentRails: [
      'ACH Direct Debit',
      'Wire Transfer',
      'Zelle',
      'Venmo',
      'Credit Card',
      'Debit Card',
      'Online Bill Pay',
      'Paper Check',
      'Cash',
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    defaultCurrency: 'GBP',
    defaultLocale: 'en-GB',
    defaultTimezone: 'Europe/London',
    flag: '🇬🇧',
    regions: [
      'Greater London',
      'South East',
      'North West',
      'Scotland',
      'Wales',
      'Northern Ireland',
      'West Midlands',
      'Yorkshire and the Humber',
      'East Midlands',
      'South West',
      'East of England',
      'North East',
    ],
    localizedCategories: [
      'Rent / Mortgage',
      'Council Tax',
      'Electricity & Gas (Energy Cap)',
      'Water Rates',
      'Home & Contents Insurance',
      'Broadband & Fibre',
      'Mobile Contract',
      'Groceries & Supermarkets',
      'Transport / Rail & Fuel',
      'Ground Rent & Service Charge',
      'Home Maintenance & Tradespeople',
      'TV Licence & Subscriptions',
    ],
    paymentRails: [
      'Faster Payments',
      'BACS Direct Debit',
      'Standing Order',
      'Debit Card',
      'Credit Card',
      'CHAPS',
      'Cash',
    ],
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    defaultCurrency: 'AED',
    defaultLocale: 'en-AE',
    defaultTimezone: 'Asia/Dubai',
    flag: '🇦🇪',
    regions: [
      'Dubai',
      'Abu Dhabi',
      'Sharjah',
      'Ajman',
      'Ras Al Khaimah',
      'Fujairah',
      'Umm Al Quwain',
    ],
    localizedCategories: [
      'Rent (Ejari / Housing Fee)',
      'DEWA / SEWA / FEWA (Power & Water)',
      'District Cooling (Empower / Tabreed)',
      'Building Service Charges',
      'Home & Contents Insurance',
      'Home Fibre Broadband',
      'Mobile Postpaid',
      'Groceries & Provisions',
      'Fuel & Salik Tolls',
      'Home Maintenance / Annual AMC',
      'Domestic Help / Sponsorship Fees',
      'Subscriptions & Entertainment',
    ],
    paymentRails: [
      'UAEFTS Direct Bank Transfer',
      'UAEDDS Direct Debit',
      'Debit Card',
      'Credit Card',
      'Cheque / Post-Dated Cheques',
      'Cash',
    ],
  },
  {
    code: 'CA',
    name: 'Canada',
    defaultCurrency: 'CAD',
    defaultLocale: 'en-CA',
    defaultTimezone: 'America/Toronto',
    flag: '🇨🇦',
    regions: [
      'Ontario',
      'Quebec',
      'British Columbia',
      'Alberta',
      'Manitoba',
      'Saskatchewan',
      'Nova Scotia',
      'New Brunswick',
      'Newfoundland and Labrador',
      'Prince Edward Island',
    ],
    localizedCategories: [
      'Mortgage / Rent',
      'Hydro / Electricity',
      'Natural Gas / Heating',
      'Water & Waste Utilities',
      'Condo / Strata Fees',
      'Municipal Property Taxes',
      'Home & Tenant Insurance',
      'Internet & Telecom',
      'Groceries',
      'Auto Loan & Fuel',
      'Home Maintenance & Snow Removal',
      'Subscriptions',
    ],
    paymentRails: [
      'Interac e-Transfer',
      'Pre-Authorized Debit (PAD)',
      'EFT Direct Deposit / Transfer',
      'Credit Card',
      'Debit Card',
      'Online Banking Bill Payment',
      'Cash',
    ],
  },
  {
    code: 'AU',
    name: 'Australia',
    defaultCurrency: 'AUD',
    defaultLocale: 'en-AU',
    defaultTimezone: 'Australia/Sydney',
    flag: '🇦🇺',
    regions: [
      'New South Wales',
      'Victoria',
      'Queensland',
      'Western Australia',
      'South Australia',
      'Tasmania',
      'Australian Capital Territory',
      'Northern Territory',
    ],
    localizedCategories: [
      'Rent / Home Loan Mortgage',
      'Council Rates',
      'Electricity & Gas Bills',
      'Water Usage & Supply',
      'Strata / Body Corporate Levies',
      'Building & Contents Insurance',
      'Internet & NBN',
      'Mobile Phone Plan',
      'Groceries',
      'Fuel & Public Transport',
      'Home Maintenance & Trade Services',
      'Subscriptions',
    ],
    paymentRails: [
      'PayID / NPP / Osko',
      'Direct Debit',
      'BPAY',
      'Debit Card',
      'Credit Card',
      'Bank Transfer',
      'Cash',
    ],
  },
  {
    code: 'DE',
    name: 'Germany',
    defaultCurrency: 'EUR',
    defaultLocale: 'de-DE',
    defaultTimezone: 'Europe/Berlin',
    flag: '🇩🇪',
    regions: [
      'Bavaria',
      'Baden-Württemberg',
      'North Rhine-Westphalia',
      'Berlin',
      'Hesse',
      'Saxony',
      'Lower Saxony',
      'Hamburg',
      'Rhineland-Palatinate',
      'Schleswig-Holstein',
    ],
    localizedCategories: [
      'Kaltmiete / Mortgage',
      'Nebenkosten / Warmmiete (Utilities)',
      'Strom (Electricity)',
      'Heizung & Gas (Heating)',
      'GEZ / Rundfunkbeitrag',
      'Hausrat- & Haftpflichtversicherung',
      'Internet & Festnetz',
      'Mobilfunkvertrag',
      'Lebensmittel & Supermarkt',
      'Treibstoff / ÖPNV Ticket',
      'Instandhaltungsrücklage',
      'Streaming & Abos',
    ],
    paymentRails: [
      'SEPA-Überweisung (Bank Transfer)',
      'SEPA-Lastschrift (Direct Debit)',
      'Girocard / Debitkarte',
      'Kreditkarte',
      'PayPal',
      'Bargeld (Cash)',
    ],
  },
  {
    code: 'SG',
    name: 'Singapore',
    defaultCurrency: 'SGD',
    defaultLocale: 'en-SG',
    defaultTimezone: 'Asia/Singapore',
    flag: '🇸🇬',
    regions: [
      'Central Region',
      'East Region',
      'North Region',
      'North-East Region',
      'West Region',
    ],
    localizedCategories: [
      'Mortgage / HDB Loan / Rent',
      'SP Group (Electricity & Water)',
      'Town Council S&CC / Condo Maintenance',
      'Property Tax (IRAS)',
      'Home & Fire Insurance',
      'Fibre Broadband',
      'Mobile Postpaid',
      'Groceries & Supermarket',
      'Transport / ERP / Fuel',
      'Aircon Quarterly Servicing',
      'Subscriptions',
    ],
    paymentRails: [
      'PayNow',
      'FAST Bank Transfer',
      'GIRO Auto-Debit',
      'Debit Card',
      'Credit Card',
      'NETS',
      'Cash',
    ],
  },
  {
    code: 'JP',
    name: 'Japan',
    defaultCurrency: 'JPY',
    defaultLocale: 'ja-JP',
    defaultTimezone: 'Asia/Tokyo',
    flag: '🇯🇵',
    regions: [
      'Tokyo',
      'Osaka',
      'Kanagawa',
      'Aichi',
      'Saitama',
      'Chiba',
      'Hyogo',
      'Hokkaido',
      'Fukuoka',
      'Kyoto',
    ],
    localizedCategories: [
      '家賃 / 住宅ローン (Rent/Mortgage)',
      '電気代 (Electricity)',
      'ガス代 (Gas)',
      '水道代 (Water)',
      '管理費 / 共益費 (Maintenance Fee)',
      '火災・地震保険 (Home Insurance)',
      '光回線 / インターネット (Internet)',
      'スマホ・通信費 (Mobile)',
      '食費 (Groceries)',
      '交通費・ガソリン (Transport/Fuel)',
      '固定資産税 (Property Tax)',
      'サブスク (Subscriptions)',
    ],
    paymentRails: [
      '銀行振込 (Bank Transfer)',
      '口座振替 (Direct Debit)',
      'クレジットカード (Credit Card)',
      'デビットカード (Debit Card)',
      'PayPay / コード決済',
      'コンビニ決済 (Convenience Store Payment)',
      '現金 (Cash)',
    ],
  },
];

// Fallback Country Configuration
export const DEFAULT_GLOBAL_COUNTRY: CountryConfig = {
  code: 'GLOBAL',
  name: 'Global / Other',
  defaultCurrency: 'USD',
  defaultLocale: 'en-US',
  defaultTimezone: 'UTC',
  flag: '🌐',
  regions: ['National / Default Region'],
  localizedCategories: [
    'Rent / Mortgage',
    'Electricity',
    'Water & Utilities',
    'Internet & Mobile',
    'Home Insurance',
    'Groceries',
    'Transport & Fuel',
    'Loan / EMI',
    'Home Maintenance',
    'Subscriptions',
    'Other Household Expense',
  ],
  paymentRails: [
    'Bank Transfer',
    'Direct Debit',
    'Debit Card',
    'Credit Card',
    'Wire Transfer',
    'Cash',
  ],
};

/**
 * Finds country configuration by code or name
 */
export function getCountryConfig(countryNameOrCode?: string | null): CountryConfig {
  if (!countryNameOrCode) return DEFAULT_GLOBAL_COUNTRY;
  const query = countryNameOrCode.trim().toLowerCase();
  
  const match = SUPPORTED_COUNTRIES.find(
    (c) =>
      c.code.toLowerCase() === query ||
      c.name.toLowerCase() === query ||
      query.includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(query)
  );

  return match || DEFAULT_GLOBAL_COUNTRY;
}

/**
 * Gets currency info for a given ISO code with fallback
 */
export function getCurrencyInfo(currencyCode?: string | null): CurrencyInfo {
  const code = (currencyCode || 'USD').trim().toUpperCase();
  if (SUPPORTED_CURRENCIES[code]) {
    return SUPPORTED_CURRENCIES[code];
  }
  return {
    code,
    symbol: code,
    name: `${code} Currency`,
    defaultLocale: 'en-US',
    minorUnits: 2,
    flag: '🌐',
  };
}

/**
 * Gets currency symbol safely
 */
export function getCurrencySymbol(currencyCode?: string | null): string {
  return getCurrencyInfo(currencyCode).symbol;
}

/**
 * Deterministic Currency Formatter
 * Handles Indian Lakhs/Crores for INR (₹1,50,000.00), zero decimals for JPY, etc.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode?: string | null,
  customLocale?: string | null
): string {
  const val = Number(amount) || 0;
  const currInfo = getCurrencyInfo(currencyCode);
  const locale = customLocale || currInfo.defaultLocale;

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currInfo.code,
      minimumFractionDigits: currInfo.minorUnits,
      maximumFractionDigits: currInfo.minorUnits,
    });
    return formatter.format(val);
  } catch {
    // Fallback if Intl fails with unusual code
    return `${currInfo.symbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: currInfo.minorUnits,
      maximumFractionDigits: currInfo.minorUnits,
    })}`;
  }
}

/**
 * Formats a pure number with appropriate locale grouping
 */
export function formatNumber(
  val: number | null | undefined,
  locale: string = 'en-US',
  decimals: number = 2
): string {
  const num = Number(val) || 0;
  return num.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Heuristic Document Currency Detector
 * Analyzes document text and detects currency symbol or code with confidence score
 */
export function detectCurrencyFromText(text: string): {
  currency: string | null;
  symbol: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  detectedReason?: string;
} {
  if (!text || text.trim().length === 0) {
    return { currency: null, symbol: null, confidence: 'none' };
  }

  // 1. Check Indian Rupee (₹, INR, Rs., Rs, Rupee, Rupee(s))
  if (/₹|\bINR\b|\bRs\.?\s*\d|\bRupees?\b/i.test(text)) {
    return { currency: 'INR', symbol: '₹', confidence: 'high', detectedReason: 'Detected ₹ / INR currency markers' };
  }

  // 2. Check British Pound (£, GBP)
  if (/£|\bGBP\b|\bSterling\b/i.test(text)) {
    return { currency: 'GBP', symbol: '£', confidence: 'high', detectedReason: 'Detected £ / GBP currency markers' };
  }

  // 3. Check Euro (€, EUR)
  if (/€|\bEUR\b|\bEuro\b/i.test(text)) {
    return { currency: 'EUR', symbol: '€', confidence: 'high', detectedReason: 'Detected € / EUR currency markers' };
  }

  // 4. Check UAE Dirham (AED, د.إ, Dirham)
  if (/\bAED\b|د\.إ|\bDirhams?\b/i.test(text)) {
    return { currency: 'AED', symbol: 'د.إ', confidence: 'high', detectedReason: 'Detected AED / Dirham currency markers' };
  }

  // 5. Check Japanese Yen (¥, JPY, 円)
  if (/\bJPY\b|円|\bYen\b/i.test(text)) {
    return { currency: 'JPY', symbol: '¥', confidence: 'high', detectedReason: 'Detected JPY currency markers' };
  }

  // 6. Check Canadian Dollar (CAD, C$)
  if (/\bCAD\b|C\$|\bCDN\b/i.test(text)) {
    return { currency: 'CAD', symbol: 'C$', confidence: 'high', detectedReason: 'Detected CAD currency markers' };
  }

  // 7. Check Australian Dollar (AUD, A$)
  if (/\bAUD\b|A\$/i.test(text)) {
    return { currency: 'AUD', symbol: 'A$', confidence: 'high', detectedReason: 'Detected AUD currency markers' };
  }

  // 8. Check Singapore Dollar (SGD, S$)
  if (/\bSGD\b|S\$/i.test(text)) {
    return { currency: 'SGD', symbol: 'S$', confidence: 'high', detectedReason: 'Detected SGD currency markers' };
  }

  // 9. Generic Dollar ($ / USD)
  if (/\bUSD\b/i.test(text)) {
    return { currency: 'USD', symbol: '$', confidence: 'high', detectedReason: 'Detected explicit USD code' };
  }

  if (/\$\s*\d/.test(text)) {
    return { currency: 'USD', symbol: '$', confidence: 'medium', detectedReason: 'Detected $ symbol (defaulting to USD candidate)' };
  }

  return { currency: null, symbol: null, confidence: 'none', detectedReason: 'No unambiguous currency symbol detected' };
}

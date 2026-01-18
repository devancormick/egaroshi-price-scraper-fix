/**
 * Price parsing and normalization utilities
 */

/**
 * Parse price string to number
 * @param {string} priceString - Price string (e.g., "$29.99", "€25,50", "£15.00")
 * @returns {number|null} - Parsed price or null if invalid
 */
export function parsePrice(priceString) {
  if (!priceString || typeof priceString !== 'string') {
    return null;
  }

  // Remove currency symbols and common separators
  let cleaned = priceString
    .replace(/[\$€£¥₹]/, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .trim();

  // Handle decimal separators (both . and ,)
  cleaned = cleaned.replace(/[^\d.]/g, '');

  const price = parseFloat(cleaned);

  // Validate price
  if (isNaN(price) || price <= 0) {
    return null;
  }

  return Math.round(price * 100) / 100; // Round to 2 decimal places
}

/**
 * Extract currency symbol from price string
 * @param {string} priceString - Price string
 * @returns {string} - Currency symbol or 'USD' as default
 */
export function extractCurrency(priceString) {
  if (!priceString || typeof priceString !== 'string') {
    return 'USD';
  }

  if (priceString.includes('$')) return 'USD';
  if (priceString.includes('€')) return 'EUR';
  if (priceString.includes('£')) return 'GBP';
  if (priceString.includes('¥')) return 'JPY';
  if (priceString.includes('₹')) return 'INR';

  return 'USD'; // Default
}

/**
 * Normalize price object
 * @param {Object} priceData - Raw price data
 * @returns {Object|null} - Normalized price object
 */
export function normalizePrice(priceData) {
  if (!priceData) return null;

  const { price, salePrice, listPrice, currency } = priceData;

  // Prioritize sale price if available
  const finalPrice = salePrice || price || listPrice;
  const parsedPrice = parsePrice(finalPrice);

  if (!parsedPrice) {
    return null;
  }

  return {
    price: parsedPrice,
    originalPrice: listPrice ? parsePrice(listPrice) : parsedPrice,
    salePrice: salePrice ? parsePrice(salePrice) : null,
    currency: currency || extractCurrency(finalPrice),
    isOnSale: !!salePrice && salePrice !== price
  };
}

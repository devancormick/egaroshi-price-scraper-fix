/**
 * Price validation utilities
 */

/**
 * Validate if price is within reasonable range
 * @param {number} price - Price to validate
 * @param {number} minPrice - Minimum acceptable price (default: 0.01)
 * @param {number} maxPrice - Maximum acceptable price (default: 1000000)
 * @returns {boolean} - True if valid
 */
export function isValidPriceRange(price, minPrice = 0.01, maxPrice = 1000000) {
  if (typeof price !== 'number' || isNaN(price)) {
    return false;
  }

  return price >= minPrice && price <= maxPrice;
}

/**
 * Check if price change is within acceptable threshold
 * @param {number} oldPrice - Previous price
 * @param {number} newPrice - New price
 * @param {number} thresholdPercent - Maximum acceptable change percentage (default: 50)
 * @returns {boolean} - True if change is reasonable
 */
export function isReasonablePriceChange(oldPrice, newPrice, thresholdPercent = 50) {
  if (!oldPrice || !newPrice) {
    return true; // Can't validate without both prices
  }

  const changePercent = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
  return changePercent <= thresholdPercent;
}

/**
 * Validate scraped price data
 * @param {Object} priceData - Price data object
 * @returns {Object} - Validation result
 */
export function validatePriceData(priceData) {
  const result = {
    isValid: true,
    errors: []
  };

  if (!priceData) {
    result.isValid = false;
    result.errors.push('Price data is null or undefined');
    return result;
  }

  if (!priceData.price || typeof priceData.price !== 'number') {
    result.isValid = false;
    result.errors.push('Price is missing or invalid');
  } else if (!isValidPriceRange(priceData.price)) {
    result.isValid = false;
    result.errors.push(`Price ${priceData.price} is outside valid range`);
  }

  if (!priceData.currency) {
    result.errors.push('Currency is missing (using default: USD)');
  }

  return result;
}

/**
 * Check if product is out of stock based on price indicators
 * @param {string} html - HTML content
 * @returns {boolean} - True if appears out of stock
 */
export function isOutOfStock(html) {
  if (!html || typeof html !== 'string') {
    return false;
  }

  const outOfStockIndicators = [
    /out of stock/i,
    /currently unavailable/i,
    /temporarily out of stock/i,
    /unavailable/i,
    /sold out/i
  ];

  return outOfStockIndicators.some(pattern => pattern.test(html));
}

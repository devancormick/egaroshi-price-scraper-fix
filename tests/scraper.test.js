import { PriceScraper } from '../src/scraper.js';
import { AmazonExtractor } from '../src/extractors/amazon.js';
import { WalmartExtractor } from '../src/extractors/walmart.js';
import { parsePrice, normalizePrice } from '../src/utils/priceParser.js';
import { validatePriceData } from '../src/utils/validator.js';

/**
 * Basic test suite for price scraper
 * Note: These are unit tests for extractors and utilities
 * Integration tests with Decodo API require valid API key
 */

describe('Price Parser Utilities', () => {
  test('parsePrice should extract number from price string', () => {
    expect(parsePrice('$29.99')).toBe(29.99);
    expect(parsePrice('€25,50')).toBe(25.5);
    expect(parsePrice('£15.00')).toBe(15);
    expect(parsePrice('invalid')).toBeNull();
    expect(parsePrice('')).toBeNull();
  });

  test('normalizePrice should create valid price object', () => {
    const result = normalizePrice({ price: '$29.99' });
    expect(result).toBeTruthy();
    expect(result.price).toBe(29.99);
    expect(result.currency).toBe('USD');
  });
});

describe('Price Validator', () => {
  test('validatePriceData should validate price objects', () => {
    const validPrice = { price: 29.99, currency: 'USD' };
    const result = validatePriceData(validPrice);
    expect(result.isValid).toBe(true);
  });

  test('validatePriceData should reject invalid prices', () => {
    const invalidPrice = { price: 0 };
    const result = validatePriceData(invalidPrice);
    expect(result.isValid).toBe(false);
  });
});

describe('Vendor Detection', () => {
  test('detectVendor should identify Amazon URLs', () => {
    const scraper = new PriceScraper('test-key');
    expect(scraper.detectVendor('https://amazon.com/product')).toBe('amazon');
    expect(scraper.detectVendor('https://www.amazon.co.uk/product')).toBe('amazon');
  });

  test('detectVendor should identify Walmart URLs', () => {
    const scraper = new PriceScraper('test-key');
    expect(scraper.detectVendor('https://walmart.com/product')).toBe('walmart');
  });
});

// Note: Full integration tests require valid Decodo API key and test URLs

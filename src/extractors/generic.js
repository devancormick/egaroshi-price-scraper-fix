import * as cheerio from 'cheerio';
import { parsePrice, normalizePrice } from '../utils/priceParser.js';

/**
 * Generic price extractor using common methods
 * Used as fallback when vendor-specific extractors fail
 */
export class GenericExtractor {
  /**
   * Extract price from HTML using common methods
   * @param {string} html - HTML content
   * @returns {Object|null} - Price data or null
   */
  extract(html) {
    if (!html) return null;

    const $ = cheerio.load(html);

    // Method 1: Try JSON-LD structured data
    const jsonLdPrice = this.extractFromJsonLd($);
    if (jsonLdPrice) return jsonLdPrice;

    // Method 2: Try Open Graph meta tags
    const ogPrice = this.extractFromOpenGraph($);
    if (ogPrice) return ogPrice;

    // Method 3: Try common CSS selectors
    const cssPrice = this.extractFromCommonSelectors($);
    if (cssPrice) return cssPrice;

    return null;
  }

  /**
   * Extract price from JSON-LD structured data
   */
  extractFromJsonLd($) {
    const jsonLdScripts = $('script[type="application/ld+json"]');

    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const script = jsonLdScripts[i];
        const content = $(script).html();
        if (!content) continue;

        const data = JSON.parse(content);
        const price = this.findPriceInJsonLd(data);
        if (price) return normalizePrice(price);
      } catch (e) {
        // Continue to next script
        continue;
      }
    }

    return null;
  }

  /**
   * Recursively find price in JSON-LD structure
   */
  findPriceInJsonLd(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // Check for direct price properties
    if (obj.price !== undefined || obj.offers?.price !== undefined) {
      const price = obj.price || obj.offers?.price;
      const priceType = obj.priceCurrency || obj.offers?.priceCurrency;
      
      return {
        price: price,
        currency: priceType
      };
    }

    // Recursively search in nested objects
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        const result = this.findPriceInJsonLd(obj[key]);
        if (result) return result;
      }
    }

    return null;
  }

  /**
   * Extract price from Open Graph meta tags
   */
  extractFromOpenGraph($) {
    const ogPrice = $('meta[property="product:price:amount"]').attr('content');
    const ogCurrency = $('meta[property="product:price:currency"]').attr('content');

    if (ogPrice) {
      return normalizePrice({
        price: ogPrice,
        currency: ogCurrency || 'USD'
      });
    }

    return null;
  }

  /**
   * Extract price from common CSS selectors
   */
  extractFromCommonSelectors($) {
    const selectors = [
      '.price',
      '.product-price',
      '[class*="price"]',
      '[id*="price"]',
      '[data-price]',
      '.current-price',
      '.sale-price'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const priceText = element.text().trim() || element.attr('data-price');
        if (priceText) {
          const price = parsePrice(priceText);
          if (price) {
            return normalizePrice({ price: price.toString() });
          }
        }
      }
    }

    return null;
  }
}

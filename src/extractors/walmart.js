import * as cheerio from 'cheerio';
import { parsePrice, normalizePrice } from '../utils/priceParser.js';

/**
 * Walmart-specific price extractor
 * Handles Walmart's embedded JSON state and pricing variants
 */
export class WalmartExtractor {
  /**
   * Extract price from Walmart product page HTML
   * @param {string} html - HTML content
   * @returns {Object|null} - Price data or null
   */
  extract(html) {
    if (!html) return null;

    const $ = cheerio.load(html);

    // Method 1: Extract from embedded JSON state
    const jsonPrice = this.extractFromJsonState($, html);
    if (jsonPrice) return jsonPrice;

    // Method 2: Extract from price display elements
    const displayPrice = this.extractFromPriceDisplay($);
    if (displayPrice) return displayPrice;

    // Method 3: Extract from meta tags
    const metaPrice = this.extractFromMetaTags($);
    if (metaPrice) return metaPrice;

    return null;
  }

  /**
   * Extract price from Walmart's embedded JSON state
   */
  extractFromJsonState($, html) {
    // Walmart often embeds product data in script tags
    const scriptPatterns = [
      /window\.__WML_REDUX_INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/,
      /"product":\s*(\{[\s\S]*?"price":[\s\S]*?\})/,
      /"pricing":\s*(\{[\s\S]*?\})/
    ];

    for (const pattern of scriptPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          const stateData = JSON.parse(match[1]);
          const price = this.findPriceInState(stateData);
          if (price) return price;
        } catch (e) {
          continue;
        }
      }
    }

    // Try to find in script tags directly
    const scripts = $('script');
    for (let i = 0; i < scripts.length; i++) {
      const scriptContent = $(scripts[i]).html();
      if (!scriptContent) continue;

      for (const pattern of scriptPatterns) {
        const match = scriptContent.match(pattern);
        if (match) {
          try {
            const stateData = JSON.parse(match[1]);
            const price = this.findPriceInState(stateData);
            if (price) return price;
          } catch (e) {
            continue;
          }
        }
      }
    }

    return null;
  }

  /**
   * Recursively find price in Walmart state object
   */
  findPriceInState(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // Check for common Walmart price properties
    if (obj.price !== undefined) {
      const price = typeof obj.price === 'object' ? obj.price.current?.price || obj.price.price : obj.price;
      const currency = obj.currency || 'USD';
      
      if (price) {
        const listPrice = obj.price.was || obj.wasPrice || obj.listPrice;
        
        return normalizePrice({
          price: price.toString(),
          listPrice: listPrice ? listPrice.toString() : null,
          currency: currency
        });
      }
    }

    // Check nested pricing objects
    if (obj.pricing) {
      const price = obj.pricing.price || obj.pricing.currentPrice;
      const listPrice = obj.pricing.wasPrice || obj.pricing.rollbackPrice;
      
      if (price) {
        return normalizePrice({
          price: price.toString(),
          listPrice: listPrice ? listPrice.toString() : null
        });
      }
    }

    // Recursively search
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        const result = this.findPriceInState(obj[key]);
        if (result) return result;
      }
    }

    return null;
  }

  /**
   * Extract from price display elements
   */
  extractFromPriceDisplay($) {
    const selectors = [
      '[data-testid="product-price"]',
      '[class*="PriceDisplay"]',
      '[class*="price-display"]',
      '.prod-PriceHero .price',
      '[itemprop="price"]'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const priceText = element.text().trim() || element.attr('content');
        if (priceText) {
          const price = parsePrice(priceText);
          
          if (price) {
            // Try to find original/was price
            const wasPriceElement = element.siblings('[class*="was-price"]').first() ||
                                   element.parent().find('[class*="was-price"]').first();
            let wasPrice = null;
            
            if (wasPriceElement.length) {
              wasPrice = parsePrice(wasPriceElement.text());
            }

            return normalizePrice({
              price: price.toString(),
              listPrice: wasPrice ? wasPrice.toString() : null
            });
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract from meta tags
   */
  extractFromMetaTags($) {
    // Try Open Graph
    const ogPrice = $('meta[property="product:price:amount"]').attr('content');
    if (ogPrice) {
      const currency = $('meta[property="product:price:currency"]').attr('content') || 'USD';
      return normalizePrice({
        price: ogPrice,
        currency: currency
      });
    }

    // Try itemprop
    const itemPrice = $('[itemprop="price"]').attr('content');
    if (itemPrice) {
      return normalizePrice({ price: itemPrice });
    }

    return null;
  }

  /**
   * Check if price is a rollback price
   */
  isRollbackPrice(html) {
    if (!html) return false;
    return /rollback|reduced price/i.test(html);
  }
}

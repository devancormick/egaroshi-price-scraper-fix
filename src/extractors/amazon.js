import * as cheerio from 'cheerio';
import { parsePrice, normalizePrice } from '../utils/priceParser.js';

/**
 * Amazon-specific price extractor
 * Handles various Amazon price formats and variants
 */
export class AmazonExtractor {
  /**
   * Extract price from Amazon product page HTML
   * @param {string} html - HTML content
   * @returns {Object|null} - Price data or null
   */
  extract(html) {
    if (!html) return null;

    const $ = cheerio.load(html);

    // Method 1: Extract from embedded JSON data
    const jsonPrice = this.extractFromJsonData($, html);
    if (jsonPrice) return jsonPrice;

    // Method 2: Extract from priceToPay element
    const priceToPay = this.extractFromPriceToPay($);
    if (priceToPay) return priceToPay;

    // Method 3: Extract from offer blocks
    const offerPrice = this.extractFromOffers($);
    if (offerPrice) return offerPrice;

    // Method 4: Extract from A-core-price elements
    const corePrice = this.extractFromCorePrice($);
    if (corePrice) return corePrice;

    return null;
  }

  /**
   * Extract price from embedded JSON data in script tags
   */
  extractFromJsonData($, html) {
    // Look for common Amazon JSON data patterns
    const jsonPatterns = [
      /"buyingPrice":\s*(\{[\s\S]*?\})/,
      /"priceToPay":\s*(\{[\s\S]*?\})/,
      /"offerPrice":\s*(\{[\s\S]*?\})/
    ];

    for (const pattern of jsonPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          const priceData = JSON.parse(match[1]);
          const amount = priceData.amount || priceData.price || priceData.value;
          const currency = priceData.currency || 'USD';

          if (amount) {
            return normalizePrice({
              price: amount,
              currency: currency
            });
          }
        } catch (e) {
          // Continue to next pattern
          continue;
        }
      }
    }

    // Try to find JSON-LD with Product schema
    const jsonLdScripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const content = $(jsonLdScripts[i]).html();
        if (!content) continue;

        const data = JSON.parse(content);
        if (data['@type'] === 'Product' || Array.isArray(data) && data.find(d => d['@type'] === 'Product')) {
          const product = Array.isArray(data) ? data.find(d => d['@type'] === 'Product') : data;
          
          if (product.offers) {
            const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
            if (offers.price) {
              return normalizePrice({
                price: offers.price,
                currency: offers.priceCurrency || 'USD'
              });
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  /**
   * Extract from Amazon's priceToPay element
   */
  extractFromPriceToPay($) {
    const selectors = [
      '[id="priceToPay"]',
      '[class*="priceToPay"]',
      '.a-price.a-text-price.a-size-medium.apexPriceToPay'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const priceText = element.find('.a-offscreen').text() || element.text();
        const price = parsePrice(priceText);
        
        if (price) {
          return normalizePrice({ price: price.toString() });
        }
      }
    }

    return null;
  }

  /**
   * Extract from offer blocks
   */
  extractFromOffers($) {
    const offerSelectors = [
      '[data-a-color="price"]',
      '.a-price',
      '.a-price-whole'
    ];

    for (const selector of offerSelectors) {
      const elements = $(selector);
      
      for (let i = 0; i < elements.length; i++) {
        const element = $(elements[i]);
        const priceText = element.find('.a-offscreen').text() || element.text();
        const price = parsePrice(priceText);
        
        if (price) {
          // Check for list price to determine if on sale
          const listPriceElement = element.siblings('[data-a-strike="true"]').first();
          let listPrice = null;
          
          if (listPriceElement.length) {
            listPrice = parsePrice(listPriceElement.find('.a-offscreen').text() || listPriceElement.text());
          }

          return normalizePrice({
            price: price.toString(),
            listPrice: listPrice ? listPrice.toString() : null
          });
        }
      }
    }

    return null;
  }

  /**
   * Extract from A-core-price elements (newer Amazon format)
   */
  extractFromCorePrice($) {
    const corePrice = $('[class*="a-price-whole"]').first();
    const coreFraction = $('[class*="a-price-fraction"]').first();

    if (corePrice.length) {
      const whole = corePrice.text().replace(/[^\d]/g, '');
      const fraction = coreFraction.length ? coreFraction.text().replace(/[^\d]/g, '') : '00';
      
      if (whole) {
        const priceString = `${whole}.${fraction}`;
        const price = parsePrice(priceString);
        
        if (price) {
          return normalizePrice({ price: price.toString() });
        }
      }
    }

    return null;
  }

  /**
   * Check if product requires "see price in cart"
   */
  isCartPrice(html) {
    if (!html) return false;
    
    return /see price in cart|add to cart to see price|price available in cart/i.test(html);
  }
}

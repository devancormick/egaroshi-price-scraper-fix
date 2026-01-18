import axios from 'axios';
import * as cheerio from 'cheerio';
import { AmazonExtractor } from './extractors/amazon.js';
import { WalmartExtractor } from './extractors/walmart.js';
import { GenericExtractor } from './extractors/generic.js';
import { validatePriceData, isOutOfStock } from './utils/validator.js';

/**
 * Main price scraper class using Decodo API
 */
export class PriceScraper {
  constructor(apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('Decodo API key is required');
    }

    this.apiKey = apiKey;
    this.apiUrl = options.apiUrl || process.env.DECODO_API_URL || 'https://api.decodo.com/v1';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.timeout = options.timeout || 30000;

    // Initialize extractors
    this.amazonExtractor = new AmazonExtractor();
    this.walmartExtractor = new WalmartExtractor();
    this.genericExtractor = new GenericExtractor();
  }

  /**
   * Get price from product URL
   * @param {string} url - Product URL
   * @param {Object} options - Scraping options
   * @returns {Promise<Object>} - Price data
   */
  async getPrice(url, options = {}) {
    if (!url || typeof url !== 'string') {
      throw new Error('Valid URL is required');
    }

    const vendor = this.detectVendor(url);
    const html = await this.fetchHtml(url, options);
    
    if (!html) {
      throw new Error('Failed to fetch HTML content');
    }

    // Check if out of stock
    if (isOutOfStock(html) && !options.allowOutOfStock) {
      return {
        url,
        vendor,
        error: 'Product appears to be out of stock',
        available: false
      };
    }

    // Extract price using vendor-specific extractor
    let priceData = null;
    
    try {
      switch (vendor) {
        case 'amazon':
          priceData = this.amazonExtractor.extract(html);
          break;
        case 'walmart':
          priceData = this.walmartExtractor.extract(html);
          break;
        default:
          priceData = this.genericExtractor.extract(html);
          // Try vendor-specific extractors as fallback
          if (!priceData) {
            priceData = this.amazonExtractor.extract(html) || 
                       this.walmartExtractor.extract(html);
          }
      }
    } catch (error) {
      console.error(`Error extracting price for ${vendor}:`, error);
    }

    if (!priceData) {
      return {
        url,
        vendor,
        error: 'Could not extract price from page',
        available: false
      };
    }

    // Validate price data
    const validation = validatePriceData(priceData);
    
    if (!validation.isValid) {
      return {
        url,
        vendor,
        error: `Price validation failed: ${validation.errors.join(', ')}`,
        available: false,
        rawPrice: priceData
      };
    }

    return {
      url,
      vendor,
      ...priceData,
      available: true,
      scrapedAt: new Date().toISOString(),
      warnings: validation.errors.length > 0 ? validation.errors : undefined
    };
  }

  /**
   * Detect vendor from URL
   * @param {string} url - Product URL
   * @returns {string} - Vendor name
   */
  detectVendor(url) {
    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes('amazon.com') || lowerUrl.includes('amazon.')) {
      return 'amazon';
    }
    if (lowerUrl.includes('walmart.com') || lowerUrl.includes('walmart.')) {
      return 'walmart';
    }
    if (lowerUrl.includes('target.com')) {
      return 'target';
    }
    if (lowerUrl.includes('bestbuy.com')) {
      return 'bestbuy';
    }

    return 'generic';
  }

  /**
   * Fetch HTML content using Decodo API
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<string>} - HTML content
   */
  async fetchHtml(url, options = {}) {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    const requestOptions = {
      url: `${this.apiUrl}/scrape`,
      method: 'POST',
      headers,
      timeout: this.timeout,
      data: {
        url: url,
        render: options.render !== false, // Enable JS rendering by default
        waitFor: options.waitFor || 2000,
        headers: options.headers || {
          'User-Agent': options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        ...options.decodoOptions
      }
    };

    let lastError = null;

    // Retry logic
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios(requestOptions);
        
        if (response.data && response.data.html) {
          return response.data.html;
        }
        
        if (response.data && response.data.content) {
          return response.data.content;
        }

        // If response is HTML directly
        if (typeof response.data === 'string') {
          return response.data;
        }

        throw new Error('Unexpected response format from Decodo API');
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Failed to fetch HTML after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch get prices for multiple URLs
   * @param {string[]} urls - Array of product URLs
   * @param {Object} options - Scraping options
   * @returns {Promise<Object[]>} - Array of price data
   */
  async getPricesBatch(urls, options = {}) {
    if (!Array.isArray(urls)) {
      throw new Error('URLs must be an array');
    }

    const results = await Promise.allSettled(
      urls.map(url => this.getPrice(url, options))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: urls[index],
          error: result.reason?.message || 'Unknown error',
          available: false
        };
      }
    });
  }
}

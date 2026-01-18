import { PriceScraper } from './scraper.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Main entry point for the price scraper
 */
async function main() {
  const apiKey = process.env.DECODO_API_KEY;

  if (!apiKey) {
    console.error('Error: DECODO_API_KEY not found in environment variables');
    console.error('Please create a .env file with your Decodo API key');
    process.exit(1);
  }

  const scraper = new PriceScraper(apiKey);

  // Example usage
  const exampleUrls = [
    // Add your test URLs here
  ];

  if (exampleUrls.length === 0) {
    console.log('Price Scraper initialized successfully!');
    console.log('Usage:');
    console.log('  const scraper = new PriceScraper(process.env.DECODO_API_KEY);');
    console.log('  const price = await scraper.getPrice("https://amazon.com/product-url");');
    return;
  }

  // Test scraping
  for (const url of exampleUrls) {
    try {
      console.log(`\nScraping: ${url}`);
      const result = await scraper.getPrice(url);
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { PriceScraper };

# Egaroshi Price Scraper Fix

A comprehensive solution for fixing product price scraping issues on the Egaroshi platform using the Decodo API. This project implements vendor-specific extractors, robust normalization logic, and validation to ensure accurate price extraction across multiple e-commerce retailers.

## Why This Solution Works

### Feasibility

✅ **Decodo API** is capable of reliably fetching vendor pages when configured correctly (headers, geo, JS rendering, retries).

✅ Amazon, Walmart, and similar retailers **do expose prices in the DOM or embedded JSON**, which can be extracted consistently.

✅ Pricing issues are usually caused by **parser logic**, not the scraper itself.

### Common Price Scraping Problems & Solutions

This solution addresses the most common accuracy issues:

| Problem | Solution |
|---------|----------|
| **Multiple price variants** (sale, list, subscribe) | Priority-based extraction with fallback logic |
| **Dynamic JS-loaded prices** | JS rendering enabled via Decodo API with wait times |
| **A/B DOM changes** | Multiple extraction methods with vendor-specific fallbacks |
| **Placeholder/unavailable prices** | Validation filters with out-of-stock detection |
| **Currency/locale variations** | Normalized currency handling and parsing |

## Architecture

### 1. Scraper Debugging & Configuration

The solution includes proper configuration for reliable scraping:

- **JS Rendering**: Enabled by default via Decodo API (`render: true`)
- **Headers & User-Agent**: Configurable, with sensible defaults
- **Retry Logic**: Exponential backoff (3 attempts by default)
- **Raw HTML Inspection**: Direct access to Decodo-returned HTML (not browser-rendered)

```javascript
const scraper = new PriceScraper(apiKey, {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000
});
```

### 2. Vendor-Specific Price Extraction

**Each vendor has its own specialized extractor** — this is critical for accuracy:

#### Amazon Extractor (`src/extractors/amazon.js`)
- ✅ JSON-LD structured data (Product schema)
- ✅ Embedded JSON data patterns (`buyingPrice`, `priceToPay`, `offerPrice`)
- ✅ `priceToPay` element extraction
- ✅ Offer blocks and variants
- ✅ A-core-price elements (newer Amazon format)
- ✅ "See price in cart" detection

#### Walmart Extractor (`src/extractors/walmart.js`)
- ✅ Embedded JSON state objects (`__WML_REDUX_INITIAL_STATE__`)
- ✅ Price display elements (`data-testid="product-price"`)
- ✅ Rollback pricing detection
- ✅ Meta tag fallbacks

#### Generic Extractor (`src/extractors/generic.js`)
- ✅ JSON-LD structured data (universal)
- ✅ Open Graph meta tags (`product:price:amount`)
- ✅ Common CSS selector fallbacks
- ✅ Used when vendor-specific extractors don't match

**Why vendor-specific extractors matter**: Trying to use one generic selector fails because each retailer structures prices differently. Amazon embeds JSON, Walmart uses Redux state, and others use meta tags. This solution handles each appropriately.

### 3. Price Normalization Logic

The normalization system handles complex pricing scenarios:

- **Sale vs Regular Price**: Priority handling (salePrice > price > listPrice)
- **Out-of-Stock**: Detection via HTML patterns ("out of stock", "unavailable")
- **Currency Normalization**: Automatic extraction and standardization (USD, EUR, GBP, etc.)
- **Invalid Price Rejection**: Filters zero, negative, or out-of-range values
- **Format Parsing**: Handles `$29.99`, `€25,50`, `£15.00`, and more

```javascript
// Normalized price object structure
{
  price: 29.99,           // Final price (number)
  originalPrice: 39.99,   // List price if on sale
  salePrice: 29.99,       // Sale price if applicable
  currency: 'USD',
  isOnSale: true
}
```

### 4. Validation & Testing

Comprehensive validation ensures data quality:

- **Price Range Checks**: Default 0.01 - 1,000,000 (configurable)
- **Change Thresholds**: Detects unreasonable price jumps (>50% by default)
- **Error Logging**: Failures are logged instead of silently accepted
- **Test Suite**: Unit tests for utilities and extractors

```javascript
// Validation example
const validation = validatePriceData(priceData);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

### 5. Documentation

- ✅ Vendor-specific selectors documented in each extractor
- ✅ Known edge cases noted in code comments
- ✅ Guide for adding new vendor support (see "Extending the Solution")

## Installation

```bash
# Clone or navigate to project
cd egaroshi-price-scraper-fix

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Add your Decodo API key to .env
# DECODO_API_KEY=your_key_here
```

## Usage

### Basic Usage

```javascript
import { PriceScraper } from './src/scraper.js';
import dotenv from 'dotenv';

dotenv.config();

const scraper = new PriceScraper(process.env.DECODO_API_KEY);

// Single product
const result = await scraper.getPrice('https://amazon.com/dp/B08N5WRWNW');
console.log(result);
```

### Response Format

```javascript
{
  url: 'https://amazon.com/dp/B08N5WRWNW',
  vendor: 'amazon',
  price: 29.99,
  originalPrice: 39.99,
  salePrice: 29.99,
  currency: 'USD',
  isOnSale: true,
  available: true,
  scrapedAt: '2024-01-15T10:30:00.000Z'
}
```

### Batch Processing

```javascript
const urls = [
  'https://amazon.com/product1',
  'https://walmart.com/product2',
  'https://target.com/product3'
];

const results = await scraper.getPricesBatch(urls);
results.forEach(result => {
  if (result.available) {
    console.log(`${result.vendor}: $${result.price}`);
  } else {
    console.error(`${result.vendor}: ${result.error}`);
  }
});
```

### Advanced Options

```javascript
const result = await scraper.getPrice(url, {
  render: true,                    // Enable JS rendering (default: true)
  waitFor: 2000,                   // Wait time for JS execution (ms)
  userAgent: 'Custom User-Agent',  // Custom user agent
  headers: {                        // Additional headers
    'Accept-Language': 'en-US'
  },
  allowOutOfStock: false,          // Skip out-of-stock products
  decodoOptions: {                 // Direct Decodo API options
    // ... additional Decodo-specific options
  }
});
```

## Project Structure

```
egaroshi-price-scraper-fix/
├── src/
│   ├── scraper.js              # Main PriceScraper class
│   ├── index.js                # Entry point
│   ├── extractors/
│   │   ├── amazon.js           # Amazon-specific extractor
│   │   ├── walmart.js          # Walmart-specific extractor
│   │   └── generic.js          # Generic fallback extractor
│   └── utils/
│       ├── priceParser.js      # Price parsing & normalization
│       └── validator.js        # Price validation utilities
├── tests/
│   └── scraper.test.js         # Test suite
├── package.json
├── env.example
└── README.md
```

## Extending the Solution

### Adding a New Vendor Extractor

1. Create `src/extractors/newvendor.js`:

```javascript
import * as cheerio from 'cheerio';
import { parsePrice, normalizePrice } from '../utils/priceParser.js';

export class NewVendorExtractor {
  extract(html) {
    const $ = cheerio.load(html);
    
    // Implement vendor-specific extraction logic
    // Try multiple methods in order of reliability
    
    // Method 1: JSON-LD or embedded JSON
    // Method 2: Specific DOM elements
    // Method 3: Meta tags
    
    return normalizePrice({ price: extractedPrice });
  }
}
```

2. Register in `src/scraper.js`:

```javascript
import { NewVendorExtractor } from './extractors/newvendor.js';

// In constructor
this.newVendorExtractor = new NewVendorExtractor();

// In detectVendor method
if (lowerUrl.includes('newvendor.com')) {
  return 'newvendor';
}

// In getPrice method
case 'newvendor':
  priceData = this.newVendorExtractor.extract(html);
  break;
```

### Known Edge Cases

Each vendor has specific edge cases:

**Amazon:**
- "See price in cart" products
- Subscribe & Save pricing variants
- Different locales (.com, .co.uk, .de, etc.)
- A/B tested DOM structures

**Walmart:**
- Rollback vs regular pricing
- Online vs in-store pricing
- Out-of-stock state handling

**Generic:**
- Missing structured data
- Non-standard price formats
- Currency symbols in unexpected positions

## Testing

```bash
# Run test suite
npm test

# Run with coverage (if configured)
npm test -- --coverage
```

## Limitations & Maintenance

### Important Realities

⚠️ **This solution requires ongoing maintenance** — retailers frequently change their DOM structures.

⚠️ **Amazon is particularly volatile** — price selectors may need updates every few months.

⚠️ **Not "set once and forget"** — periodic reviews and updates are necessary.

### However...

✅ The architecture makes updates straightforward — new selectors can be added easily.

✅ Vendor-specific extractors isolate changes — fixing Amazon doesn't affect Walmart.

✅ Comprehensive logging helps identify when updates are needed.

✅ Well-documented codebase enables quick maintenance.

### When to Update

Update extractors when:
- Price extraction success rate drops
- New price formats appear
- Retailers announce site changes
- Validation errors increase

### Best Practices

1. **Monitor Success Rates**: Track extraction success per vendor
2. **Log Failures**: Keep logs to identify patterns
3. **Test Regularly**: Verify scrapers against live products
4. **Version Selectors**: Note which selectors work for which time periods

## Troubleshooting

### Common Issues

**"Failed to fetch HTML"**
- Check Decodo API key
- Verify API quota/limits
- Check network connectivity

**"Could not extract price"**
- HTML structure may have changed
- Try different extractor methods
- Inspect raw HTML from Decodo

**"Price validation failed"**
- Price may be out of acceptable range
- Check if product is out of stock
- Verify currency parsing

### Debug Mode

```javascript
const scraper = new PriceScraper(apiKey);

// Get raw HTML for inspection
const html = await scraper.fetchHtml(url);
console.log(html); // Inspect raw HTML structure
```

## Contributing

When updating selectors or adding vendors:
1. Document the extraction method used
2. Note any edge cases encountered
3. Update tests for new functionality
4. Add examples to this README

## License

MIT

## Support

For issues or questions:
1. Check vendor-specific extractor code for selector details
2. Review test cases for usage examples
3. Inspect logs for error patterns

---

**Built for Egaroshi** | **Powered by Decodo API**

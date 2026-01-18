# Egaroshi Price Scraper Fix

Fixes for product price scraping issues on the Egaroshi platform using the Decodo API.

## Overview

This project resolves pricing accuracy issues by implementing vendor-specific price extractors, robust normalization logic, and comprehensive validation for Amazon, Walmart, and other e-commerce retailers.

## Features

- Vendor-specific price extraction (Amazon, Walmart, and generic fallback)
- Price normalization and validation
- Support for multiple price variants (sale, regular, subscription)
- Error handling and logging
- Comprehensive test coverage

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp env.example .env
```

3. Add your Decodo API key to `.env`

## Usage

```javascript
import { PriceScraper } from './src/scraper.js';

const scraper = new PriceScraper(process.env.DECODO_API_KEY);
const price = await scraper.getPrice('https://amazon.com/product-url');
console.log(price);
```

## Testing

Run tests:
```bash
npm test
```

## Project Structure

```
egaroshi-price-scraper-fix/
├── src/
│   ├── scraper.js          # Main scraper class
│   ├── extractors/         # Vendor-specific extractors
│   │   ├── amazon.js
│   │   ├── walmart.js
│   │   └── generic.js
│   ├── utils/              # Utilities
│   │   ├── priceParser.js
│   │   └── validator.js
│   └── index.js            # Entry point
├── tests/                  # Test files
└── package.json
```

## License

MIT

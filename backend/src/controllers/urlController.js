const { nanoid } = require('nanoid');
const Url = require('../models/Url');

// Base62 charset for clean, URL-safe short codes
const BASE62_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const SHORT_CODE_LENGTH = 6;
const MAX_COLLISION_RETRIES = 5;

/**
 * Validates a URL string
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL so that semantically identical URLs
 * (e.g. google.com vs google.com/) produce the same short code.
 *  - Lowercases protocol and hostname
 *  - Removes default ports (80 for http, 443 for https)
 *  - Strips trailing slash on the path (but preserves "/" if it's the only path)
 *  - Sorts query parameters for consistency
 */
function normalizeUrl(raw) {
  const parsed = new URL(raw);

  // Lowercase protocol + hostname (already done by URL constructor, but explicit)
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();

  // Remove default ports
  if (
    (parsed.protocol === 'http:' && parsed.port === '80') ||
    (parsed.protocol === 'https:' && parsed.port === '443')
  ) {
    parsed.port = '';
  }

  // Strip trailing slash from path (keep root "/" → becomes "")
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  }

  // Sort query parameters
  parsed.searchParams.sort();

  return parsed.toString();
}

/**
 * Generates a Base62 short code using nanoid
 */
function generateShortCode() {
  // nanoid v3 with custom alphabet
  const { customAlphabet } = require('nanoid');
  const generate = customAlphabet(BASE62_CHARSET, SHORT_CODE_LENGTH);
  return generate();
}

/**
 * POST /api/shorten
 * Shortens a long URL. Returns existing short URL if already shortened (idempotency).
 */
async function shortenUrl(req, res) {
  try {
    let { longUrl } = req.body;

    // Validate input
    if (!longUrl) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a URL to shorten',
      });
    }

    if (!isValidUrl(longUrl)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid HTTP/HTTPS URL',
      });
    }

    // Normalize so that e.g. google.com and google.com/ map to the same entry
    longUrl = normalizeUrl(longUrl);

    // Idempotency check — return existing mapping if URL already shortened
    const existingUrl = await Url.findOne({ longUrl });
    if (existingUrl) {
      return res.status(200).json({
        success: true,
        data: {
          longUrl: existingUrl.longUrl,
          shortCode: existingUrl.shortCode,
          shortUrl: `${process.env.BASE_URL}/${existingUrl.shortCode}`,
          clicks: existingUrl.clicks,
          createdAt: existingUrl.createdAt,
          isExisting: true,
        },
      });
    }

    // Generate short code with collision handling
    let shortCode;
    let saved = false;
    let attempts = 0;

    while (!saved && attempts < MAX_COLLISION_RETRIES) {
      shortCode = generateShortCode();
      attempts++;

      try {
        const newUrl = new Url({ longUrl, shortCode });
        await newUrl.save();
        saved = true;

        return res.status(201).json({
          success: true,
          data: {
            longUrl: newUrl.longUrl,
            shortCode: newUrl.shortCode,
            shortUrl: `${process.env.BASE_URL}/${newUrl.shortCode}`,
            clicks: newUrl.clicks,
            createdAt: newUrl.createdAt,
            isExisting: false,
          },
        });
      } catch (err) {
        // If duplicate key error (collision), retry
        if (err.code === 11000 && err.keyPattern?.shortCode) {
          console.warn(`Collision detected for code "${shortCode}", retrying... (attempt ${attempts}/${MAX_COLLISION_RETRIES})`);
          continue;
        }
        // If duplicate longUrl (race condition — another request shortened it first)
        if (err.code === 11000 && err.keyPattern?.longUrl) {
          const existing = await Url.findOne({ longUrl });
          if (existing) {
            return res.status(200).json({
              success: true,
              data: {
                longUrl: existing.longUrl,
                shortCode: existing.shortCode,
                shortUrl: `${process.env.BASE_URL}/${existing.shortCode}`,
                clicks: existing.clicks,
                createdAt: existing.createdAt,
                isExisting: true,
              },
            });
          }
        }
        throw err;
      }
    }

    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate a unique short code. Please try again.',
      });
    }
  } catch (err) {
    console.error('Error in shortenUrl:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /:shortCode
 * Redirects to original long URL. Increments click count.
 */
async function redirectUrl(req, res) {
  try {
    const { shortCode } = req.params;

    const url = await Url.findOneAndUpdate(
      { shortCode },
      { $inc: { clicks: 1 } },
      { new: true }
    );

    if (!url) {
      return res.status(404).json({
        success: false,
        error: 'Short URL not found',
      });
    }

    return res.redirect(302, url.longUrl);
  } catch (err) {
    console.error('Error in redirectUrl:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/stats/:shortCode
 * Returns stats (click count, metadata) for a shortened URL.
 */
async function getStats(req, res) {
  try {
    const { shortCode } = req.params;

    const url = await Url.findOne({ shortCode });

    if (!url) {
      return res.status(404).json({
        success: false,
        error: 'Short URL not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        longUrl: url.longUrl,
        shortCode: url.shortCode,
        shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
        clicks: url.clicks,
        createdAt: url.createdAt,
        updatedAt: url.updatedAt,
      },
    });
  } catch (err) {
    console.error('Error in getStats:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/urls/recent
 * Returns the 10 most recently shortened URLs.
 */
async function getRecentUrls(req, res) {
  try {
    const urls = await Url.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('longUrl shortCode clicks createdAt');

    return res.status(200).json({
      success: true,
      data: urls.map((url) => ({
        longUrl: url.longUrl,
        shortCode: url.shortCode,
        shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
        clicks: url.clicks,
        createdAt: url.createdAt,
      })),
    });
  } catch (err) {
    console.error('Error in getRecentUrls:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

module.exports = {
  shortenUrl,
  redirectUrl,
  getStats,
  getRecentUrls,
};

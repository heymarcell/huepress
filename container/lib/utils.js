const isSvg = require('is-svg');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Setup DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Helper: Escape XML
function escapeXml(unsafe) {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

// Helper: Fetch with retry and exponential backoff
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err) {
      lastError = err;
      console.warn(`[Fetch] Attempt ${attempt}/${maxRetries} failed for ${url}: ${err.message}`);
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 1s, 2s, 4s max 5s
        console.log(`[Fetch] Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// SECURITY [F-001]: Container Authentication
function validateAuthSecret(req, res, next) {
  if (req.path === '/health') return next();
  
  const currentSecret = process.env.CONTAINER_AUTH_SECRET;
  if (!currentSecret) {
    // Fail closed in production - require auth secret to be configured
    if (process.env.NODE_ENV === 'production') {
      console.error('[Security] CONTAINER_AUTH_SECRET not configured in production');
      return res.status(500).json({ error: 'Server misconfiguration: Auth secret not set' });
    }
    // Allow bypass in development only
    console.warn('[Security] CONTAINER_AUTH_SECRET not set - allowing unauthenticated access (dev mode)');
    return next();
  }
  
  const providedSecret = req.headers['x-internal-secret'];
  if (providedSecret !== currentSecret) {
    console.error('[Security] Unauthorized request - invalid or missing X-Internal-Secret');
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-Internal-Secret' });
  }
  
  next();
}

// SECURITY [F-001/F-003]: Validate uploadUrl (SSRF Protection)
function validateUploadUrl(url) {
  if (!url) return true;
  
  const ALLOWED_PREFIXES = [
    'https://api.huepress.co/',
  ];
  
  if (process.env.NODE_ENV !== 'production') {
    ALLOWED_PREFIXES.push('http://localhost:');
  }
  
  const isAllowed = ALLOWED_PREFIXES.some(prefix => url.startsWith(prefix));
  if (!isAllowed) {
    throw new Error(`Upload URL not allowed: ${url}`);
  }
  return true;
}

// Helper: Parse color to RGB
function parseColorToRGB(color) {
  if (!color || color === 'none' || color === 'transparent' || color === 'inherit' || color === 'currentColor') {
    return null;
  }
  
  color = color.trim().toLowerCase();
  
  const namedColors = {
    'black': { r: 0, g: 0, b: 0 },
    'white': { r: 255, g: 255, b: 255 },
    // ... basic colors
    'red': { r: 255, g: 0, b: 0 },
    'green': { r: 0, g: 128, b: 0 },
    'blue': { r: 0, g: 0, b: 255 },
  };
  
  if (namedColors[color]) return namedColors[color];
  
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }
  }
  
  const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10)
    };
  }
  
  return null;
}

// Helper: Check if color is near-black
const NEAR_BLACK_THRESHOLD = 40;
function isNearBlack(rgb) {
  if (!rgb) return false;
  return rgb.r <= NEAR_BLACK_THRESHOLD && rgb.g <= NEAR_BLACK_THRESHOLD && rgb.b <= NEAR_BLACK_THRESHOLD;
}

// Helper: Normalize SVG colors
function normalizeSvgColors(svgContent) {
  const dom = new JSDOM(svgContent, { contentType: 'image/svg+xml' });
  const doc = dom.window.document;
  const svg = doc.querySelector('svg');
  
  if (!svg) return svgContent;
  
  const processElement = (el) => {
    if (el.tagName === 'svg' || el.tagName === 'defs' || el.tagName === 'style') {
      Array.from(el.children).forEach(child => processElement(child));
      return;
    }
    
    let fill = el.getAttribute('fill');
    let stroke = el.getAttribute('stroke');
    const style = el.getAttribute('style') || '';
    const fillFromStyle = style.match(/fill\s*:\s*([^;]+)/i);
    const strokeFromStyle = style.match(/stroke\s*:\s*([^;]+)/i);
    
    if (fillFromStyle) fill = fillFromStyle[1].trim();
    if (strokeFromStyle) stroke = strokeFromStyle[1].trim();
    
    const fillRGB = parseColorToRGB(fill);
    const strokeRGB = parseColorToRGB(stroke);
    
    let keepElement = false;
    
    if (fillRGB) {
      if (isNearBlack(fillRGB)) {
        el.setAttribute('fill', '#000000');
        keepElement = true;
      }
    } else if (fill === 'none' || !fill) {
      // keep
    }
    
    if (strokeRGB) {
      if (isNearBlack(strokeRGB)) {
        el.setAttribute('stroke', '#000000');
        keepElement = true;
      }
    } else if (stroke === 'none' || !stroke) {
      // keep
    }
    
    const hasExplicitNonBlackFill = fillRGB && !isNearBlack(fillRGB);
    const hasExplicitNonBlackStroke = strokeRGB && !isNearBlack(strokeRGB);
    
    if (hasExplicitNonBlackFill || hasExplicitNonBlackStroke) {
      if (!keepElement) {
        el.remove();
        return;
      }
      if (hasExplicitNonBlackFill && fill) el.setAttribute('fill', 'none');
      if (hasExplicitNonBlackStroke && stroke) el.setAttribute('stroke', 'none');
    }
    
    if (style) {
      const newStyle = style.replace(/fill\s*:\s*[^;]+;?/gi, '').replace(/stroke\s*:\s*[^;]+;?/gi, '').trim();
      if (newStyle) el.setAttribute('style', newStyle);
      else el.removeAttribute('style');
    }
    
    Array.from(el.children).forEach(child => processElement(child));
  };
  
  Array.from(svg.children).forEach(child => processElement(child));
  return svg.outerHTML;
}

// Helper: Sanitize SVG Content
function sanitizeSvgContent(input) {
  if (!input) return input;
  if (input.length > 5 * 1024 * 1024) throw new Error("SVG content too large (max 5MB)");
  if (!isSvg(input)) throw new Error("Invalid SVG format");
  
  const sanitized = DOMPurify.sanitize(input, { 
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['style', 'defs', 'linearGradient', 'stop', 'rect', 'circle', 'path', 'g', 'text', 'tspan', 'clipPath'],
    ADD_ATTR: ['id', 'class', 'width', 'height', 'viewBox', 'fill', 'stroke', 'style', 'd', 'transform', 'x', 'y', 'r', 'cx', 'cy', 'rx', 'ry', 'offset', 'stop-color', 'stop-opacity'] 
  });
  
  return normalizeSvgColors(sanitized);
}

module.exports = {
  validateAuthSecret,
  validateUploadUrl,
  fetchWithRetry,
  sanitizeSvgContent,
  escapeXml
};

const express = require('express');
const sharp = require('sharp');
const puppeteer = require('puppeteer-core');
const QRCode = require('qrcode');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'huepress-processing' });
});

/**
 * Generate OG Image
 * POST /og-image
 * Body: { title, thumbnailBase64, thumbnailMimeType }
 * Returns: PNG buffer as base64
 */
app.post('/og-image', async (req, res) => {
  try {
    const { title, thumbnailBase64, thumbnailMimeType = 'image/webp' } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    console.log(`[OG Image] Generating for: "${title}"`);

    // Decode thumbnail if provided
    let thumbnailBuffer = null;
    if (thumbnailBase64) {
      thumbnailBuffer = Buffer.from(thumbnailBase64, 'base64');
    }

    // Create OG image (1200x630)
    const width = 1200;
    const height = 630;

    // Create base image with light background
    let image = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 250, g: 250, b: 250, alpha: 1 }
      }
    });

    const layers = [];

    // Add thumbnail on the right side if provided
    if (thumbnailBuffer) {
      try {
        const thumbnail = await sharp(thumbnailBuffer)
          .resize(500, 500, { fit: 'cover' })
          .png()
          .toBuffer();

        layers.push({
          input: thumbnail,
          top: 65,
          left: 650
        });
      } catch (e) {
        console.error('[OG Image] Thumbnail processing error:', e.message);
      }
    }

    // Create text overlay using SVG
    const textSvg = `
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="overlay" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:white;stop-opacity:1" />
            <stop offset="60%" style="stop-color:white;stop-opacity:0.95" />
            <stop offset="100%" style="stop-color:white;stop-opacity:0" />
          </linearGradient>
        </defs>
        <rect fill="url(#overlay)" width="700" height="${height}"/>
        <style>
          .logo { font: bold 32px sans-serif; fill: #0f766e; }
          .title { font: bold 48px sans-serif; fill: #0f766e; }
          .subtitle { font: 24px sans-serif; fill: #374151; }
          .badge-text { font: bold 18px sans-serif; fill: white; }
        </style>
        <text x="60" y="100" class="logo">HuePress</text>
        <text x="60" y="280" class="title">${escapeXml(truncate(title, 35))}</text>
        <text x="60" y="340" class="subtitle">Printable Coloring Page</text>
        <rect fill="#0f766e" x="60" y="490" width="180" height="50" rx="10"/>
        <text x="100" y="523" class="badge-text">✓ HuePress</text>
      </svg>
    `;

    layers.push({
      input: Buffer.from(textSvg),
      top: 0,
      left: 0
    });

    // Composite all layers
    const result = await image
      .composite(layers)
      .png()
      .toBuffer();

    console.log(`[OG Image] Generated successfully, size: ${result.length} bytes`);

    res.json({
      success: true,
      imageBase64: result.toString('base64'),
      mimeType: 'image/png'
    });

  } catch (error) {
    console.error('[OG Image] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate PDF from SVG
 * POST /pdf
 * Body: { svgContent, filename, metadata }
 * Metadata: { title, assetId, description, qrCodeUrl }
 * Returns: PDF buffer as base64
 */
app.post('/pdf', async (req, res) => {
  try {
    const { svgContent, filename, metadata } = req.body;
    
    if (!svgContent) {
      return res.status(400).json({ error: 'Missing svgContent' });
    }

    console.log(`[PDF] Generating: ${filename || 'document.pdf'}`, metadata ? `for ${metadata.assetId}` : '(no metadata)');

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Generate QR Code if url provided
    let qrDataUri = '';
    if (metadata && metadata.qrCodeUrl) {
      try {
        qrDataUri = await QRCode.toDataURL(metadata.qrCodeUrl, { margin: 0, width: 150 });
      } catch (e) {
        console.error('QR Generation failed:', e);
      }
    }
    
    // HTML Template for 2-Page PDF
    // Page 1: Artwork (Centered, Large)
    // Page 2: Marketing / Info
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; }
          
          .page {
            width: 210mm;
            height: 297mm;
            position: relative;
            box-sizing: border-box;
            background: white;
            overflow: hidden;
            page-break-after: always;
          }
          
          /* Page 1: Artwork */
          .artwork-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10mm;
          }
          
          svg {
            max-width: 100%;
            max-height: 100%;
          }
          
          /* Page 2: Marketing */
          .marketing-page {
            padding: 20mm;
            color: #374151;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          
          .logo {
            font-size: 24px;
            font-weight: 700;
            color: #0f766e;
            margin-bottom: 5px;
            display: block;
          }
          
          .tagline {
            font-size: 14px;
            color: #6b7280;
            font-style: italic;
          }
          
          .divider {
             height: 1px;
             background: #e5e7eb;
             margin: 20px 40px;
          }
          
          .section {
            margin-bottom: 30px;
          }
          
          .section-title {
            font-weight: 700;
            color: #1f2937;
            font-size: 16px;
            margin-bottom: 10px;
          }
          
          .card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
          }
          
          .list-item {
            font-size: 13px;
            color: #4b5563;
            margin-bottom: 5px;
            padding-left: 10px;
          }
          
          .footer {
            position: absolute;
            bottom: 20mm;
            left: 0;
            width: 100%;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
      
        <!-- Page 1: Artwork -->
        <div class="page artwork-page">
          <div class="artwork-container">
            ${svgContent}
          </div>
        </div>

        <!-- Page 2: Marketing Info (Optional - only if metdata provided) -->
        ${metadata ? `
        <div class="page marketing-page">
          <div class="header">
            <span class="logo">HuePress</span>
            <div class="tagline">Therapy-Grade Coloring Pages for Calm & Focus</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="section">
            <div class="section-title">Printing Tips</div>
            <div class="card">
              <div class="list-item">• Select 'Fit to Page' in your printer settings</div>
              <div class="list-item">• We recommend thick cardstock for best results</div>
              <div class="list-item">• Choose 'High Quality' print mode for crisp lines</div>
            </div>
          </div>
          
          <div class="section">
             <div class="section-title">Love This Design?</div>
             <div class="card">
               <div style="font-size: 13px; margin-bottom: 5px;">
                 <strong>Leave a review!</strong> It helps us create more of what you love.
               </div>
               <div style="font-size: 12px; color: #6b7280;">
                 Scan the QR code below or visit <strong>huepress.co/review</strong>
               </div>
               ${qrDataUri ? `<div style="margin-top:10px;"><img src="${qrDataUri}" width="80" /></div>` : ''}
             </div>
          </div>
          
          <div class="section">
             <div class="section-title">Share Your Masterpiece</div>
             <div style="font-size: 13px;">
               Tag us <strong>@huepressco</strong> on Instagram or Facebook!
             </div>
          </div>
          
          <div class="footer">
             Need help? hello@huepress.co<br>
             &copy; ${new Date().getFullYear()} HuePress. All rights reserved.<br>
             Asset ID: #${metadata.assetId}
          </div>
        </div>
        ` : ''}
        
      </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    await browser.close();

    console.log(`[PDF] Generated successfully, size: ${pdfBuffer.length} bytes`);

    res.json({
      success: true,
      pdfBase64: pdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
      filename: filename || 'document.pdf'
    });

  } catch (error) {
    console.error('[PDF] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate WebP Thumbnail from SVG
 * POST /thumbnail
 * Body: { svgContent, width }
 * Returns: WebP buffer as base64
 */
app.post('/thumbnail', async (req, res) => {
  try {
    const { svgContent, width = 1024 } = req.body;

    if (!svgContent) {
      return res.status(400).json({ error: 'Missing svgContent' });
    }

    console.log(`[Thumbnail] Generating (width: ${width})...`);

    const imageBuffer = await sharp(Buffer.from(svgContent))
      .resize(width, null, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }) // SVG usually transparent, but WebP supports transparency. 
      // Actually standardizing on white background is often safer for previews unless specifically transparent.
      // Let's keep it transparent or default. AssetForm canvas made it white filled?
      // AssetForm: ctx.fillStyle = "#FFFFFF"; ctx.fillRect...
      // So yes, flatten to white.
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .webp({ quality: 90 })
      .toBuffer();

    console.log(`[Thumbnail] Generated, size: ${imageBuffer.length} bytes`);

    res.json({
      success: true,
      imageBase64: imageBuffer.toString('base64'),
      mimeType: 'image/webp'
    });

  } catch (error) {
    console.error('[Thumbnail] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Future: AI Colorization endpoint
 * POST /colorize
 */
app.post('/colorize', async (req, res) => {
  // TODO: Implement Gemini + vectorizer.ai integration
  res.status(501).json({ 
    error: 'Not implemented yet',
    message: 'AI colorization coming soon'
  });
});

// Helper functions
function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Start server
app.listen(PORT, () => {
  console.log(`[Processing] Server running on port ${PORT}`);
});

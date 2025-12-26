const express = require('express');
const sharp = require('sharp');
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
 * Body: { title, thumbnailBase64, thumbnailMimeType, uploadUrl?, uploadToken?, uploadKey? }
 * Returns: PNG buffer as base64 (sync) or 202 Accepted (async)
 */
app.post('/og-image', async (req, res) => {
  try {
    const { title, thumbnailBase64, thumbnailMimeType = 'image/webp', uploadUrl, uploadToken, uploadKey } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    console.log(`[OG Image] Generating for: "${title}"`);

    const generateOg = async () => {
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
      return result;
    };

    // Async Mode
    if (uploadUrl && uploadToken && uploadKey) {
      res.status(202).json({ status: 'accepted', message: 'OG Image processing started' });
      
      (async () => {
        try {
          const imageBuffer = await generateOg();
          const uploadRes = await fetch(`${uploadUrl}?key=${encodeURIComponent(uploadKey)}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${uploadToken}`,
              'X-Content-Type': 'image/png'
            },
            body: imageBuffer
          });
          if (!uploadRes.ok) {
            throw new Error(`Upload failed: ${uploadRes.status}`);
          }
          console.log(`[OG Image] Async upload success: ${uploadKey}`);
        } catch (err) {
          console.error(`[OG Image] Async error:`, err);
        }
      })();
      return;
    }

    // Sync Mode
    const result = await generateOg();
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
// Global browser instance
let browserInstance = null;

async function getBrowser() {
  if (browserInstance) return browserInstance;

  console.log('[PDF] Launching new Browser instance...');
  browserInstance = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
  });
  
  // Handle disconnection
  browserInstance.on('disconnected', () => {
    console.log('[PDF] Browser disconnected, clearing instance');
    browserInstance = null;
  });

  return browserInstance;
}

// Import PDF generation libs
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Load Template SVG once at startup
const templatePath = path.join(__dirname, 'marketing_template.svg');
// Verify template existence
if (fs.existsSync(templatePath)) {
  console.log('[Processing] Template file found at:', templatePath);
} else {
  console.error('[Processing] WARNING: Marketing template NOT found at:', templatePath);
}

/**
 * Generate PDF from SVG (Fast Mode via pdf-lib + sharp)
 * POST /pdf
 * Body: { svgContent, filename, metadata, uploadUrl, uploadToken }
 * Metadata: { title, assetId, description, qrCodeUrl }
 */
app.post('/pdf', async (req, res) => {
  try {
    const { svgContent, filename, metadata, uploadUrl, uploadToken } = req.body;
    
    // Validate inputs
    if (!svgContent) {
      return res.status(400).json({ error: 'Missing svgContent' });
    }

    // Processing Logic (Encapsulated)
    const generatePdf = async () => {
        const pdfDoc = await PDFDocument.create();
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        
        // --- PAGE 1: Artwork ---
        // Render SVG to PNG Buffer using Sharp (Proven working)
        // High density for print quality (72dpi * 4 ~ 300dpi effectiveness or just high width)
        // A4 width @ 300dpi is ~2480px.
        const pngBuffer = await sharp(Buffer.from(svgContent))
            .resize({ width: 2480, fit: 'inside' })
            .png()
            .toBuffer();
            
        const pngImage = await pdfDoc.embedPng(pngBuffer);

        const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
        const { width, height } = page1.getSize();
        const margin = 28.35;
        const imgDims = pngImage.scaleToFit(width - (margin * 2), height - (margin * 2));
        page1.drawImage(pngImage, {
            x: (width - imgDims.width) / 2,
            y: (height - imgDims.height) / 2,
            width: imgDims.width,
            height: imgDims.height,
        });

        // --- PAGE 2: Marketing Template ---
        // Only render if template exists locally
        if (metadata && fs.existsSync(templatePath)) {
            const page2 = pdfDoc.addPage([595.28, 841.89]);
            const p2w = page2.getSize().width;
            const p2h = page2.getSize().height;

            // 1. Render Template SVG to PNG
            const tplPng = await sharp(templatePath)
                 .resize({ width: 2480, fit: 'inside' })
                 .png()
                 .toBuffer();

            const tplImage = await pdfDoc.embedPng(tplPng);
            
            page2.drawImage(tplImage, { x: 0, y: 0, width: p2w, height: p2h });

            // 2. Dynamic Footer Overlay
            // Mask the bottom area to "delete" static footer art
            page2.drawRectangle({
                x: 0,
                y: 0,
                width: p2w,
                height: 60, // Covers bottom ~21mm
                color: rgb(1, 1, 1), // White mask
            });

            const currentYear = new Date().getFullYear();
            const displayId = (metadata.assetId || "").replace(/^HP-[A-Z]+-/, '');
            const footerColor = rgb(0.59, 0.59, 0.59); // #969696
            const centerX = p2w / 2;

            // Helper to draw centered text
            const drawCentered = (text, y, size) => {
                const widthResult = fontRegular.widthOfTextAtSize(text, size);
                page2.drawText(text, {
                    x: centerX - (widthResult / 2),
                    y,
                    size,
                    font: fontRegular,
                    color: footerColor,
                });
            };

            // Coordinates based on SVG (inverted Y): 799->43, 816->26, 833->9
            drawCentered("Need help? Email us anytime: hello@huepress.co", 43, 8);
            drawCentered(`© ${currentYear} HuePress. All rights reserved.`, 26, 8);
            drawCentered(`Asset ID: #${displayId}`, 9, 8);
        }

        return await pdfDoc.save();
    };


    // Check for Async Mode (uploadUrl present)
    if (uploadUrl && uploadToken && uploadKey) {
       // Respond immediately
       res.status(202).json({ status: 'accepted', message: 'Processing started in Container' });
       
       // Background Process
       (async () => {
         try {
             console.log(`[PDFContainer] Starting Async PDF Gen (Sharp)...`);
             const pdfBuffer = await generatePdf();
             
             console.log(`[PDFContainer] Generated ${pdfBuffer.length} bytes. Uploading to ${uploadKey}...`);
             
             // Upload back with key in query param
             const uploadRes = await fetch(`${uploadUrl}?key=${encodeURIComponent(uploadKey)}`, {
                method: 'PUT',
                headers: {
                   'Authorization': `Bearer ${uploadToken}`,
                   'X-Content-Type': 'application/pdf',
                   'X-Filename': filename || 'document.pdf'
                },
                body: Buffer.from(pdfBuffer)
             });
             
             if (!uploadRes.ok) {
                 throw new Error(`Upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
             }
             console.log(`[PDFContainer] Async Upload Success: ${uploadKey}`);
         } catch (err) {
             console.error(`[PDFContainer] Async Error:`, err);
         }
       })();
       return;
    }

    // Synchronous Mode
    console.log('[PDFContainer] Sync Mode (Sharp)...');
    const pdfBuffer = await generatePdf();
    
    res.json({
      success: true,
      pdfBase64: Buffer.from(pdfBuffer).toString('base64'),
      mimeType: 'application/pdf',
      filename: filename || 'document.pdf'
    });

  } catch (error) {
    console.error('[PDFContainer] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Generate QR
async function generateQrWithRetry(url) {
    if (!url) return '';
    try {
        return await QRCode.toDataURL(url, { margin: 0, width: 150 });
    } catch (e) {
        console.error('QR Error:', e);
        return '';
    }
}

// Helper: HTML Template
function getHtmlTemplate(svgContent, metadata, qrDataUri) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          /* @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap'); REMOVED for Speed */
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; }
          .page { width: 210mm; height: 297mm; position: relative; box-sizing: border-box; background: white; overflow: hidden; page-break-after: always; }
          .artwork-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 10mm; }
          svg { max-width: 100%; max-height: 100%; }
          .marketing-page { padding: 20mm; color: #374151; }
          .header { text-align: center; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: 700; color: #0f766e; margin-bottom: 5px; display: block; }
          .tagline { font-size: 14px; color: #6b7280; font-style: italic; }
          .divider { height: 1px; background: #e5e7eb; margin: 20px 40px; }
          .section { margin-bottom: 30px; }
          .section-title { font-weight: 700; color: #1f2937; font-size: 16px; margin-bottom: 10px; }
          .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
          .list-item { font-size: 13px; color: #4b5563; margin-bottom: 5px; padding-left: 10px; }
          .footer { position: absolute; bottom: 20mm; left: 0; width: 100%; text-align: center; font-size: 11px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="page artwork-page"><div class="artwork-container">${svgContent}</div></div>
        ${metadata ? `
        <div class="page marketing-page">
          <div class="header"><span class="logo">HuePress</span><div class="tagline">Therapy-Grade Coloring Pages for Calm & Focus</div></div>
          <div class="divider"></div>
          <div class="section"><div class="section-title">Printing Tips</div><div class="card"><div class="list-item">• Select 'Fit to Page' in your printer settings</div><div class="list-item">• We recommend thick cardstock for best results</div><div class="list-item">• Choose 'High Quality' print mode for crisp lines</div></div></div>
          <div class="section"><div class="section-title">Love This Design?</div><div class="card"><div style="font-size: 13px; margin-bottom: 5px;"><strong>Leave a review!</strong> It helps us create more of what you love.</div><div style="font-size: 12px; color: #6b7280;">Scan the QR code below or visit <strong>huepress.co/review</strong></div>${qrDataUri ? `<div style="margin-top:10px;"><img src="${qrDataUri}" width="80" /></div>` : ''}</div></div>
          <div class="section"><div class="section-title">Share Your Masterpiece</div><div style="font-size: 13px;">Tag us <strong>@huepressco</strong> on Instagram or Facebook!</div></div>
          <div class="footer">Need help? hello@huepress.co<br>&copy; ${new Date().getFullYear()} HuePress. All rights reserved.<br>Asset ID: #${metadata.assetId}</div>
        </div>` : ''}
      </body>
      </html>`;
}

/**
 * Generate WebP Thumbnail from SVG
 * POST /thumbnail
 * Body: { svgContent, width, uploadUrl?, uploadToken?, uploadKey? }
 * Returns: WebP buffer as base64 (sync) or 202 Accepted (async)
 */
app.post('/thumbnail', async (req, res) => {
  try {
    const { svgContent, width = 1024, uploadUrl, uploadToken, uploadKey } = req.body;

    if (!svgContent) {
      return res.status(400).json({ error: 'Missing svgContent' });
    }

    const generateThumbnail = async () => {
      console.log(`[Thumbnail] Generating (width: ${width})...`);
      const imageBuffer = await sharp(Buffer.from(svgContent))
        .resize(width, null, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .webp({ quality: 90 })
        .toBuffer();
      console.log(`[Thumbnail] Generated, size: ${imageBuffer.length} bytes`);
      return imageBuffer;
    };

    // Async Mode
    if (uploadUrl && uploadToken && uploadKey) {
      res.status(202).json({ status: 'accepted', message: 'Thumbnail processing started' });
      
      (async () => {
        try {
          const imageBuffer = await generateThumbnail();
          const uploadRes = await fetch(`${uploadUrl}?key=${encodeURIComponent(uploadKey)}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${uploadToken}`,
              'X-Content-Type': 'image/webp'
            },
            body: imageBuffer
          });
          if (!uploadRes.ok) {
            throw new Error(`Upload failed: ${uploadRes.status}`);
          }
          console.log(`[Thumbnail] Async upload success: ${uploadKey}`);
        } catch (err) {
          console.error(`[Thumbnail] Async error:`, err);
        }
      })();
      return;
    }

    // Sync Mode
    const imageBuffer = await generateThumbnail();
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
 * UNIFIED: Generate All Assets (Thumbnail, OG, PDF)
 * POST /generate-all
 * Body: { 
 *   svgContent, title, assetId, description,
 *   thumbnailUploadUrl, thumbnailUploadKey,
 *   ogUploadUrl, ogUploadKey,
 *   pdfUploadUrl, pdfUploadKey, pdfFilename,
 *   uploadToken
 * }
 * Returns: { success: true, results: { thumbnail, og, pdf } }
 * 
 * This endpoint processes all assets SEQUENTIALLY to ensure:
 * - Thumbnail is generated first
 * - OG uses the generated thumbnail
 * - PDF is fully generated before response
 */
app.post('/generate-all', async (req, res) => {
  const startTime = Date.now();
  const results = { thumbnail: null, og: null, pdf: null };
  
  try {
    const {
      svgContent, title, assetId, description = '',
      thumbnailUploadUrl, thumbnailUploadKey,
      ogUploadUrl, ogUploadKey,
      pdfUploadUrl, pdfUploadKey, pdfFilename,
      uploadToken
    } = req.body;

    if (!svgContent) {
      return res.status(400).json({ error: 'Missing svgContent' });
    }
    if (!uploadToken) {
      return res.status(400).json({ error: 'Missing uploadToken' });
    }

    console.log(`[GenerateAll] Starting for "${title}" (assetId: ${assetId})`);

    // 1. THUMBNAIL - Generate 1:1 with hidden copyright banner
    // Final image: 600x650 (600x600 art + 50px banner)
    // On website, CSS clips to square, hiding the banner
    // If image is saved directly, banner is visible with copyright info
    let thumbnailBuffer = null;
    const thumbSize = 600;
    const bannerHeight = 50;
    const totalHeight = thumbSize + bannerHeight;
    
    if (thumbnailUploadUrl && thumbnailUploadKey) {
      console.log(`[GenerateAll] Step 1: Generating Thumbnail (${thumbSize}x${totalHeight} with banner)...`);
      
      // Step 1a: Resize SVG to 1:1 square
      const artBuffer = await sharp(Buffer.from(svgContent))
        .resize(thumbSize, thumbSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .png()
        .toBuffer();
      
      // Step 1b: Create banner SVG with copyright info and anti-piracy message
      const displayId = (assetId || "").replace(/^HP-[A-Z]+-/, '');
      const currentYear = new Date().getFullYear();
      const bannerSvg = `
        <svg width="${thumbSize}" height="${bannerHeight}">
          <rect fill="#1F2937" width="${thumbSize}" height="${bannerHeight}"/>
          <style>
            .domain { font: bold 16px 'Inter', 'FreeSans', sans-serif; fill: #FFFFFF; }
            .id { font: 24px 'Inter', 'FreeSans', sans-serif; fill: #9CA3AF; }
            .meta { font: 10px 'Inter', 'FreeSans', sans-serif; fill: #9CA3AF; }
            .notice { font: 9px 'Inter', 'FreeSans', sans-serif; fill: #6B7280; }
          </style>
          <text x="15" y="17" class="domain">huepress.co</text>
          <text x="${thumbSize - 15}" y="32" text-anchor="end" class="id">#${displayId}</text>
          <text x="15" y="32" class="meta">${currentYear} HuePress. All rights reserved.</text>
          <text x="15" y="44" class="notice">Low-res preview only. Get print-quality PDFs at huepress.co</text>
        </svg>
      `;
      
      // Step 1c: Composite art + banner
      thumbnailBuffer = await sharp({
        create: { width: thumbSize, height: totalHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
      })
      .composite([
        { input: artBuffer, top: 0, left: 0 },
        { input: Buffer.from(bannerSvg), top: thumbSize, left: 0 }
      ])
      .webp({ quality: 85 })
      .toBuffer();
      
      console.log(`[GenerateAll] Thumbnail generated: ${thumbnailBuffer.length} bytes. Uploading...`);
      
      const thumbRes = await fetch(`${thumbnailUploadUrl}?key=${encodeURIComponent(thumbnailUploadKey)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${uploadToken}`,
          'X-Content-Type': 'image/webp'
        },
        body: thumbnailBuffer
      });
      
      if (!thumbRes.ok) {
        throw new Error(`Thumbnail upload failed: ${thumbRes.status}`);
      }
      results.thumbnail = { success: true, size: thumbnailBuffer.length };
      console.log(`[GenerateAll] Thumbnail uploaded successfully`);
    }

    // 2. OG IMAGE - Generate using thumbnail and upload
    if (ogUploadUrl && ogUploadKey) {
      console.log(`[GenerateAll] Step 2: Generating OG Image...`);
      
      const width = 1200;
      const height = 630;
      
      let ogImage = sharp({
        create: { width, height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
      });
      
      // 1. Base Layer: Generic Template Overlay
      const templatePath = path.join(__dirname, 'og_template.svg');
      let templateBuffer = null;
      if (fs.existsSync(templatePath)) {
        templateBuffer = fs.readFileSync(templatePath);
      }

      // 2. Prepare Layers
      const layers = [];

      // Layer A: Art from SVG (NO banner) - placed on the RIGHT side
      // The right area is from x=650 to x=1150, y-centered at 315
      // Use fresh render from SVG content, not the thumbnail with banner
      if (svgContent) {
        try {
          // Render SVG directly for OG (no banner)
          const ogArt = await sharp(Buffer.from(svgContent))
            .resize(450, 500, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .png()
            .toBuffer();
          
          const artMeta = await sharp(ogArt).metadata();
          const artW = artMeta.width || 450;
          const artH = artMeta.height || 500;
          
          // Center in the right area (x: 650-1150, y: 0-630)
          // Center point = x: 900, y: 315
          const artLeft = 900 - Math.round(artW / 2);
          const artTop = 315 - Math.round(artH / 2);
          
          console.log(`[GenerateAll] OG Art: ${artW}x${artH}, pos: (${artLeft}, ${artTop})`);
          
          layers.push({ input: ogArt, left: artLeft, top: artTop });
        } catch (e) {
          console.error('[GenerateAll] OG art processing error:', e.message);
        }
      }

      // Layer B: Template Overlay (Gradient + Logo + Badge) - ON TOP of Thumbnail
      if (templateBuffer) {
        layers.push({ input: templateBuffer, top: 0, left: 0 });
      }

      // Layer C: Dynamic Text
      const safeTitle = title ? escapeXml(truncate(title, 35)) : 'Coloring Page';
      const safeDescription = "Printable Coloring Page"; 
      
      const textSvg = `
        <svg width="${width}" height="${height}">
          <style>
             .title { font: bold 48px 'Inter', 'FreeSans', sans-serif; fill: #0f766e; }
             .subtitle { font: 24px 'Inter', 'FreeSans', sans-serif; fill: #374151; }
          </style>
          <text x="60" y="280" class="title">${safeTitle}</text>
          <text x="60" y="340" class="subtitle">${safeDescription}</text>
        </svg>
      `;
      layers.push({ input: Buffer.from(textSvg), top: 0, left: 0 });
      
      // Composite all: White Base -> Thumbnail -> Template -> Text
      const ogBuffer = await sharp({
        create: { width, height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
      })
      .composite(layers)
      .png()
      .toBuffer();
      console.log(`[GenerateAll] OG generated: ${ogBuffer.length} bytes. Uploading...`);
      
      const ogRes = await fetch(`${ogUploadUrl}?key=${encodeURIComponent(ogUploadKey)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${uploadToken}`,
          'X-Content-Type': 'image/png'
        },
        body: ogBuffer
      });
      
      if (!ogRes.ok) {
        throw new Error(`OG upload failed: ${ogRes.status}`);
      }
      results.og = { success: true, size: ogBuffer.length };
      console.log(`[GenerateAll] OG uploaded successfully`);
    }

    // 3. PDF - Generate TRUE VECTOR PDF using pdfkit + svg-to-pdfkit
    // This converts SVG paths directly to PDF vector drawing commands - no rasterization!
    if (pdfUploadUrl && pdfUploadKey) {
      console.log(`[GenerateAll] Step 3: Generating VECTOR PDF via pdfkit...`);
      
      const PDFDocument = require('pdfkit');
      const SVGtoPDF = require('svg-to-pdfkit');
      const fs = require('fs');
      const path = require('path');
      
      try {
        // A4 dimensions in points (72 dpi)
        const A4_WIDTH_PT = 595.28;
        const A4_HEIGHT_PT = 841.89;
        const MARGIN = 28.35; // 10mm margin safe for most printers

        // 1. Parse SVG Dimensions FIRST to determine orientation
        const svgWidthMatch = svgContent.match(/width=["']?(\d+(?:\.\d+)?)/);
        const svgHeightMatch = svgContent.match(/height=["']?(\d+(?:\.\d+)?)/);
        const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)/);
        
        let svgWidth = svgWidthMatch ? parseFloat(svgWidthMatch[1]) : 800;
        let svgHeight = svgHeightMatch ? parseFloat(svgHeightMatch[1]) : 800;
        
        if (viewBoxMatch) {
          const parts = viewBoxMatch[1].split(/\s+|,/).map(parseFloat);
          if (parts.length === 4) {
            svgWidth = parts[2];
            svgHeight = parts[3];
          }
        }
        
        // 2. Determine best orientation to maximize size
        // If wider than tall, rotate page to Landscape
        const isLandscape = svgWidth > svgHeight;
        const pageLayout = isLandscape ? 'landscape' : 'portrait';
        
        console.log(`[GenerateAll] SVG Size: ${svgWidth}x${svgHeight}. selecting layout: ${pageLayout}`);

        // Create PDF document with determined layout
        const chunks = [];
        const pdfDoc = new PDFDocument({
          size: 'A4',
          layout: pageLayout, // Dynamic layout
          margin: MARGIN,
          autoFirstPage: true
        });
        
        pdfDoc.on('data', chunk => chunks.push(chunk));
        
        // 3. Calculate scaling to fit within SAFE MARGINS
        // Determine available page width/height based on orientation
        const pageWidth = isLandscape ? A4_HEIGHT_PT : A4_WIDTH_PT; // Width is 842 in landscape
        const pageHeight = isLandscape ? A4_WIDTH_PT : A4_HEIGHT_PT; // Height is 595 in landscape
        
        const availWidth = pageWidth - (2 * MARGIN);
        const availHeight = pageHeight - (2 * MARGIN);
        
        const scaleX = availWidth / svgWidth;
        const scaleY = availHeight / svgHeight;
        const scale = Math.min(scaleX, scaleY);
        
        const scaledWidth = svgWidth * scale;
        const scaledHeight = svgHeight * scale;
        
        // Center content in the safe area
        const x = MARGIN + (availWidth - scaledWidth) / 2;
        const y = MARGIN + (availHeight - scaledHeight) / 2;
        
        console.log(`[GenerateAll] Scaling to fit ${availWidth.toFixed(1)}x${availHeight.toFixed(1)} safe area. Scale: ${scale.toFixed(3)}`);
        
        // Convert SVG to PDF (TRUE VECTOR CONVERSION!)
        SVGtoPDF(pdfDoc, svgContent, x, y, {
          width: scaledWidth,
          height: scaledHeight,
          preserveAspectRatio: 'xMidYMid meet'
        });
        
        console.log(`[GenerateAll] Page 1: Vector artwork added (${pageLayout})`);
        
        // Page 2: Marketing page (ALWAYS PORTRAIT)
        // Layer 1: Vector Background
        // Note: Intentionally switching back to Portrait for standardized marketing page
        pdfDoc.addPage({ size: 'A4', layout: 'portrait', margin: 0 });
        
        const templatePath = path.join(__dirname, 'marketing_template.svg');
        if (fs.existsSync(templatePath)) {
          const templateSvg = fs.readFileSync(templatePath, 'utf8');
          // Draw the template as background (full A4)
          SVGtoPDF(pdfDoc, templateSvg, 0, 0, {
            width: A4_WIDTH_PT,
            height: A4_HEIGHT_PT,
            preserveAspectRatio: 'xMidYMid meet'
          });
          console.log(`[GenerateAll] Page 2: Background SVG added`);
        }
        
        const currentYear = new Date().getFullYear();
        const displayId = (assetId || "").replace(/^HP-[A-Z]+-/, '');
        
        // --- NATIVE TEXT OVERLAYS ---
        // Coordinates ADJUSTED based on user feedback/screenshots
        
        // 1. Tagline (Under Logo)
        // Matches visual: "Therapy-Grade..." under HuePress logo
        pdfDoc.fontSize(12).font('Helvetica-Oblique').fillColor('#787878');
        pdfDoc.text('Therapy-Grade Coloring Pages for Calm & Focus', 0, 120, { align: 'center', width: A4_WIDTH_PT });
        
        // 2. Section: Printing Tips
        // The header is ABOVE the first box in the screenshot
        // Updated based on final local test: 168
        const sectionY = 168;
        pdfDoc.fontSize(12).font('Helvetica-Bold').fillColor('#333333');
        pdfDoc.text('Printing Tips', 57, sectionY);
        
        // Inside First Box (was overlapping header, needs to move down)
        pdfDoc.fontSize(10).font('Helvetica').fillColor('#4f4f4f');
        const tipY = 202; 
        pdfDoc.text("• Select 'Fit to Page' in your printer settings", 75, tipY);
        pdfDoc.text("• We recommend thick cardstock for the best results", 75, tipY + 16);
        pdfDoc.text("• Choose 'High Quality' print mode for crisp lines", 75, tipY + 32);
        
        // 3. Section: Love This Design?
        // Header above 2nd box, updated to 285
        const loveY = 285; 
        pdfDoc.fontSize(12).font('Helvetica-Bold').fillColor('#333333');
        pdfDoc.text("Love This Design? We'd Love to Hear!", 57, loveY);
        
        // Inside Second Box
        const reviewTextY = 321;
        
        // Right side text
        pdfDoc.fontSize(11).font('Helvetica-Bold').fillColor('#333333');
        pdfDoc.text("Leave a quick review — it means the world to us!", 180, reviewTextY + 5);
        
        pdfDoc.fontSize(10).font('Helvetica').fillColor('#4f4f4f');
        pdfDoc.text("Scan the QR or visit huepress.co/review", 180, reviewTextY + 25);
        pdfDoc.text("Your feedback shapes our future designs.", 180, reviewTextY + 40);
        
        // 4. Section: Share Your Masterpiece
        const shareY = 419;
        pdfDoc.fontSize(12).font('Helvetica-Bold').fillColor('#333333');
        pdfDoc.text("Share Your Masterpiece!", 57, shareY);
        
        // Inside Third Box
        const shareTextY = 454;
        pdfDoc.fontSize(10).font('Helvetica').fillColor('#4f4f4f');
        pdfDoc.text("We love seeing your finished work! Tag us on social and inspire other parents & kids.", 75, shareTextY);
        
        pdfDoc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
        pdfDoc.text("@huepressco  #HuePressColoring", 75, shareTextY + 20);
        
        // 5. Section: Connect With Us
        const connectY = 527; 
        pdfDoc.fontSize(12).font('Helvetica-Bold').fillColor('#333333');
        pdfDoc.text("Connect With Us", 57, connectY);
        
        // Inside Fourth Box
        const socialY = 560;
        
        pdfDoc.fontSize(10).font('Helvetica').fillColor('#4f4f4f');
        // Adjusted X columns for perfect icon alignment
        const col1X = 102;
        const col2X = 300;

        pdfDoc.text("instagram.com/huepressco", col1X, socialY);
        pdfDoc.text("facebook.com/huepressco", col2X, socialY);

        pdfDoc.text("pinterest.com/huepressco", col1X, socialY + 24);
        pdfDoc.text("huepress.co", col2X, socialY + 24);
        
        // 6. Section: Discover More
        const discoverY = 646;
        pdfDoc.fontSize(12).font('Helvetica-Bold').fillColor('#333333');
        pdfDoc.text("Discover 500+ More Designs", 57, discoverY);
        
        // Inside Fifth Box
        const discoverTextY = 680;
        pdfDoc.fontSize(10).font('Helvetica').fillColor('#4f4f4f');
        pdfDoc.text("New therapy-grade coloring pages added every week.", 75, discoverTextY);
        pdfDoc.text("Visit huepress.co to explore our full collection — animals, nature, holidays, and much more!", 75, discoverTextY + 20);
        
        // Footer
        const footerY = A4_HEIGHT_PT - 50;
        pdfDoc.fontSize(8).font('Helvetica').fillColor('#969696');
        pdfDoc.text("Need help? Email us anytime: hello@huepress.co", 0, footerY, { align: 'center', width: A4_WIDTH_PT });
        pdfDoc.text(`© ${currentYear} HuePress. All rights reserved.`, 0, footerY + 12, { align: 'center', width: A4_WIDTH_PT });
        pdfDoc.text(`Asset ID: #${displayId}`, 0, footerY + 24, { align: 'center', width: A4_WIDTH_PT });
        
        console.log(`[GenerateAll] Page 2: Hybrid Page generated (SVG Background + Native Text)`);
        
        // Finalize PDF and get buffer
        const pdfPromise = new Promise((resolve, reject) => {
          pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
          pdfDoc.on('error', reject);
        });
        
        pdfDoc.end();
        const pdfBuffer = await pdfPromise;
        
        console.log(`[GenerateAll] VECTOR PDF generated: ${pdfBuffer.length} bytes. Uploading...`);
        
        const pdfRes = await fetch(`${pdfUploadUrl}?key=${encodeURIComponent(pdfUploadKey)}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${uploadToken}`,
            'X-Content-Type': 'application/pdf',
            'X-Filename': pdfFilename || 'document.pdf'
          },
          body: pdfBuffer
        });
        
        if (!pdfRes.ok) {
          throw new Error(`PDF upload failed: ${pdfRes.status}`);
        }
        results.pdf = { success: true, size: pdfBuffer.length, type: 'vector-pdfkit' };
        console.log(`[GenerateAll] VECTOR PDF uploaded successfully`);
        
      } catch (pdfErr) {
        console.error('[GenerateAll] PDF Error:', pdfErr.message);
        results.pdf = { success: false, error: pdfErr.message };
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[GenerateAll] ALL DONE for "${title}" in ${elapsed}ms`);
    
    res.json({ success: true, results, elapsedMs: elapsed });
    
  } catch (error) {
    console.error('[GenerateAll] Error:', error);
    res.status(500).json({ error: error.message, results });
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

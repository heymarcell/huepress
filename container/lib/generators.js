const sharp = require('sharp');
const PDFDocument = require('pdfkit'); // Used inside function but requiring top-level is fine if used often
const SVGtoPDF = require('svg-to-pdfkit');
const fs = require('fs');
const path = require('path');
const { sanitizeSvgContent, escapeXml } = require('./utils');

// Helper: Generate thumbnail buffer with Banner (Watermark)
async function generateThumbnailBuffer(svgContent, assetId, size = 600) {
  const thumbSize = size;
  const bannerHeight = Math.round(size * 0.083); // maintain ratio (50/600 approx)
  const totalHeight = thumbSize + bannerHeight;
  const displayId = (assetId || "").replace(/^HP-[A-Z]+-/, '');
  const currentYear = new Date().getFullYear();

  // Resize SVG to square
  // SANITIZE INPUT inside helper for safety
  const safeSvg = sanitizeSvgContent(svgContent);
  
  const artBuffer = await sharp(Buffer.from(safeSvg))
    .resize(thumbSize, thumbSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  // Banner SVG
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

  // Composite
  return await sharp({
    create: { width: thumbSize, height: totalHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  })
  .composite([
    { input: artBuffer, top: 0, left: 0 },
    { input: Buffer.from(bannerSvg), top: thumbSize, left: 0 }
  ])
  .webp({ quality: 85 })
  .toBuffer();
}

// Helper: Generate OG image buffer with Text Wrapping
async function generateOgBuffer(svgContent, title) {
  const width = 1200;
  const height = 630;
  // Resolve template relative to THIS file or container root?
  // If moving files, __dirname changes to /app/lib.
  // Template is likely in /app (container root).
  // So path should be path.join(__dirname, '..', 'og_template.svg')
  const templatePath = path.join(__dirname, '..', 'og_template.svg');
  
  // SANITIZE INPUT inside helper
  const safeSvg = sanitizeSvgContent(svgContent);

  let layers = [];

  // 1. Template Layer
  if (fs.existsSync(templatePath)) {
    layers.push({ input: fs.readFileSync(templatePath), top: 0, left: 0 });
  } else {
    // Fallback white background
     layers.push({ 
       input: { create: { width, height, channels: 4, background: { r: 255, g: 255, b: 255 } } }
     });
  }

  // 2. Art Layer
  try {
    const ogArt = await sharp(Buffer.from(safeSvg))
      .resize(450, 500, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();
    
    const artMeta = await sharp(ogArt).metadata();
    const artW = artMeta.width || 450;
    const artH = artMeta.height || 500;
    const artLeft = 900 - Math.round(artW / 2);
    const artTop = 315 - Math.round(artH / 2);
    
    layers.push({ input: ogArt, left: artLeft, top: artTop });
  } catch (e) {
    console.error('[OG] Art processing error:', e);
  }

  // 3. Text Layer
  const maxTitleChars = 22;
  const titleLines = [];
  const words = (title || 'Coloring Page').split(' ');
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    if ((currentLine + " " + words[i]).length < maxTitleChars) {
      currentLine += " " + words[i];
    } else {
      titleLines.push(currentLine);
      currentLine = words[i];
    }
  }
  titleLines.push(currentLine);
  
  const displayLines = titleLines.slice(0, 3);
  if (titleLines.length > 3) {
     displayLines[2] = displayLines[2].substring(0, displayLines[2].length - 3) + "...";
  }

  const lineHeight = 60;
  const startY = 280;
  const subtitleY = startY + (displayLines.length * lineHeight) + 20;

  const titleSvg = displayLines.map((line, i) => 
    `<tspan x="60" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  const textSvg = `
    <svg width="${width}" height="${height}">
      <style>
         .title { font: bold 48px 'Inter', 'FreeSans', sans-serif; fill: #0f766e; }
         .subtitle { font: 24px 'Inter', 'FreeSans', sans-serif; fill: #374151; }
      </style>
      <text x="60" y="${startY}" class="title">${titleSvg}</text>
      <text x="60" y="${subtitleY}" class="subtitle">Printable Coloring Page</text>
    </svg>
  `;
  layers.push({ input: Buffer.from(textSvg), top: 0, left: 0 });

  return await sharp({
    create: { width, height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  })
  .composite(layers)
  .png()
  .toBuffer();
}

// Helper: Generate Vector PDF Buffer (using pdfkit + svg-to-pdfkit)
async function generatePdfBuffer(svgContent, asset, publicUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      const safeSvgContent = sanitizeSvgContent(svgContent);
      const displayId = (asset.asset_id || "").replace(/^HP-[A-Z]+-/, '');
      const assetUrl = publicUrl || `https://huepress.co`;

      // Determine dimensions
      const svgWidthMatch = safeSvgContent.match(/width=["']?(\d+(?:\.\d+)?)/);
      const svgHeightMatch = safeSvgContent.match(/height=["']?(\d+(?:\.\d+)?)/);
      let svgWidth = svgWidthMatch ? parseFloat(svgWidthMatch[1]) : 800;
      let svgHeight = svgHeightMatch ? parseFloat(svgHeightMatch[1]) : 800;
      
      const isLandscape = svgWidth > svgHeight;
      const pageLayout = isLandscape ? 'landscape' : 'portrait';

      const pdfDoc = new PDFDocument({
          size: 'A4',
          layout: pageLayout,
          margin: 28.35, // 10mm
          autoFirstPage: true,
          info: { Title: asset.title || 'Coloring Page', Author: 'HuePress' }
      });
      
      const chunks = [];
      pdfDoc.on('data', chunk => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);

      // Page 1: Vector Art
      const A4_WIDTH_PT = 595.28;
      const A4_HEIGHT_PT = 841.89;
      const MARGIN = 28.35;
      
      const pageWidth = isLandscape ? A4_HEIGHT_PT : A4_WIDTH_PT;
      const pageHeight = isLandscape ? A4_WIDTH_PT : A4_HEIGHT_PT;
      const availWidth = pageWidth - (2 * MARGIN);
      const availHeight = pageHeight - (2 * MARGIN);
      
      const scale = Math.min(availWidth / svgWidth, availHeight / svgHeight);
      const scaledWidth = svgWidth * scale;
      const scaledHeight = svgHeight * scale;
      const x = MARGIN + (availWidth - scaledWidth) / 2;
      const y = MARGIN + (availHeight - scaledHeight) / 2;
      
      SVGtoPDF(pdfDoc, safeSvgContent, x, y, { width: scaledWidth, height: scaledHeight, preserveAspectRatio: 'xMidYMid meet' });

      // Page 2: Marketing (Always Portrait)
      const templatePath = path.join(__dirname, '..', 'marketing_template.svg'); // Adjusted path
      if (fs.existsSync(templatePath)) {
         pdfDoc.addPage({ size: 'A4', layout: 'portrait', margin: 0 });
         const templateSvg = fs.readFileSync(templatePath, 'utf8');
         SVGtoPDF(pdfDoc, templateSvg, 0, 0, { width: A4_WIDTH_PT, height: A4_HEIGHT_PT, preserveAspectRatio: 'xMidYMid meet' });
         
         const footerY = A4_HEIGHT_PT - 40;
         pdfDoc.fontSize(8).fillColor('#969696');
         pdfDoc.text(`Need help? Email us anytime: hello@huepress.co`, 0, footerY, { align: 'center', width: A4_WIDTH_PT });
         pdfDoc.text(`© ${new Date().getFullYear()} HuePress. All rights reserved. • Asset ID: #${displayId}`, 0, footerY + 12, { align: 'center', width: A4_WIDTH_PT });
      }

      pdfDoc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  generateThumbnailBuffer,
  generateOgBuffer,
  generatePdfBuffer
};

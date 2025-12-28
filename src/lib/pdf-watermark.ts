import { PDFDocument, rgb, degrees } from 'pdf-lib';

/**
 * PDF Watermarking Service for Leak Tracking
 * 
 * Injects invisible, durable, and searchable metadata into PDFs.
 * The watermark binds the file to a specific user for leak tracing via Google Search.
 * 
 * Strategy:
 * - Anchor (Static): "HUEPRESS_CONFIDENTIAL_DOC" - enables Google Alert discovery
 * - Tracer (Dynamic): User ID (UUID) - identifies the leaker
 * 
 * Survivability:
 * - Target: Page 1 (survives if user deletes later pages)
 * - Method: Content stream injection (not metadata/XMP which can be stripped)
 * 
 * Placement:
 * - Location: Left gutter margin (x:2, y:20)
 * - Rotation: 90 degrees vertical (avoids selection conflict with horizontal text)
 * 
 * Visibility:
 * - Color: White rgb(1,1,1)
 * - Opacity: 1% (invisible to eye, readable by search bots)
 * - Size: 4pt
 */

const ANCHOR = 'HUEPRESS_CONFIDENTIAL_DOC';

/**
 * Apply invisible watermark to a PDF file
 * @param pdfBytes - The source PDF as ArrayBuffer
 * @param userId - The user's unique identifier (Clerk ID)
 * @returns Watermarked PDF as Uint8Array
 */
export async function watermarkPdf(
  pdfBytes: ArrayBuffer,
  userId: string
): Promise<Uint8Array> {
  // Load the PDF document
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Construct the hidden watermark text
  // Format: PROPERTY OF [DOMAIN] | [ANCHOR] | TRACER: [USER_ID]
  const hiddenText = `PROPERTY OF HUEPRESS.CO | ${ANCHOR} | TRACER: ${userId}`;

  // Get all pages and target page 1 (index 0)
  const pages = pdfDoc.getPages();
  
  if (pages.length === 0) {
    // Return unmodified if no pages (edge case)
    return pdfDoc.save();
  }

  const firstPage = pages[0];

  // Inject watermark in safety region (left gutter)
  firstPage.drawText(hiddenText, {
    x: 2,                  // Extreme left edge (Safety Gutter)
    y: 20,                 // Start near bottom
    size: 4,               // Microscopic font
    color: rgb(1, 1, 1),   // White
    opacity: 0.01,         // 1% Opacity (Invisible to human eye)
    rotate: degrees(90),   // Vertical orientation to avoid selection conflict
  });

  // Serialize and return the modified PDF
  return pdfDoc.save();
}

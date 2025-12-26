import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
// @ts-expect-error - Import WASM directly
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';

// Import SVG Template
import marketingTemplateSvg from '../../design/marketing_template.svg';

let wasmInitialized = false;

async function ensureWasm() {
    if (!wasmInitialized) {
        try {
            await initWasm(resvgWasm);
            wasmInitialized = true;
        } catch (e) {
            console.error('Failed to initialize resvg wasm', e);
            if (e instanceof Error && !e.message.includes('already initialized')) {
                 throw e;
            }
            wasmInitialized = true;
        }
    }
}

interface PdfMetadata {
  title: string;
  assetId: string;
  description: string;
  qrCodeUrl: string;
}

export async function generateNativePdf(
  svgContent: string,
  metadata: PdfMetadata
): Promise<Uint8Array> {
  await ensureWasm();

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // --- PAGE 1: Artwork ---
  const opts = { fitTo: { mode: 'width' as const, value: 2480 }, background: 'rgba(255, 255, 255, 1)' };
  const resvg = new Resvg(svgContent, opts);
  const pngBuffer = resvg.render().asPng();
  const pngImage = await pdfDoc.embedPng(pngBuffer);

  const page1 = pdfDoc.addPage([595.28, 841.89]);
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
  if (metadata) {
      const page2 = pdfDoc.addPage([595.28, 841.89]);
      const p2w = page2.getSize().width;
      const p2h = page2.getSize().height;
      
      // 1. Render Template SVG as background
      // Note: Static text must be outlined in the SVG to render without fonts.
      const tplOpts = { fitTo: { mode: 'width' as const, value: 2480 }, background: 'rgba(255, 255, 255, 1)' };
      const tplResvg = new Resvg(marketingTemplateSvg, tplOpts);
      const tplPng = tplResvg.render().asPng();
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
      // @ts-expect-error - font type inference
      const drawCentered = (text: string, y: number, size: number) => {
          const width = fontRegular.widthOfTextAtSize(text, size);
          page2.drawText(text, {
              x: centerX - (width / 2),
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
}

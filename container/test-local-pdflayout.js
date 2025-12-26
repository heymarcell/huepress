 const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');
const fs = require('fs');
const path = require('path');

// Mock Data
const assetId = "HP-TEST-00067";
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

async function generateLocalPDF() {
  console.log('Generating test PDF...');
  
  const pdfDoc = new PDFDocument({
    size: 'A4',
    margin: 0,
    autoFirstPage: true
  });
  
  const output = fs.createWriteStream('test_hybrid_layout.pdf');
  pdfDoc.pipe(output);
  
  // Page 2: Marketing page (HYBRID APPROACH)
  pdfDoc.addPage({ size: 'A4', margin: 0 });
  
  const templatePath = path.join(__dirname, 'marketing_template.svg');
  if (fs.existsSync(templatePath)) {
    console.log('Found marketing template!');
    const templateSvg = fs.readFileSync(templatePath, 'utf8');
    SVGtoPDF(pdfDoc, templateSvg, 0, 0, {
      width: A4_WIDTH,
      height: A4_HEIGHT,
      preserveAspectRatio: 'xMidYMid meet'
    });
  } else {
    console.warn('Template not found!');
  }
  
  const currentYear = new Date().getFullYear();
  const displayId = (assetId || "").replace(/^HP-[A-Z]+-/, '');
  
  // --- NATIVE TEXT OVERLAYS ---
  
  // 1. Tagline
  pdfDoc.fontSize(12).font('Helvetica-Oblique').fillColor('#787878');
  pdfDoc.text('Therapy-Grade Coloring Pages for Calm & Focus', 0, 120, { align: 'center', width: A4_WIDTH });
  
  // 2. Printing Tips (Box Y: 184)
  // Closer to box (160 -> 164)
  const sectionY = 168; 
  pdfDoc.fontSize(12).font('Helvetica-Bold').fillColor('#333333');
  pdfDoc.text('Printing Tips', 57, sectionY);
  
  pdfDoc.fontSize(10).font('Helvetica').fillColor('#4f4f4f');
  // Box Top 184 + 18px padding
  const tipY = 202; 
  pdfDoc.text("• Select 'Fit to Page' in your printer settings", 75, tipY);
  pdfDoc.text("• We recommend thick cardstock for the best results", 75, tipY + 16);
  pdfDoc.text("• Choose 'High Quality' print mode for crisp lines", 75, tipY + 32);
  
  // 3. Love This Design? (Box Y: 301.1)
  // Closer to box (277 -> 281)
  const loveY = 285; 
  pdfDoc.fontSize(12).font('Helvetica-Bold').fillColor('#333333');
  pdfDoc.text("Love This Design? We'd Love to Hear!", 57, loveY);
  
  // Box Top 301.1 + 20px padding for text inside
  const reviewTextY = 321;
  
  // Right side text
  pdfDoc.fontSize(11).font('Helvetica-Bold').fillColor('#333333');
  pdfDoc.text("Leave a quick review — it means the world to us!", 180, reviewTextY + 5);
  
  pdfDoc.fontSize(10).font('Helvetica').fillColor('#4f4f4f');
  pdfDoc.text("Scan the QR or visit huepress.co/review", 180, reviewTextY + 25);
  pdfDoc.text("Your feedback shapes our future designs.", 180, reviewTextY + 40);
  
  // 4. Share Your Masterpiece (Box Y: 435.8)
  // Closer to box (411 -> 415)
  const shareY = 419; 
  pdfDoc.fontSize(12).font('Helvetica-Bold').fillColor('#333333');
  pdfDoc.text("Share Your Masterpiece!", 57, shareY);
  
  // Box Top 435.8 + 18px padding
  const shareTextY = 454;
  pdfDoc.fontSize(10).font('Helvetica').fillColor('#4f4f4f');
  pdfDoc.text("We love seeing your finished work! Tag us on social and inspire other parents & kids.", 75, shareTextY);
  
  pdfDoc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
  pdfDoc.text("@huepressco  #HuePressColoring", 75, shareTextY + 20);
  
  // 5. Connect With Us (Box Y: 543.5)
  // Closer to box (519 -> 523)
  const connectY = 527; 
  pdfDoc.fontSize(12).font('Helvetica-Bold').fillColor('#333333');
  pdfDoc.text("Connect With Us", 57, connectY);
  
  // Box Top 543.5 + 18px padding
  const socialY = 560;
  
  pdfDoc.fontSize(10).font('Helvetica').fillColor('#4f4f4f');
  // Adjusted X to align perfectly with icons (95 -> 88, 300 -> 293) based on visual inspection
  // Icons seem to be around X=57+padding, text was a bit too far right.
  // Standard left col text X: 75. Let's align social text with bullet points at 75? 
  // No, icons are wide. Let's try 85 and 285.
  const col1X = 102;
  const col2X = 300;
  
  pdfDoc.text("instagram.com/huepressco", col1X, socialY);
  pdfDoc.text("facebook.com/huepressco", col2X, socialY);
  
  pdfDoc.text("pinterest.com/huepressco", col1X, socialY + 24);
  pdfDoc.text("huepress.co", col2X, socialY + 24);
  
  // 6. Discover More (Box Y: 662.1)
  // Closer to box (638 -> 642)
  const discoverY = 646; 
  pdfDoc.fontSize(12).font('Helvetica-Bold').fillColor('#333333');
  pdfDoc.text("Discover 500+ More Designs", 57, discoverY);
  
  // Box Top 662.1 + 18px padding
  const discoverTextY = 680;
  pdfDoc.fontSize(10).font('Helvetica').fillColor('#4f4f4f');
  pdfDoc.text("New therapy-grade coloring pages added every week.", 75, discoverTextY);
  pdfDoc.text("Visit huepress.co to explore our full collection — animals, nature, holidays, and much more!", 75, discoverTextY + 20);
  
  // Footer
  const footerY = A4_HEIGHT - 50;
  pdfDoc.fontSize(8).font('Helvetica').fillColor('#969696');
  pdfDoc.text("Need help? Email us anytime: hello@huepress.co", 0, footerY, { align: 'center', width: A4_WIDTH });
  pdfDoc.text(`© ${currentYear} HuePress. All rights reserved.`, 0, footerY + 12, { align: 'center', width: A4_WIDTH });
  pdfDoc.text(`Asset ID: #${displayId}`, 0, footerY + 24, { align: 'center', width: A4_WIDTH });

  pdfDoc.end();
  
  console.log('PDF generated at test_hybrid_layout.pdf');
}

generateLocalPDF();

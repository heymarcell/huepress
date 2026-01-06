/**
 * Optimizes SEO title to be under 60 characters total (including suffix)
 * Truncates intelligently at word boundaries
 */
export function optimizeSeoTitle(title: string, suffix: string = " | HuePress"): string {
  const maxLength = 60;
  const totalLength = title.length + suffix.length;
  
  // If already under limit, return as-is
  if (totalLength <= maxLength) {
    return title + suffix;
  }
  
  // Calculate available space for title
  const availableLength = maxLength - suffix.length - 3; // -3 for "..."
  
  // Truncate at word boundary
  const words = title.split(' ');
  let truncated = '';
  
  for (const word of words) {
    const testLength = truncated ? truncated.length + word.length + 1 : word.length;
    if (testLength > availableLength) {
      break;
    }
    truncated += (truncated ? ' ' : '') + word;
  }
  
  // If we couldn't fit any words, just hard truncate
  if (!truncated) {
    truncated = title.substring(0, availableLength);
  }
  
  return truncated + '...' + suffix;
}

/**
 * Optimizes title specifically for coloring pages
 * Removes redundant words like "Coloring Page" from the title part
 */
export function optimizeColoringPageTitle(assetTitle: string): string {
  // Remove "- Coloring Page" from asset title if present
  const cleanTitle = assetTitle.replace(/\s*-\s*Coloring Page\s*$/i, '').trim();
  
  // Add back standardized suffix
  return optimizeSeoTitle(cleanTitle, " (PDF) | HuePress");
}

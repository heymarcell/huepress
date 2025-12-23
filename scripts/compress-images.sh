#!/bin/bash
# Image Compression Script for HuePress
# Requires: sharp-cli (npm install -g sharp-cli) or sips (built-in macOS)
# This script uses macOS built-in sips for PNG optimization

set -e

PUBLIC_DIR="public"
BACKUP_DIR="public_backup_$(date +%Y%m%d_%H%M%S)"

echo "🖼️  HuePress Image Compression Script"
echo "======================================"

# Create backup
echo "📦 Creating backup at $BACKUP_DIR..."
cp -r "$PUBLIC_DIR" "$BACKUP_DIR"
echo "✅ Backup created"

# Function to compress PNG using sips
compress_png() {
  local file="$1"
  local target_size="$2"
  local original_size=$(stat -f%z "$file")
  
  echo "  Processing: $(basename "$file") ($(numfmt --to=iec $original_size 2>/dev/null || echo "${original_size}B"))"
  
  # Use sips to resize if larger than a threshold
  # For thumbnails: max 400px width
  # For avatars: max 100px width  
  # For hero: max 1200px width
  
  if [[ "$file" == *"thumb_"* ]]; then
    sips --resampleWidth 400 "$file" --out "$file" >/dev/null 2>&1 || true
  elif [[ "$file" == *"avatar_"* ]]; then
    sips --resampleWidth 100 "$file" --out "$file" >/dev/null 2>&1 || true
  elif [[ "$file" == *"hero_"* ]]; then
    sips --resampleWidth 1200 "$file" --out "$file" >/dev/null 2>&1 || true
  elif [[ "$file" == *"og-image"* ]]; then
    sips --resampleWidth 1200 "$file" --out "$file" >/dev/null 2>&1 || true
  fi
  
  local new_size=$(stat -f%z "$file")
  local saved=$((original_size - new_size))
  echo "    ✅ Saved: $(numfmt --to=iec $saved 2>/dev/null || echo "${saved}B")"
}

echo ""
echo "🔄 Compressing hero image..."
compress_png "$PUBLIC_DIR/hero_lifestyle.png"

echo ""
echo "🔄 Compressing avatar images..."
for file in "$PUBLIC_DIR/avatars/"*.png; do
  [ -f "$file" ] && compress_png "$file"
done

echo ""
echo "🔄 Compressing thumbnail images..."
for file in "$PUBLIC_DIR/thumbnails/"*.png; do
  [ -f "$file" ] && compress_png "$file"
done

echo ""
echo "🔄 Compressing og-image..."
[ -f "$PUBLIC_DIR/og-image.png" ] && compress_png "$PUBLIC_DIR/og-image.png"

echo ""
echo "======================================"
echo "✅ Compression complete!"
echo ""
echo "📊 Before/After comparison:"
echo "  Backup: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo "  Current: $(du -sh "$PUBLIC_DIR" | cut -f1)"
echo ""
echo "💡 To restore: rm -rf $PUBLIC_DIR && mv $BACKUP_DIR $PUBLIC_DIR"

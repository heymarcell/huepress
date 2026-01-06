#!/bin/bash

# HuePress SEO Validation Script
# Validates deployed SEO improvements

set -e

DOMAIN="https://huepress.co"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 HuePress SEO Validation Script"
echo "=================================="
echo ""

# Test 1: Bot Meta Tag Injection
echo "📊 Test 1: Bot Meta Tag Injection"
if curl -sA "Googlebot" "$DOMAIN/" | grep -q "og:title"; then
    echo -e "${GREEN}✓${NC} OG tags present for bots"
else
    echo -e "${RED}✗${NC} OG tags missing for bots"
fi

if curl -sA "Googlebot" "$DOMAIN/" | grep -q "twitter:card"; then
    echo -e "${GREEN}✓${NC} Twitter Card tags present"
else
    echo -e "${RED}✗${NC} Twitter Card tags missing"
fi
echo ""

# Test 2: Image Sitemap
echo "📊 Test 2: Image Sitemap Extensions"
IMAGE_COUNT=$(curl -s "$DOMAIN/sitemap.xml" | grep -c "image:image" || echo "0")
if [ "$IMAGE_COUNT" -gt 700 ]; then
    echo -e "${GREEN}✓${NC} Image sitemap present ($IMAGE_COUNT images)"
else
    echo -e "${YELLOW}⚠${NC} Image sitemap incomplete ($IMAGE_COUNT images, expected ~749)"
fi
echo ""

# Test 3: Cache Headers
echo "📊 Test 3: Edge Caching"
CACHE_STATUS=$(curl -sI "$D OMAIN/" | grep -i "cf-cache-status" | grep -oE ": [A-Z]+" | tr -d ': ' || echo "UNKNOWN")
if [ "$CACHE_STATUS" = "HIT" ] || [ "$CACHE_STATUS" = "REVALIDATED" ]; then
    echo -e "${GREEN}✓${NC} Edge caching active (cf-cache-status: $CACHE_STATUS)"
elif [ "$CACHE_STATUS" = "DYNAMIC" ]; then
    echo -e "${YELLOW}⚠${NC} Edge caching pending (cf-cache-status: DYNAMIC - run again in 1 hour)"
else
    echo -e "${RED}✗${NC} Edge caching not working (status: $CACHE_STATUS)"
fi
echo ""

# Test 4: llms.txt
echo "📊 Test 4: AI Discoverability (llms.txt)"
LLMS_LINES=$(curl -s "$DOMAIN/llms.txt" | wc -l | xargs)
if [ "$LLMS_LINES" -gt 100 ]; then
    echo -e "${GREEN}✓${NC} llms.txt expanded ($LLMS_LINES lines)"
else
    echo -e "${YELLOW}⚠${NC} llms.txt may need expansion ($LLMS_LINES lines)"
fi
echo ""

# Test 5: Robots.txt
echo "📊 Test 5: Robots.txt Host Directive"
if curl -s "$DOMAIN/robots.txt" | grep -q "Host:"; then
    echo -e "${GREEN}✓${NC} Host directive present in robots.txt"
else
    echo -e "${RED}✗${NC} Host directive missing"
fi
echo ""

# Test 6: Schema Validation
echo "📊 Test 6: Schema Markup Validation"
echo -e "${YELLOW}ℹ${NC} Manual validation required:"
echo "   • Homepage: https://validator.schema.org/#url=$DOMAIN/"
echo "   • Coloring page: https://search.google.com/test/rich-results?url=$DOMAIN/coloring-pages/rescue-pup-fire-station-duty-00942"
echo "   • Blog post: https://search.google.com/test/rich-results?url=$DOMAIN/blog/[slug]"
echo ""

# Summary
echo "=================================="
echo "✅ Automated checks complete!"
echo ""
echo "📋 Next Steps:" 
echo "1. Submit sitemap to Google Search Console: $DOMAIN/sitemap.xml"
echo "2. Run manual schema validation (see URLs above)"
echo "3. Monitor GSC Coverage report for indexing"
echo "4. Re-run this script in 24 hours to check cache status"
echo "5. Test AI citations in ChatGPT/Perplexity after 30 days"

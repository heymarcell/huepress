#!/bin/bash
echo "=== 🕵️‍♂️ HUEPRESS BOT SIMULATION REPORT ==="
echo "User Agent: AhrefsBot/7.0 (Simulated)"
echo "Timestamp: $(date)"
echo ""

check_page() {
  url=$1
  name=$2
  echo "---------------------------------------------------"
  echo "📄 Analyzing: $name"
  echo "   URL: $url"
  
  # Fetch headers and body
  # We use a temp file to avoid multiple requests
  curl -s -D /tmp/headers.txt -A "AhrefsBot/7.0" "$url" > /tmp/body.html
  
  # 1. Status Code
  status=$(grep "HTTP/" /tmp/headers.txt | head -1 | tr -d '\r')
  echo "   ✅ Status: $status"
  
  # 2. Cache Control
  cache=$(grep -i "cache-control" /tmp/headers.txt | head -1 | tr -d '\r')
  echo "   🛡️ Cache: $cache"

  # 3. Title Tag
  # Use grep with PCRE if possible, or simple sed
  title=$(grep -o '<title>.*</title>' /tmp/body.html | sed 's/<[^>]*>//g')
  echo "   🏷️ Title: $title"
  
  # 4. H1 Tag
  h1=$(grep -o '<h1[^>]*>.*</h1>' /tmp/body.html | sed 's/<[^>]*>//g')
  if [ -z "$h1" ]; then 
     echo "   ❌ H1: MISSING"
  else 
     echo "   ✅ H1: $(echo "$h1" | xargs)" # xargs trims whitespace
  fi
  
  # 5. Link Count
  links=$(grep -c '<a href' /tmp/body.html)
  if [ "$links" -lt 10 ]; then
     echo "   ⚠️ Outgoing Links: $links (LOW)"
  else
     echo "   🔗 Outgoing Links: $links"
  fi
  
  # 6. Bot Content Check
  if grep -q "Bot-friendly" /tmp/body.html; then
    echo "   🤖 Bot Content: INJECTED ✅"
  else
    echo "   ❌ Bot Content: MISSING (React Shell Only)"
  fi
}

check_page "https://huepress.co/" "Homepage"
check_page "https://huepress.co/vault" "The Vault"
check_page "https://huepress.co/collection/seasonal-flower-coloring-pages-for-all-ages" "TARGET: Collection Page"
check_page "https://huepress.co/coloring-pages/rescue-pup-fire-station-duty-00942" "Pricing Page"

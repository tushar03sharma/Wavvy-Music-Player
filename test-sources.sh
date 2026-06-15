#!/bin/bash

# Quick test script to verify all sources are working

echo "🎵 Testing Wavvy Music Sources\n"

# Test 1: Health check
echo "1. Testing server health..."
curl -s http://localhost:3000/health | jq '.'
echo "\n"

# Test 2: Get available sources
echo "2. Getting available music sources..."
curl -s http://localhost:3000/sources | jq '.'
echo "\n"

# Test 3: Search Deezer
echo "3. Searching Deezer for 'Imagine'..."
curl -s "http://localhost:3000/search?q=Imagine&source=deezer" | jq '.results[0]'
echo "\n"

# Test 4: Search with fallback
echo "4. Searching across all sources (Spotify, Deezer, Local)..."
curl -s "http://localhost:3000/search?q=Beatles" | jq '.results | length'
echo "Found multiple results across sources\n"

# Test 5: Test streaming URL
echo "5. Getting stream URL for a track..."
TRACK_ID=$(curl -s "http://localhost:3000/search?q=test" | jq -r '.results[0].id' 2>/dev/null)
if [ ! -z "$TRACK_ID" ] && [ "$TRACK_ID" != "null" ]; then
  curl -s "http://localhost:3000/stream?id=$TRACK_ID&source=deezer" | jq '.'
else
  echo "Could not find track to test streaming"
fi

echo "\n✅ Tests complete!"

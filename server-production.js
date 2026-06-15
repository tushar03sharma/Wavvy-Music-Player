const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Music Sources (Pluggable Architecture) ──────────────────────────────────
const youtubeEnabled = process.env.NODE_ENV === 'development';
const youtubeModule = youtubeEnabled ? require('./lib/sources/youtube') : null;

const musicSources = {
  // Spotify - Legal, OAuth-based (requires setup)
  spotify: {
    search: require('./lib/sources/spotify').search,
    stream: require('./lib/sources/spotify').stream,
    enabled: !!process.env.SPOTIFY_CLIENT_ID,
  },
  
  // Local files - Fully legal, user-controlled
  local: {
    search: require('./lib/sources/local').search,
    stream: require('./lib/sources/local').stream,
    enabled: true,
  },
  
  // Deezer - Legal API
  deezer: {
    search: require('./lib/sources/deezer').search,
    stream: require('./lib/sources/deezer').stream,
    enabled: true,
  },

  // YouTube - Local only (not for Render/production)
  youtube: {
    search: youtubeModule?.search,
    stream: youtubeModule?.stream,
    enabled: youtubeEnabled,
  },
};

// ─── Route: Serve frontend ────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Route: Search across enabled sources ─────────────────────────────────────
// GET /search?q=song&source=spotify,deezer,local
app.get('/search', async (req, res) => {
  const query = req.query.q?.trim();
  const sources = (req.query.source || 'deezer,spotify,local').split(',');
  
  if (!query) return res.status(400).json({ error: 'No query provided' });

  try {
    const results = [];
    
    for (const source of sources) {
      if (!musicSources[source]?.enabled) continue;
      
      try {
        const sourceResults = await musicSources[source].search(query);
        results.push(...sourceResults.map(r => ({ ...r, source })));
        if (results.length >= 10) break; // Limit to 10 total
      } catch (err) {
        console.error(`[${source} search]`, err.message);
        // Continue to next source
      }
    }

    if (!results.length) {
      return res.status(404).json({ error: 'No results found' });
    }

    res.json({ results: results.slice(0, 10) });
  } catch (err) {
    console.error('[search]', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── Route: Get streaming URL ─────────────────────────────────────────────────
// GET /stream?id=TRACK_ID&source=spotify
app.get('/stream', async (req, res) => {
  const { id, source } = req.query;
  
  if (!id || !source) {
    return res.status(400).json({ error: 'Missing id or source' });
  }

  if (!musicSources[source]?.enabled) {
    return res.status(400).json({ error: `Source '${source}' is not available` });
  }

  try {
    const streamUrl = await musicSources[source].stream(id);
    res.json({ url: streamUrl });
  } catch (err) {
    console.error(`[${source} stream]`, err.message);
    res.status(500).json({ error: 'Could not stream track' });
  }
});

// ─── Route: Get available sources ──────────────────────────────────────────────
app.get('/sources', (req, res) => {
  const available = Object.entries(musicSources)
    .filter(([_, config]) => config.enabled)
    .map(([name]) => name);
  
  res.json({ sources: available });
});

// ─── Health check for deployment ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', sources: Object.keys(musicSources).filter(s => musicSources[s].enabled) });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const enabledSources = Object.keys(musicSources).filter(s => musicSources[s].enabled);
  console.log(`\n🎵  Wavvy is running!`);
  console.log(`    Open → http://localhost:${PORT}`);
  console.log(`    Enabled sources: ${enabledSources.join(', ') || 'NONE'}`);
  console.log(`    Press Ctrl+C to stop\n`);
});

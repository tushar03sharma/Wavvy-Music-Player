const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const http = require('http');
const https = require('https');
const path = require('path');

const execAsync = promisify(exec);
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helper: run yt-dlp, returns stdout string ──────────────────────────────
async function runYtdlp(args) {
  const { stdout } = await execAsync(`yt-dlp ${args} --no-warnings`, {
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

// ─── Route: Serve frontend ──────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Route: Search ──────────────────────────────────────────────────────────
// GET /search?q=Arijit+Singh
app.get('/search', async (req, res) => {
  const query = req.query.q?.trim();
  if (!query) return res.status(400).json({ error: 'No query' });

  try {
    // -j = print JSON per entry, --flat-playlist = don't recurse into playlists
    const stdout = await runYtdlp(
      `"ytsearch10:${query}" -j --flat-playlist --quiet`
    );

    // yt-dlp outputs one JSON object per line
    const results = stdout
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const e = JSON.parse(line);
        return {
          id: e.id,
          title: e.title || 'Unknown',
          artist: e.uploader || e.channel || 'Unknown',
          duration: e.duration || 0,
          thumbnail: e.thumbnail || `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`,
        };
      });

    res.json({ results });
  } catch (err) {
    console.error('[search]', err.message);
    res.status(500).json({ error: 'Search failed. Make sure yt-dlp is installed.' });
  }
});

// ─── Route: Audio info (title, artist, direct audio URL) ────────────────────
// GET /info?id=VIDEO_ID
app.get('/info', async (req, res) => {
  const id = req.query.id?.trim();
  if (!id) return res.status(400).json({ error: 'No ID' });

  try {
    const url = `https://www.youtube.com/watch?v=${id}`;
    const stdout = await runYtdlp(`"${url}" -j -f bestaudio --quiet`);
    const data = JSON.parse(stdout);

    res.json({
      id: data.id,
      title: data.title,
      artist: data.uploader || data.channel,
      duration: data.duration,
      thumbnail: data.thumbnail,
      ext: data.ext,
    });
  } catch (err) {
    console.error('[info]', err.message);
    res.status(500).json({ error: 'Could not fetch info' });
  }
});

// ─── Route: Stream audio ─────────────────────────────────────────────────────
// GET /stream?id=VIDEO_ID
// yt-dlp gets the raw audio URL → we proxy it to the browser
// (browser can't fetch YouTube audio directly due to CORS + tokens)
app.get('/stream', async (req, res) => {
  const id = req.query.id?.trim();
  if (!id) return res.status(400).json({ error: 'No ID' });

  try {
    const url = `https://www.youtube.com/watch?v=${id}`;
    const stdout = await runYtdlp(
      `"${url}" -j -f "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio" --quiet`
    );
    const data = JSON.parse(stdout);
    const audioUrl = data.url;
    const ext = data.ext || 'webm';

    // Forward Range header so seek works
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
    if (req.headers['range']) headers['Range'] = req.headers['range'];

    const lib = audioUrl.startsWith('https') ? https : http;
    const ytReq = lib.get(audioUrl, { headers }, (ytRes) => {
      const outHeaders = {
        'Content-Type': `audio/${ext}`,
        'Accept-Ranges': 'bytes',
      };
      if (ytRes.headers['content-length'])
        outHeaders['Content-Length'] = ytRes.headers['content-length'];
      if (ytRes.headers['content-range'])
        outHeaders['Content-Range'] = ytRes.headers['content-range'];

      res.writeHead(ytRes.statusCode, outHeaders);
      ytRes.pipe(res);
    });

    ytReq.on('error', err => {
      console.error('[stream proxy]', err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Stream failed' });
    });

    req.on('close', () => ytReq.destroy());
  } catch (err) {
    console.error('[stream]', err.message);
    res.status(500).json({ error: 'Could not stream audio' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎵  Wavvy is running!`);
  console.log(`    Open → http://localhost:${PORT}`);
  console.log(`    Press Ctrl+C to stop\n`);
});

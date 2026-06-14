# 🎵 Wavvy - Multi-Source Music Player

A modern, resilient music player that works with **multiple legal music sources**.


## Features

- 🔍 **Multi-source search** - Spotify, Deezer, Local files
- 📱 **Queue system** - Manage your playlist
- 🎚️ **Playback controls** - Play, pause, shuffle, repeat, seek
- 🎨 **Beautiful UI** - Dark theme, responsive design
- 🛡️ **Copyright-safe** - No YouTube extraction on production
- 🚀 **Vercel-ready** - Deploy without copyright concerns

## Music Sources

### 🎧 Deezer (Free, No Setup)
- Free API access
- 30-second preview clips
- No authentication needed
- Works everywhere (including Vercel)

### 🎵 Spotify (Optional)
- Official Spotify Web API
- 30-second preview clips
- Requires API credentials
- User OAuth available for full access

### 📁 Local Files (Full Control)
- Upload your own music
- MP3, M4A, WAV, FLAC, AAC support
- Fully legal & under your control
- Great for Vercel deployment

### 🎬 YouTube (Dev Only)
- Local development with `yt-dlp`
- Full-length streams
- **Not for production** - copyright/ToS issues


## Quick Start

### Development (All Sources)

```bash
# Install dependencies
npm install

# Install yt-dlp for YouTube
brew install yt-dlp  # macOS
sudo apt install yt-dlp  # Ubuntu

# Start
npm run dev
```

### Production (Vercel-Safe)

```bash
# Use production server
npm run start:prod

# Or deploy to Vercel
vercel deploy
```

## Project Structure

```
wavvy-node/
├── server.js                 # Development server (YouTube + all sources)
├── server-production.js      # Production server (Vercel-safe)
├── public/
│   ├── index.html           # HTML markup
│   ├── styles.css           # Styling
│   └── app.js               # Frontend logic
├── lib/sources/
│   ├── spotify.js           # Spotify API
│   ├── deezer.js            # Deezer API
│   ├── local.js             # Local file uploads
│   └── youtube.js           # YouTube (dev only)
├── uploads/                 # User-uploaded music
├── DEPLOYMENT.md            # Detailed deploy guide
└── PUBLIC_DISCLAIMER.md     # Legal info
```

## API Endpoints

### Search
```bash
# Search across all enabled sources
GET /search?q=song+name

# Search specific sources only
GET /search?q=song&source=spotify,deezer

# Response
{
  "results": [
    {
      "id": "123456",
      "title": "Song Name",
      "artist": "Artist Name",
      "duration": 240,
      "thumbnail": "...",
      "source": "deezer",
      "preview": "https://..." // Optional preview URL
    }
  ]
}
```

### Stream
```bash
GET /stream?id=TRACK_ID&source=deezer

# Response
{
  "url": "https://audio-stream-url..."
}
```

### Available Sources
```bash
GET /sources

# Response
{
  "sources": ["deezer", "spotify", "local"]
}
```

### Health Check
```bash
GET /health

# Response
{
  "status": "ok",
  "sources": ["deezer", "spotify", "local"]
}
```

## Configuration

Create `.env` file:

```env
# Spotify (optional)
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# Environment
NODE_ENV=development
PORT=3000
```

## Deployment to Vercel

### 1. Prepare
```bash
# Vercel will automatically use server-production.js
# Just push to your repo
```

### 2. Add Spotify (Optional)
- Go to https://developer.spotify.com/dashboard
- Create app, get credentials
- Add to Vercel environment:
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`

### 3. Deploy
```bash
vercel deploy
```

### 4. Test
```bash
curl https://your-app.vercel.app/sources
# Should return: ["deezer", "spotify", "local"]

curl https://your-app.vercel.app/search?q=song
# Should return search results
```

## Why This Approach is Resilient

| Issue | Solution |
|-------|----------|
| YouTube blocks extraction | Use Deezer/Spotify instead |
| yt-dlp not on serverless | Production server disables it |
| Copyright strikes | Only use licensed APIs |
| User wants full songs | Local file uploads or Spotify Premium |
| Single source failure | Fallback to next source |
| Limited preview length | Document in UI with badges |

## Frontend Features

- ✅ Source badges show which service provided track
- ✅ Preview warnings (30s clips for Spotify/Deezer)
- ✅ Automatic source detection on load
- ✅ Graceful fallbacks when sources unavailable
- ✅ Toast notifications for user feedback

## Troubleshooting

### "No results found"
- Check available sources: `GET /sources`
- Try different search terms
- Verify internet connection

### "Only Deezer results showing"
- Spotify credentials missing? Set in `.env`
- Local file uploads? Create `uploads/` dir and add files

### "Stream failed"
- Spotify/Deezer = 30-second preview only
- YouTube disabled on Vercel (as intended)
- Try different track or source

### Deploy to Vercel but it's slow
- Deezer API might be rate-limited
- Add caching headers in production
- Consider upgrading Vercel plan

## Legal Notes

⚠️ See [PUBLIC_DISCLAIMER.md](PUBLIC_DISCLAIMER.md) for important legal information.

**TL;DR:**
- ✅ Deezer/Spotify APIs are legal
- ✅ Local files are fully legal
- ❌ YouTube extraction is not for production
- ✅ This setup is production-ready when YouTube is disabled

## Development

### Add a New Music Source

1. Create `lib/sources/mysource.js`:
```javascript
async function search(query) {
  // Return array of tracks
  return [{
    id: "123",
    title: "Song",
    artist: "Artist",
    duration: 240,
    thumbnail: "...",
  }];
}

async function stream(trackId) {
  // Return streaming URL
  return "https://...";
}

module.exports = { search, stream };
```

2. Register in `server-production.js`:
```javascript
const musicSources = {
  mysource: {
    search: require('./lib/sources/mysource').search,
    stream: require('./lib/sources/mysource').stream,
    enabled: true,
  },
  // ...
};
```

## License

MIT - Use for personal/educational purposes. See disclaimer for production considerations.

## Credits

Originally vibe-coded as a YouTube music player, now refactored for resilience and legal compliance.

🎵 Wavvy - Because good music deserves a good player.

### The 3 routes in server.js:

| Route | What it does |
|-------|-------------|
| `GET /` | Serves index.html |
| `GET /search?q=song` | Runs yt-dlp search, returns JSON |
| `GET /stream?id=VIDEO_ID` | Gets audio URL via yt-dlp, proxies stream |

---

## File structure
```
wavvy-node/
├── server.js          ← Express backend (Node.js)
├── package.json       ← Dependencies list
├── public/
│   └── index.html     ← Frontend (HTML + CSS + JS)
└── README.md
```

## Dev mode (auto-restart on file changes)
```bash
npm run dev
```

## Upgrade ideas
- Save playlists to a JSON file or SQLite
- Add user login with express-session
- Deploy to Railway.app (free) for 24/7 access
- Add lyrics via Genius API
- Build a React frontend on top of the same server.js
# Wavvy-Music-Player

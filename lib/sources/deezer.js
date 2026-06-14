/**
 * Deezer Music Source
 * Free API - No authentication required
 * Limitations: ~30 second preview clips (similar to Spotify)
 */

const https = require('https');

async function search(query) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.deezer.com',
      path: `/search?q=${encodeURIComponent(query)}&limit=10`,
      method: 'GET',
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const tracks = json.data || [];

          const results = tracks.map((track) => ({
            id: track.id,
            title: track.title,
            artist: track.artist?.name || 'Unknown',
            duration: track.duration,
            thumbnail: track.album?.cover_medium || '',
            preview: track.preview, // Deezer provides preview URLs
          }));

          resolve(results);
        } catch (err) {
          reject(new Error('Failed to parse Deezer response'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function stream(trackId) {
  // Deezer free API only provides 30-second preview URLs
  // For full streams, would need premium account
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.deezer.com',
      path: `/track/${trackId}`,
      method: 'GET',
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const previewUrl = json.preview;

          if (!previewUrl) {
            throw new Error('No preview available for this track');
          }

          resolve(previewUrl);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

module.exports = { search, stream };

/**
 * Spotify Music Source
 * Requires: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET environment variables
 * Setup: https://developer.spotify.com/dashboard
 */

const https = require('https');

let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  // Use cached token if still valid
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'accounts.spotify.com',
      path: '/api/token',
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          accessToken = json.access_token;
          tokenExpiry = Date.now() + json.expires_in * 1000;
          resolve(accessToken);
        } catch (err) {
          reject(new Error('Failed to parse Spotify auth response'));
        }
      });
    });

    req.on('error', reject);
    req.write('grant_type=client_credentials');
    req.end();
  });
}

async function search(query) {
  const token = await getAccessToken();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.spotify.com',
      path: `/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const tracks = json.tracks?.items || [];

          const results = tracks.map((track) => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map((a) => a.name).join(', '),
            duration: Math.floor(track.duration_ms / 1000),
            thumbnail: track.album?.images?.[0]?.url || '',
            preview: track.preview_url, // Spotify provides 30s preview
          }));

          resolve(results);
        } catch (err) {
          reject(new Error('Failed to parse Spotify search response'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function stream(trackId) {
  // Spotify Web API doesn't provide direct streaming URLs (requires Premium auth)
  // Return preview URL instead (30 seconds)
  // For full streaming, you'd need user OAuth flow
  
  const token = await getAccessToken();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.spotify.com',
      path: `/v1/tracks/${trackId}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const previewUrl = json.preview_url;

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

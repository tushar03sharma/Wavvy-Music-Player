/**
 * YouTube Source (Development/Local only)
 * WARNING: Not suitable for production/Vercel deployment
 * - yt-dlp not available on serverless
 * - YouTube actively blocks extraction
 * - Copyright/ToS violations
 * 
 * Use only for local development. For production, use Spotify/Deezer/Local sources.
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Check if yt-dlp is installed
async function checkYtdlp() {
  try {
    await execAsync('yt-dlp --version');
    return true;
  } catch {
    return false;
  }
}

async function runYtdlp(args) {
  const { stdout } = await execAsync(`yt-dlp ${args} --no-warnings`, {
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

async function search(query) {
  const isAvailable = await checkYtdlp();
  if (!isAvailable) {
    throw new Error('yt-dlp not installed. YouTube source unavailable.');
  }

  try {
    const stdout = await runYtdlp(
      `"ytsearch10:${query}" -j --flat-playlist --quiet`
    );

    const results = stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const e = JSON.parse(line);
        return {
          id: e.id,
          title: e.title || 'Unknown',
          artist: e.uploader || e.channel || 'Unknown',
          duration: e.duration || 0,
          thumbnail: e.thumbnail || `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`,
        };
      });

    return results;
  } catch (err) {
    throw new Error(`YouTube search failed: ${err.message}`);
  }
}

async function stream(videoId) {
  const isAvailable = await checkYtdlp();
  if (!isAvailable) {
    throw new Error('yt-dlp not installed. YouTube streaming unavailable.');
  }

  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const stdout = await runYtdlp(
      `"${url}" -j -f "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio" --quiet`
    );
    const data = JSON.parse(stdout);

    if (!data.url) {
      throw new Error('No stream URL found');
    }

    return data.url;
  } catch (err) {
    throw new Error(`YouTube stream failed: ${err.message}`);
  }
}

module.exports = { search, stream };

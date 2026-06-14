/**
 * Local File Source
 * Allows users to upload/use their own music files
 * Fully legal and under user control
 */

const fs = require('fs').promises;
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

async function search(query) {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    
    const files = await fs.readdir(UPLOAD_DIR);
    const audioFiles = files.filter((f) =>
      /\.(mp3|m4a|wav|flac|aac)$/i.test(f)
    );

    // Simple string matching search
    const results = audioFiles
      .filter((f) => f.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10)
      .map((filename) => ({
        id: Buffer.from(filename).toString('base64'), // Encode filename as ID
        title: filename.replace(/\.[^/.]+$/, ''), // Remove extension
        artist: 'Local File',
        duration: 0, // Would need to parse metadata for accurate duration
        thumbnail: '', // Could extract from ID3 tags
      }));

    return results;
  } catch (err) {
    console.error('[local search]', err.message);
    return [];
  }
}

async function stream(trackId) {
  try {
    const filename = Buffer.from(trackId, 'base64').toString('utf8');
    const filePath = path.join(UPLOAD_DIR, filename);

    // Security: Prevent directory traversal
    if (!filePath.startsWith(UPLOAD_DIR)) {
      throw new Error('Invalid file path');
    }

    // Check if file exists
    await fs.access(filePath);

    // Return local URL path
    return `/uploads/${filename}`;
  } catch (err) {
    throw new Error('File not found or inaccessible');
  }
}

module.exports = { search, stream };

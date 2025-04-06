// api/download.js - Download a file
const { list } = require('@vercel/blob');

module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const filePath = req.query.path;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Find the file in Vercel Blob
    const { blobs } = await list({ prefix: filePath });
    
    if (blobs.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Redirect to the file URL for download
    const fileUrl = blobs[0].url;
    
    // Extract display name for download
    const parts = filePath.split('/');
    const filename = parts[parts.length - 1];
    const displayName = filename.split('-').slice(2).join('-');
    
    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(displayName)}"`);
    
    // Redirect to the file URL
    res.redirect(307, fileUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file: ' + error.message });
  }
};
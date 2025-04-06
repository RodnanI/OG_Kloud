// api/folders.js - Create a new folder
const { put } = require('@vercel/blob');

module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { path: folderPath, name } = req.body;
    
    if (!name || name.includes('/') || name.includes('\\')) {
      return res.status(400).json({ error: 'Invalid folder name' });
    }
    
    // In blob storage, folders don't actually exist - they're just prefixes
    // We'll create an empty placeholder file to represent the folder
    const fullPath = folderPath ? `${folderPath}/${name}/.folder` : `${name}/.folder`;
    
    // Create an empty file to represent the folder
    await put(fullPath, new Uint8Array(), {
      access: 'public',
      contentType: 'application/json'
    });
    
    res.status(200).json({
      message: 'Folder created successfully',
      folder: {
        name: name,
        path: folderPath ? `${folderPath}/${name}` : name,
        type: 'folder',
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder: ' + error.message });
  }
};
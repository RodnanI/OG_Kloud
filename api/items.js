// api/items.js - Delete a file or folder
const { list, del } = require('@vercel/blob');

module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const itemPath = req.query.path;
    
    if (!itemPath) {
      return res.status(400).json({ error: 'Item path is required' });
    }
    
    // Find all items with this prefix
    const { blobs } = await list({ prefix: itemPath });
    
    if (blobs.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Delete all matching items
    for (const blob of blobs) {
      await del(blob.pathname);
    }
    
    const isDirectory = blobs.length > 1 || itemPath.endsWith('/');
    
    res.status(200).json({
      message: `${isDirectory ? 'Folder' : 'File'} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item: ' + error.message });
  }
};
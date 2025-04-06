// api/rename.js - Rename a file or folder
const { list, put, del } = require('@vercel/blob');

module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { path: itemPath, newName } = req.body;
    
    if (!itemPath || !newName) {
      return res.status(400).json({ error: 'Path and new name are required' });
    }
    
    if (newName.includes('/') || newName.includes('\\')) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    
    // Find the item(s) in Vercel Blob
    const { blobs } = await list({ prefix: itemPath });
    
    if (blobs.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Check if this is a folder (multiple items with the same prefix)
    const isFolder = blobs.length > 1 || itemPath.endsWith('/') || blobs[0].pathname.endsWith('/.folder');
    
    if (isFolder) {
      // For folders, we need to move all contents
      const pathParts = itemPath.split('/');
      const parentPath = pathParts.slice(0, -1).join('/');
      const newFolderPath = parentPath ? `${parentPath}/${newName}` : newName;
      
      // Move each item in the folder
      for (const blob of blobs) {
        const relativePath = blob.pathname.slice(itemPath.length);
        const newPath = `${newFolderPath}${relativePath}`;
        
        // Get the file content
        const response = await fetch(blob.url);
        const buffer = await response.arrayBuffer();
        
        // Upload with new path
        await put(newPath, new Uint8Array(buffer), {
          access: 'public',
          contentType: blob.contentType
        });
        
        // Delete old file
        await del(blob.pathname);
      }
      
      res.status(200).json({
        message: 'Folder renamed successfully',
        path: newFolderPath
      });
    } else {
      // For a single file
      const blob = blobs[0];
      const pathParts = blob.pathname.split('/');
      const filename = pathParts.pop();
      const parentPath = pathParts.join('/');
      
      // Parse the original filename
      const parts = filename.split('-');
      const timePrefix = parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]) 
        ? `${parts[0]}-${parts[1]}-` 
        : '';
      
      // Create new filename with original timestamp prefix
      const newFilename = `${timePrefix}${newName}`;
      const newPath = parentPath ? `${parentPath}/${newFilename}` : newFilename;
      
      // Get the file content
      const response = await fetch(blob.url);
      const buffer = await response.arrayBuffer();
      
      // Upload with new path
      await put(newPath, new Uint8Array(buffer), {
        access: 'public',
        contentType: blob.contentType
      });
      
      // Delete old file
      await del(blob.pathname);
      
      res.status(200).json({
        message: 'File renamed successfully',
        path: newPath
      });
    }
  } catch (error) {
    console.error('Error renaming item:', error);
    res.status(500).json({ error: 'Failed to rename item: ' + error.message });
  }
};
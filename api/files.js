// api/files.js - List files in a directory
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
    // For first-time setup, if there are no files yet, return an empty array
    const folderPath = req.query.path || '';
    
    // REMOVE THIS TEMPORARY CODE - This is causing your 500 error
    // Since it's returning before actually doing anything with @vercel/blob
    // if (true) {
    //   return res.status(200).json([]);
    // }
    
    const { blobs } = await list({ prefix: folderPath });
    
    // Process blobs to construct folders and files structure
    const items = [];
    const processedFolders = new Set();
    
    blobs.forEach(blob => {
      const path = blob.pathname;
      if (path === folderPath) return;
      
      // For nested paths, create folder structure
      if (path.startsWith(folderPath)) {
        let remainingPath = path.slice(folderPath.length);
        if (remainingPath.startsWith('/')) remainingPath = remainingPath.slice(1);
        
        const slashIndex = remainingPath.indexOf('/');
        
        if (slashIndex !== -1) {
          // This is a nested item - create a folder
          const folderName = remainingPath.slice(0, slashIndex);
          const fullFolderPath = folderPath ? `${folderPath}/${folderName}` : folderName;
          
          if (folderName && !processedFolders.has(fullFolderPath)) {
            processedFolders.add(fullFolderPath);
            
            items.push({
              name: folderName,
              path: fullFolderPath,
              type: 'folder',
              createdAt: new Date()
            });
          }
        } else {
          // This is a file in the current directory
          const parts = path.split('/');
          const fileName = parts[parts.length - 1];
          
          items.push({
            name: fileName,
            path: path,
            type: 'file',
            size: blob.size,
            createdAt: new Date(blob.uploadedAt),
            url: blob.url
          });
        }
      }
    });
    
    // If no files were found, just return an empty array
    if (items.length === 0) {
      return res.status(200).json([]);
    }
    
    res.status(200).json(items);
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to retrieve files: ' + error.message });
  }
};
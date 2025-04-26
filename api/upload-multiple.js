// api/upload-multiple.js - Upload multiple files
const { put } = require('@vercel/blob');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware to handle file uploads
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

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
    // Process the uploaded files using multer
    await runMiddleware(req, res, upload.array('files'));
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const folderPath = req.body.folderPath || '';
    const uploadResults = [];
    
    // Upload each file to Vercel Blob
    for (const file of req.files) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const displayName = file.originalname; // Use original filename for multiple uploads
      const fileName = `${uniqueSuffix}-${displayName}`;
      
      let fullPath = fileName;
      if (folderPath) {
        fullPath = `${folderPath}/${fileName}`;
      }
      
      // Upload to Vercel Blob
      const blob = await put(fullPath, file.buffer, {
        access: 'public',
        contentType: file.mimetype
      });
      
      uploadResults.push({
        name: displayName,
        path: fullPath,
        type: 'file',
        size: file.size,
        createdAt: new Date(),
        url: blob.url
      });
    }
    
    res.status(200).json({
      message: `${uploadResults.length} file(s) uploaded successfully`,
      files: uploadResults
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files: ' + error.message });
  }
};
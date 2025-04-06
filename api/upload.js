// api/upload.js - Upload a file
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
    // Process the uploaded file using multer
    await runMiddleware(req, res, upload.single('file'));
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const folderPath = req.body.folderPath || '';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const displayName = req.body.displayName || req.file.originalname;
    const fileName = `${uniqueSuffix}-${displayName}`;
    
    let fullPath = fileName;
    if (folderPath) {
      fullPath = `${folderPath}/${fileName}`;
    }
    
    // Upload to Vercel Blob
    const blob = await put(fullPath, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype
    });
    
    res.status(200).json({
      message: 'File uploaded successfully',
      file: {
        name: displayName,
        path: fullPath,
        type: 'file',
        size: req.file.size,
        createdAt: new Date(),
        url: blob.url
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file: ' + error.message });
  }
};
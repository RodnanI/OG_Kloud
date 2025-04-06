// api/debug.js - Debug endpoint to test configuration
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
      // Check for environment variables
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN ? 'Present (value hidden)' : 'Missing';
      
      // Return debug info
      res.status(200).json({
        message: 'Debug endpoint successfully reached',
        environment: process.env.NODE_ENV || 'not set',
        blobToken: blobToken,
        apiVersion: 'v1.0',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({ 
        error: 'An error occurred in the debug endpoint',
        message: error.message
      });
    }
  };
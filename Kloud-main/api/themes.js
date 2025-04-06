// api/themes.js - Get available themes
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
  
    // In a serverless environment, we can't read the file system directly
    // We would need to store themes in a database or hardcode them
    // For now, we'll return a fixed set of themes
    res.status(200).json({
      themes: [
        'dark-blue.css',
        'light-green.css',
        'high-contrast.css'
      ],
      activeTheme: 'default'
    });
  };
// api/themes-set.js - Set active theme
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
      const { themeName } = req.body;
      
      if (!themeName) {
        return res.status(400).json({ error: 'Theme name is required' });
      }
      
      // In a serverless environment, we should store user preferences in a database
      // For now, we'll just acknowledge the request
      res.status(200).json({
        success: true,
        themeName
      });
    } catch (error) {
      console.error('Error setting theme:', error);
      res.status(500).json({ error: 'Failed to set theme: ' + error.message });
    }
  };
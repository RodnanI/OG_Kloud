const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const session = require('express-session');

// Import authentication module
const auth = require('./login');

const app = express();
const PORT = 3000;

// Base uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Create a themes directory if it doesn't exist
const themesDir = path.join(__dirname, 'public', 'themes');
if (!fs.existsSync(themesDir)) {
  fs.mkdirSync(themesDir, { recursive: true });
}

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Get the folder path from the request or use root uploads directory
    const folderPath = req.body.folderPath ? 
      path.join(uploadsDir, req.body.folderPath) : 
      uploadsDir;
    
    // Ensure the folder exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    cb(null, folderPath);
  },
  filename: function (req, file, cb) {
    // Keep original filename but make it unique with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const displayName = req.body.displayName || file.originalname;
    cb(null, uniqueSuffix + '-' + displayName);
  }
});

const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add session middleware with more secure settings
app.use(session({
  secret: 'kloud-themes-secret',
  resave: false,
  saveUninitialized: false, // Changed to false for better security
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'strict'
  }
}));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body ? '- has body data' : '');
  next();
});

// Apply authentication routes
app.use('/api', auth.router);

// Direct login endpoint - defined before any middleware
app.post('/api/login', express.json(), (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt for username:', username);

  // Hardcoded credentials - in a real app, this would be in a database
  const validCredentials = {
    username: 'koch',
    password: 'furth2025'
  };

  // Check credentials
  if (username === validCredentials.username && password === validCredentials.password) {
    // Set session
    req.session.authenticated = true;
    req.session.user = { username };
    
    // Make sure session is saved before sending response
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ success: false, message: 'Session error' });
      }
      
      console.log('Login successful for:', username);
      return res.status(200).json({ 
        success: true, 
        message: 'Login successful',
        redirect: '/'
      });
    });
  } else {
    // Invalid credentials
    console.log('Login failed for:', username);
    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  }
});

// Auth status endpoint - MUST be defined before auth middleware
app.get('/api/auth-status', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.status(200).json({
      authenticated: true,
      user: req.session.user
    });
  }
  
  return res.status(200).json({
    authenticated: false
  });
});

// Direct logout route - MUST be defined before the auth middleware
app.get('/logout', (req, res) => {
  console.log('Logout route triggered');
  if (req.session) {
    req.session.destroy((err) => {
      if (err) console.error('Error destroying session:', err);
      res.redirect('/login.html');
    });
  } else {
    res.redirect('/login.html');
  }
});

// Apply authentication middleware
app.use(auth.requireAuth);

// Serve static files after authentication middleware
app.use(express.static('public'));

// Helper function to get all files recursively
function getAllFiles(dir, currentPath = '') {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const relativePath = path.join(currentPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // It's a directory, so skip system folders that start with .
      if (!file.startsWith('.')) {
        results.push({
          name: file,
          path: relativePath,
          type: 'folder',
          createdAt: stat.birthtime
        });
      }
    } else {
      // It's a file
      results.push({
        name: file,
        path: relativePath,
        type: 'file',
        size: stat.size,
        createdAt: stat.birthtime
      });
    }
  });
  
  return results;
}

// Helper function to get file info
function getFileInfo(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const pathInfo = path.parse(filePath);
    
    return {
      name: pathInfo.base,
      path: path.relative(uploadsDir, filePath),
      type: 'file',
      size: stats.size,
      createdAt: stats.birthtime
    };
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
}

// Routes
// Get files and folders for a specific path
app.get('/api/files', (req, res) => {
  try {
    const folderPath = req.query.path || '';
    const fullPath = path.join(uploadsDir, folderPath);
    
    // Check if path exists and is a directory
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const items = getAllFiles(fullPath);
    res.json(items);
  } catch (error) {
    console.error('Error reading directory:', error);
    res.status(500).json({ error: 'Failed to retrieve files' });
  }
});

// Create a new folder
app.post('/api/folders', (req, res) => {
  try {
    const { path: folderPath, name } = req.body;
    
    if (!name || name.includes('/') || name.includes('\\')) {
      return res.status(400).json({ error: 'Invalid folder name' });
    }
    
    const parentPath = folderPath ? path.join(uploadsDir, folderPath) : uploadsDir;
    const newFolderPath = path.join(parentPath, name);
    
    // Check if parent path exists
    if (!fs.existsSync(parentPath)) {
      return res.status(404).json({ error: 'Parent folder not found' });
    }
    
    // Check if folder already exists
    if (fs.existsSync(newFolderPath)) {
      return res.status(409).json({ error: 'Folder already exists' });
    }
    
    fs.mkdirSync(newFolderPath);
    
    res.json({ 
      message: 'Folder created successfully',
      folder: {
        name: name,
        path: path.join(folderPath || '', name),
        type: 'folder',
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Upload a file
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const fileInfo = getFileInfo(req.file.path);
  
  res.json({ 
    message: 'File uploaded successfully',
    file: fileInfo
  });
});

// Download a file
app.get('/api/download/:filePath(*)', (req, res) => {
  try {
    const filePath = req.params.filePath;
    const fullPath = path.join(uploadsDir, filePath);
    
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Extract the original filename (after timestamp)
    const filename = path.basename(filePath).split('-').slice(2).join('-');
    
    res.download(fullPath, filename);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Rename a file or folder
app.put('/api/rename', (req, res) => {
  try {
    const { path: itemPath, newName } = req.body;
    
    if (!itemPath || !newName) {
      return res.status(400).json({ error: 'Path and new name are required' });
    }
    
    if (newName.includes('/') || newName.includes('\\')) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    
    const fullPath = path.join(uploadsDir, itemPath);
    
    // Check if item exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const pathInfo = path.parse(fullPath);
    const parentDir = pathInfo.dir;
    
    // For files, preserve the timestamp prefix in the name
    let newFileName = newName;
    const isFile = fs.statSync(fullPath).isFile();
    
    if (isFile) {
      const parts = pathInfo.base.split('-');
      if (parts.length >= 2) {
        // Keep timestamp prefix (first two parts)
        newFileName = `${parts[0]}-${parts[1]}-${newName}`;
      }
    }
    
    const newPath = path.join(parentDir, newFileName);
    
    // Check if target already exists
    if (fs.existsSync(newPath)) {
      return res.status(409).json({ error: 'An item with this name already exists' });
    }
    
    fs.renameSync(fullPath, newPath);
    
    const newRelativePath = path.relative(uploadsDir, newPath);
    
    res.json({ 
      message: 'Item renamed successfully',
      path: newRelativePath
    });
  } catch (error) {
    console.error('Error renaming item:', error);
    res.status(500).json({ error: 'Failed to rename item' });
  }
});

// Delete a file or folder
app.delete('/api/items/:itemPath(*)', (req, res) => {
  try {
    const itemPath = req.params.itemPath;
    const fullPath = path.join(uploadsDir, itemPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const isDirectory = fs.statSync(fullPath).isDirectory();
    
    if (isDirectory) {
      // Recursively delete folder and contents
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      // Delete a file
      fs.unlinkSync(fullPath);
    }
    
    res.json({ message: `${isDirectory ? 'Folder' : 'File'} deleted successfully` });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Server info for network access
app.get('/api/serverinfo', (req, res) => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  
  const addresses = [];
  for (const iface of Object.values(networkInterfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        addresses.push(addr.address);
      }
    }
  }
  
  res.json({
    addresses: addresses,
    port: PORT
  });
});

// API endpoint to get available CSS themes
app.get('/api/themes', (req, res) => {
  try {
    const files = fs.readdirSync(themesDir);
    const cssFiles = files.filter(file => path.extname(file).toLowerCase() === '.css');
    
    // Get the current active theme from the session or default to original
    const activeTheme = req.session?.activeTheme || 'default';
    
    res.json({ 
      themes: cssFiles,
      activeTheme: activeTheme
    });
  } catch (error) {
    console.error('Error reading themes directory:', error);
    res.status(500).json({ error: 'Failed to get available themes' });
  }
});

// API endpoint to set active theme
app.post('/api/themes/set', (req, res) => {
  try {
    const { themeName } = req.body;
    
    if (!themeName) {
      return res.status(400).json({ error: 'Theme name is required' });
    }
    
    // If theme is "default", use the original styles.css
    if (themeName === 'default') {
      // Store in session if using sessions
      if (req.session) {
        req.session.activeTheme = 'default';
      }
      return res.json({ success: true, themeName: 'default' });
    }
    
    // Check if the theme exists
    const themePath = path.join(themesDir, themeName);
    if (!fs.existsSync(themePath)) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    
    // Store in session if using sessions
    if (req.session) {
      req.session.activeTheme = themeName;
    }
    
    res.json({ success: true, themeName });
  } catch (error) {
    console.error('Error setting theme:', error);
    res.status(500).json({ error: 'Failed to set theme' });
  }
});

// Make the login page the default route
app.get('/', (req, res) => {
  // If already authenticated, show the main application
  if (req.session.authenticated) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  
  // Otherwise redirect to login
  res.redirect('/login.html');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Network access:');
  
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  
  for (const iface of Object.values(networkInterfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`http://${addr.address}:${PORT}`);
      }
    }
  }
});
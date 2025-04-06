const express = require('express');
const router = express.Router();

// Hardcoded credentials - in a real app, this would be in a database
const validCredentials = {
  username: 'koch',
  password: 'furth2025'
};

// Login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Login attempt:', username);

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

// Logout route
router.get('/logout', (req, res) => {
  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    
    // Redirect to login page
    res.redirect('/login.html');
  });
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  // Skip authentication check for login-related routes and static assets
  if (req.path === '/login.html' || 
      req.path === '/api/login' || 
      req.path === '/api/auth-status' ||
      req.path === '/logout' ||
      req.path.startsWith('/styles.css') || 
      req.path.includes('font-awesome') ||
      req.path.endsWith('.js') || 
      req.path.endsWith('.ico')) {
    return next();
  }
  
  // Check if user is authenticated
  if (req.session && req.session.authenticated) {
    return next();
  }
  
  // If API request, return 401
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Redirect to login page
  console.log('Redirecting to login page');
  res.redirect('/login.html');
};

module.exports = {
  router,
  requireAuth
};
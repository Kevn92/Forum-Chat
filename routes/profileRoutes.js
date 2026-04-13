const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Note: Multer is configured in server.js and passed as middleware

router.get('/settings', isAuthenticated, profileController.getSettings);
router.post('/update', isAuthenticated, (req, res, next) => {
  req.upload.single('profile_picture')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      req.flash('error', 'Upload failed: ' + err.message);
      return res.redirect('/profile/settings');
    }
    next();
  });
}, profileController.updateSettings);
router.post('/delete', isAuthenticated, profileController.deleteAccount);

module.exports = router;
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// All routes require authentication and admin role
router.use(isAuthenticated);

// User management
router.get('/users', adminController.getUsers);
router.post('/users/delete/:userId', adminController.deleteUser);

// Forum management
router.post('/forums/delete/:forumId', adminController.deleteForum);

module.exports = router;

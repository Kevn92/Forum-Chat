const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.get('/', isAuthenticated, forumController.getForums);
router.post('/create', isAuthenticated, forumController.createForum);
router.post('/delete/:id', isAuthenticated, forumController.deleteForum);

module.exports = router;
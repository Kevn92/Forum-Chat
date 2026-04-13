const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.get('/forum/:forumId', isAuthenticated, chatController.getForumChat);
router.get('/forum/:forumId/messages', isAuthenticated, chatController.loadMoreMessages);
router.post('/forum/:forumId/send', isAuthenticated, chatController.sendChat);
router.post('/edit/:chatId', isAuthenticated, chatController.editChat);
router.post('/delete/:chatId', isAuthenticated, chatController.deleteChat);
router.post('/forum/:forumId/mark-read', isAuthenticated, chatController.markAsRead);

module.exports = router;
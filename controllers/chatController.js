// controllers/chatController.js
const Chat = require('../models/Chat');
const Forum = require('../models/Forum');
const User = require('../models/User');
const ForumRead = require('../models/ForumRead');
const { Op } = require('sequelize');

exports.getForumChat = async (req, res) => {
  try {
    const forum = await Forum.findByPk(req.params.forumId, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'nickname']
      }]
    });

    if (!forum) {
      return res.status(404).send('Forum tidak ditemukan');
    }

    // Pagination for message history
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { count, rows: chats } = await Chat.findAndCountAll({
      where: { forum_id: req.params.forumId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nickname', 'role', 'nametag_color', 'profile_picture', 'is_online']
        },
        {
          model: Chat,
          as: 'replies',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'nickname', 'role', 'nametag_color', 'profile_picture', 'is_online']
          }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: limit,
      offset: offset
    });

    // Reverse to show oldest first
    chats.reverse();

    // Organize chats into hierarchy
    const chatMap = {};
    const rootChats = [];

    chats.forEach(chat => {
      chatMap[chat.id] = chat;
      if (!chat.parent_chat_id) {
        rootChats.push(chat);
      }
    });

    const hasMore = offset + chats.length < count;

    res.render('chat/forum', {
      forum,
      chats: rootChats,
      chatMap,
      userId: req.session.userId,
      role: req.session.role,
      theme: req.session.theme || 'light',
      searchQuery: req.query.search || '',
      hasMore,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalMessages: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

// Sisanya tetap sama...
exports.sendChat = async (req, res) => {
  try {
    const { message, parent_chat_id } = req.body;
    
    if (!message || message.trim() === '') {
      return res.redirect(`/chat/forum/${req.params.forumId}`);
    }

    await Chat.create({
      forum_id: req.params.forumId,
      user_id: req.session.userId,
      message: message.trim(),
      parent_chat_id: parent_chat_id || null
    });

    res.redirect(`/chat/forum/${req.params.forumId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

exports.editChat = async (req, res) => {
  try {
    const { message } = req.body;
    const chat = await Chat.findByPk(req.params.chatId);
    
    if (!chat) {
      return res.status(404).send('Chat tidak ditemukan');
    }

    if (chat.user_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).send('Tidak memiliki izin');
    }

    if (!message || message.trim() === '') {
      return res.redirect(`/chat/forum/${chat.forum_id}`);
    }

    chat.message = message.trim();
    chat.updated_at = new Date();
    await chat.save();

    res.redirect(`/chat/forum/${chat.forum_id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

exports.deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findByPk(req.params.chatId);

    if (!chat) {
      return res.status(404).send('Chat tidak ditemukan');
    }

    // Check if user is the message creator, forum creator, or admin
    const forum = await Forum.findByPk(chat.forum_id);
    
    if (
      chat.user_id !== req.session.userId && 
      forum.creator_id !== req.session.userId && 
      req.session.role !== 'admin'
    ) {
      return res.status(403).send('Tidak memiliki izin');
    }

    await chat.destroy();
    res.redirect(`/chat/forum/${chat.forum_id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const forumId = req.params.forumId;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).send('Unauthorized');
    }

    // Update or create forum read record
    const [forumRead, created] = await ForumRead.findOrCreate({
      where: {
        user_id: userId,
        forum_id: forumId
      },
      defaults: {
        user_id: userId,
        forum_id: forumId,
        last_read_at: new Date()
      }
    });

    // If record exists, update it
    if (!created) {
      forumRead.last_read_at = new Date();
      await forumRead.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// API: Load more messages (for pagination/infinite scroll)
exports.loadMoreMessages = async (req, res) => {
  try {
    const forumId = req.params.forumId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { count, rows: chats } = await Chat.findAndCountAll({
      where: { forum_id: forumId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nickname', 'role', 'nametag_color', 'profile_picture', 'is_online']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: limit,
      offset: offset
    });

    // Reverse to show oldest first
    chats.reverse();

    const hasMore = offset + chats.length < count;

    res.json({
      success: true,
      messages: chats,
      hasMore,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalMessages: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
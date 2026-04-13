// controllers/forumController.js
const Forum = require('../models/Forum');
const User = require('../models/User');
const Chat = require('../models/Chat');
const ForumRead = require('../models/ForumRead');
const { Op } = require('sequelize');

exports.getForums = async (req, res) => {
  try {
    const forums = await Forum.findAll({
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'nickname']
      }],
      order: [['created_at', 'DESC']]
    });

    // Get unread counts for each forum
    const forumsWithUnread = await Promise.all(forums.map(async (forum) => {
      const forumData = forum.toJSON();

      if (!req.session.userId) {
        forumData.unreadCount = 0;
        return forumData;
      }

      // Get last read time for this user and forum
      const forumRead = await ForumRead.findOne({
        where: {
          user_id: req.session.userId,
          forum_id: forum.id
        }
      });

      const lastReadAt = forumRead ? forumRead.last_read_at : forum.created_at;

      // Count unread messages (messages after last read time)
      const unreadCount = await Chat.count({
        where: {
          forum_id: forum.id,
          created_at: {
            [Op.gt]: lastReadAt
          }
        }
      });

      // Cap at 99+ for display
      forumData.unreadCount = unreadCount;
      forumData.displayUnread = unreadCount > 99 ? '99+' : unreadCount;
      forumData.hasUnread = unreadCount > 0;

      return forumData;
    }));

    res.render('forums/index', {
      forums: forumsWithUnread,
      userId: req.session.userId,
      role: req.session.role,
      theme: req.session.theme || 'light'
    });
  } catch (error) {
    console.error('Error in getForums:', error);
    res.status(500).render('error', {
      message: 'Failed to load forums',
      error: error
    });
  }
};

exports.createForum = async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title || title.trim() === '') {
      return res.redirect('/forums');
    }

    await Forum.create({
      title: title.trim(),
      creator_id: req.session.userId
    });
    
    res.redirect('/forums');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

exports.deleteForum = async (req, res) => {
  try {
    const forum = await Forum.findByPk(req.params.id);
    
    if (!forum) {
      return res.status(404).send('Forum tidak ditemukan');
    }

    if (forum.creator_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).send('Tidak memiliki izin');
    }

    await forum.destroy();
    res.redirect('/forums');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};
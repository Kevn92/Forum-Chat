const User = require('../models/User');
const Forum = require('../models/Forum');
const Chat = require('../models/Chat');
const ForumRead = require('../models/ForumRead');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

exports.getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    
    const whereClause = {};
    if (search && search.trim()) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${search.trim()}%` } },
        { nickname: { [Op.like]: `%${search.trim()}%` } },
        { phone: { [Op.like]: `%${search.trim()}%` } }
      ];
    }

    const users = await User.findAll({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['password'] }
    });

    // Get stats for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const userData = user.toJSON();

      // Count forums created
      userData.forumCount = await Forum.count({
        where: { creator_id: user.id }
      });

      // Count messages sent
      userData.messageCount = await Chat.count({
        where: { user_id: user.id }
      });

      return userData;
    }));

    // If searching, sort to bring exact/partial matches to top
    let sortedUsers = usersWithStats;
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      
      sortedUsers = usersWithStats.sort((a, b) => {
        // Score each user based on match quality
        const getMatchScore = (user) => {
          let score = 0;
          
          // Exact match gets highest score
          if (user.username?.toLowerCase() === searchLower) score += 100;
          if (user.nickname?.toLowerCase() === searchLower) score += 100;
          if (user.phone === search) score += 100;
          
          // Starts with search term gets medium score
          if (user.username?.toLowerCase().startsWith(searchLower)) score += 50;
          if (user.nickname?.toLowerCase().startsWith(searchLower)) score += 50;
          if (user.phone?.startsWith(search)) score += 50;
          
          // Contains search term gets low score
          if (user.username?.toLowerCase().includes(searchLower)) score += 10;
          if (user.nickname?.toLowerCase().includes(searchLower)) score += 10;
          if (user.phone?.includes(search)) score += 10;
          
          return score;
        };
        
        const scoreA = getMatchScore(a);
        const scoreB = getMatchScore(b);
        
        // Sort by score (highest first)
        return scoreB - scoreA;
      });
    }

    res.render('admin/users', {
      users: sortedUsers,
      userId: req.session.userId,
      role: req.session.role,
      theme: req.session.theme || 'light',
      success: req.flash('success'),
      error: req.flash('error'),
      search: search || ''
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const targetUser = await User.findByPk(req.params.userId);
    
    if (!targetUser) {
      req.flash('error', 'User tidak ditemukan');
      return res.redirect('/admin/users');
    }

    // Prevent admin from deleting themselves
    if (targetUser.id === req.session.userId) {
      req.flash('error', 'Tidak dapat menghapus akun sendiri');
      return res.redirect('/admin/users');
    }

    const userId = targetUser.id;

    // Delete all forum reads by this user
    await ForumRead.destroy({
      where: { user_id: userId }
    });

    // Delete all chats by this user
    await Chat.destroy({
      where: { user_id: userId }
    });

    // Delete forums created by this user
    const forums = await Forum.findAll({
      where: { creator_id: userId }
    });

    for (const forum of forums) {
      // Delete all chats in the forum
      await Chat.destroy({
        where: { forum_id: forum.id }
      });
      // Delete the forum
      await forum.destroy();
    }

    // Delete profile picture if it's custom
    if (targetUser.profile_picture && !targetUser.profile_picture.includes('default') && !targetUser.profile_picture.includes('admin')) {
      const picPath = path.join(__dirname, '../public', targetUser.profile_picture);
      if (fs.existsSync(picPath)) {
        fs.unlinkSync(picPath);
      }
    }

    // Delete the user
    await targetUser.destroy();

    req.flash('success', `User ${targetUser.username} berhasil dihapus`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Gagal menghapus user');
    res.redirect('/admin/users');
  }
};

exports.deleteForum = async (req, res) => {
  try {
    const forum = await Forum.findByPk(req.params.forumId);
    
    if (!forum) {
      req.flash('error', 'Forum tidak ditemukan');
      return res.redirect('/admin/users');
    }

    // Delete all chats in the forum
    await Chat.destroy({
      where: { forum_id: forum.id }
    });

    // Delete all forum reads for this forum
    await ForumRead.destroy({
      where: { forum_id: forum.id }
    });

    await forum.destroy();

    req.flash('success', `Forum "${forum.title}" berhasil dihapus`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Gagal menghapus forum');
    res.redirect('/admin/users');
  }
};

const User = require('../models/User');
const Forum = require('../models/Forum');
const Chat = require('../models/Chat');
const ForumRead = require('../models/ForumRead');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

exports.getSettings = async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    res.render('profile/settings', {
      user,
      theme: req.session.theme || 'light',
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    const { nickname, nametag_color, theme, phone } = req.body;

    // Handle profile picture upload
    if (req.file && user.role !== 'admin') {
      // Delete old profile picture if it's not a default one
      if (user.profile_picture && !user.profile_picture.includes('default') && !user.profile_picture.includes('admin')) {
        const oldPath = path.join(__dirname, '../public', user.profile_picture);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Save new profile picture path
      user.profile_picture = `/uploads/${req.file.filename}`;
    }

    // Update fields berdasarkan role
    if (user.role !== 'admin') {
      if (nickname && nickname.trim() !== '') {
        user.nickname = nickname.trim();
      }
      if (nametag_color) {
        user.nametag_color = nametag_color;
      }
    }

    if (theme) {
      user.theme = theme;
      req.session.theme = theme;
    }

    if (phone && phone.trim() !== '') {
      user.phone = phone.trim();
    }

    // Handle password update
    const { old_password, new_password } = req.body;
    if (old_password && new_password) {
      const isMatch = await bcrypt.compare(old_password, user.password);
      if (!isMatch) {
        req.flash('error', 'Old password is incorrect');
        return res.redirect('/profile/settings');
      }

      if (new_password.length < 6) {
        req.flash('error', 'New password must be at least 6 characters');
        return res.redirect('/profile/settings');
      }

      user.password = await bcrypt.hash(new_password, 10);
    }

    await user.save();
    req.flash('success', 'Profile updated successfully');
    res.redirect('/profile/settings');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);
    
    if (!user) {
      return res.status(404).send('User tidak ditemukan');
    }

    // Verify password
    const { password } = req.body;
    if (!password) {
      req.flash('error', 'Password diperlukan');
      return res.redirect('/profile/settings');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash('error', 'Password salah');
      return res.redirect('/profile/settings');
    }

    const userId = user.id;

    // Delete all forum reads by this user
    await ForumRead.destroy({
      where: { user_id: userId }
    });

    // Delete all chats by this user
    await Chat.destroy({
      where: { user_id: userId }
    });

    // Transfer forum ownership to NULL or delete forums
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
    if (user.profile_picture && !user.profile_picture.includes('default') && !user.profile_picture.includes('admin')) {
      const picPath = path.join(__dirname, '../public', user.profile_picture);
      if (fs.existsSync(picPath)) {
        fs.unlinkSync(picPath);
      }
    }

    // Delete the user
    await user.destroy();

    // Clear session and redirect to login
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      res.redirect('/auth/login');
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};
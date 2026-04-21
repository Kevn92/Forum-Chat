// controllers/chatController.js
const Chat = require('../models/Chat');
const Forum = require('../models/Forum');
const User = require('../models/User');
const ForumRead = require('../models/ForumRead');
const Poll = require('../models/Poll');
const PollVote = require('../models/PollVote');
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

    // Get active polls for this forum - PASS RAW POLLS
    let polls = [];
    try {
      const forumIdInt = parseInt(req.params.forumId);
      console.log(`\n📊 Loading polls for forum: ${forumIdInt}`);
      
      const rawPolls = await Poll.findAll({
        where: {
          forum_id: forumIdInt,
          is_active: 1
        },
        order: [['created_at', 'DESC']]
      });
      
      console.log(`✅ Found ${rawPolls.length} polls`);
      if (rawPolls.length > 0) {
        console.log('Poll IDs:', rawPolls.map(p => p.id));
      }

      // Convert to plain objects with minimal enrichment
      polls = rawPolls.map(p => {
        const poll = p.toJSON();
        
        // Parse options if it's a string
        let opts = poll.options;
        if (typeof opts === 'string') {
          try {
            opts = JSON.parse(opts);
          } catch (e) {
            opts = [];
          }
        }
        
        // Ensure opts is array and each option has proper structure
        if (!Array.isArray(opts)) opts = [];
        opts = opts.map(opt => ({
          id: opt.id || 0,
          text: opt.text || '',
          votes: (typeof opt.votes === 'number') ? opt.votes : 
                 (Array.isArray(opt.votes) && typeof opt.votes[0] === 'number') ? opt.votes[0] : 0
        }));
        
        poll.options = opts;
        poll.creator = { id: poll.creator_id, nickname: 'User' };
        poll.userVote = null;
        poll.totalVotes = opts.reduce((sum, opt) => sum + opt.votes, 0);
        return poll;
      });

      console.log(`✅ Ready to pass ${polls.length} polls to view`);
    } catch (pollError) {
      console.error('❌ Error loading polls:', pollError.message);
      polls = [];
    }

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
      totalMessages: count,
      polls: polls
    });
  } catch (error) {
    console.error('\n❌ GET FORUM CHAT ERROR');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('\n');
    res.status(500).send('Server error: ' + error.message);
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

    // Check if user is the message creator or forum creator
    const forum = await Forum.findByPk(chat.forum_id);
    
    if (
      chat.user_id !== req.session.userId && 
      forum.creator_id !== req.session.userId
    ) {
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

    // Check if user is the message creator or forum creator
    const forum = await Forum.findByPk(chat.forum_id);
    
    if (
      chat.user_id !== req.session.userId && 
      forum.creator_id !== req.session.userId
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

// Create poll
exports.createPoll = async (req, res) => {
  try {
    console.log('\n=== CREATE POLL REQUEST ===');
    console.log('Full body:', JSON.stringify(req.body, null, 2));
    console.log('Session userId:', req.session?.userId);
    console.log('Forum ID:', req.params.forumId);
    
    const { question, options } = req.body;
    const forumId = req.params.forumId;
    const userId = req.session?.userId;

    if (!userId) {
      console.log('❌ Not authenticated');
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      console.log('❌ Invalid question:', question);
      return res.status(400).json({ success: false, error: 'Question is required' });
    }

    if (!Array.isArray(options) || options.length < 2) {
      console.log('❌ Invalid options:', options);
      return res.status(400).json({ success: false, error: 'At least 2 options required' });
    }

    // Build poll data
    const pollOptionsData = options.map((opt, idx) => ({
      id: idx + 1,
      text: String(opt).trim(),
      votes: 0  // Always start with 0 votes as NUMBER
    }));

    const pollData = {
      forum_id: parseInt(forumId),
      creator_id: userId,
      question: question.trim(),
      options: pollOptionsData,
      is_active: 1  // Explicitly set to 1 (MySQL boolean)
    };

    console.log('\n📝 Creating poll with data:', JSON.stringify(pollData, null, 2));

    // Create poll
    const poll = await Poll.create(pollData);
    console.log('✅ Poll created in DB, ID:', poll.id);

    // Fetch with creator info
    const pollWithCreator = await Poll.findByPk(poll.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'nickname']
      }]
    });

    if (!pollWithCreator) {
      console.log('❌ Failed to fetch poll after creation');
      return res.status(500).json({ success: false, error: 'Failed to fetch created poll' });
    }

    const pollJSON = pollWithCreator.toJSON();
    pollJSON.creator_id = pollData.creator_id;

    console.log('✅ Poll ready to return\n');

    return res.json({
      success: true,
      poll: {
        ...pollJSON,
        userVote: null,
        totalVotes: 0
      }
    });
  } catch (error) {
    console.error('\n❌ CREATE POLL ERROR');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Full error object:', error);
    console.error('\n');
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Unknown error'
    });
  }
};

// Vote on poll
exports.votePoll = async (req, res) => {
  try {
    const { pollId, optionId } = req.body;
    const userId = req.session.userId;

    console.log('\n=== VOTE POLL DEBUG ===');
    console.log('Request:', { pollId, optionId, userId });

    const poll = await Poll.findByPk(pollId);

    if (!poll) {
      return res.status(404).json({ success: false, error: 'Poll not found' });
    }

    if (!poll.is_active) {
      return res.status(400).json({ success: false, error: 'Poll is no longer active' });
    }

    // Parse options if it's a string
    let options = poll.options;
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options);
      } catch (e) {
        console.error('Failed to parse poll options:', e);
        return res.status(500).json({ success: false, error: 'Invalid poll options' });
      }
    }

    console.log('Poll options:', JSON.stringify(options, null, 2));

    const option = options.find(opt => opt.id === parseInt(optionId));
    if (!option) {
      return res.status(400).json({ success: false, error: 'Invalid option' });
    }

    // Check if user already voted
    const existingVote = await PollVote.findOne({
      where: { poll_id: pollId, user_id: userId }
    });

    if (existingVote) {
      return res.status(400).json({ success: false, error: 'You have already voted' });
    }

    // Create vote
    await PollVote.create({
      poll_id: pollId,
      user_id: userId,
      option_id: parseInt(optionId)
    });

    // Update vote count
    const updatedOptions = options.map(opt => {
      if (opt.id === parseInt(optionId)) {
        return { ...opt, votes: (opt.votes || 0) + 1 };
      }
      return opt;
    });

    console.log('Updated options:', JSON.stringify(updatedOptions, null, 2));

    await poll.update({ options: updatedOptions });

    // Get updated poll with creator info
    const updatedPoll = await Poll.findByPk(pollId);
    let updatedPollOptions = updatedPoll.options;
    if (typeof updatedPollOptions === 'string') {
      updatedPollOptions = JSON.parse(updatedPollOptions);
    }

    const totalVotes = updatedPollOptions.reduce((sum, opt) => sum + (opt.votes || 0), 0);

    console.log('✅ Vote recorded successfully');

    res.json({
      success: true,
      poll: {
        id: poll.id,
        options: updatedPollOptions,
        totalVotes,
        userVote: parseInt(optionId),
        creator: { id: poll.creator_id, nickname: 'User' }
      }
    });
  } catch (error) {
    console.error('❌ Error voting poll:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ success: false, error: error.message || 'Failed to vote' });
  }
};

// Close poll (admin or creator only)
exports.closePoll = async (req, res) => {
  try {
    const pollId = req.params.pollId;
    const userId = req.session.userId;

    const poll = await Poll.findByPk(pollId);

    if (!poll) {
      return res.status(404).json({ success: false, error: 'Poll not found' });
    }

    const forum = await Forum.findByPk(poll.forum_id);

    if (poll.creator_id !== userId && forum.creator_id !== userId && req.session.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to close this poll' });
    }

    await poll.update({ is_active: false });

    res.json({ success: true });
  } catch (error) {
    console.error('Error closing poll:', error);
    res.status(500).json({ success: false, error: 'Failed to close poll' });
  }
};
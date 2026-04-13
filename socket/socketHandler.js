// socket/socketHandler.js
const User = require('../models/User');
const Chat = require('../models/Chat');

// Store online users: { userId: { socketId, nickname, username } }
const onlineUsers = new Map();

// Store typing status: { forumId_userId: timeout }
const typingStatus = new Map();

function initializeSocket(io) {
  // Middleware untuk autentikasi socket
  io.use(async (socket, next) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) {
      return next(new Error('Unauthorized'));
    }
    socket.userId = parseInt(userId);
    next();
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.id})`);

    // Fetch user info and store in onlineUsers
    try {
      const user = await User.findByPk(socket.userId, {
        attributes: ['id', 'nickname', 'username']
      });
      
      if (user) {
        onlineUsers.set(socket.userId, {
          socketId: socket.id,
          nickname: user.nickname || user.username,
          username: user.username
        });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      onlineUsers.set(socket.userId, {
        socketId: socket.id,
        nickname: `User ${socket.userId}`,
        username: null
      });
    }
    
    // Update user status in database (optional)
    try {
      await User.update({ is_online: true }, { where: { id: socket.userId } });
    } catch (error) {
      console.error('Error updating online status:', error);
    }

    // Broadcast updated online users list
    broadcastOnlineUsers(io);

    // Join forum room
    socket.on('join-forum', async (forumId) => {
      socket.join(`forum-${forumId}`);
      console.log(`User ${socket.userId} joined forum-${forumId}`);

      // Mark messages as read when user joins
      await markMessagesAsRead(io, forumId, socket.userId);
    });

    // Leave forum room
    socket.on('leave-forum', (forumId) => {
      socket.leave(`forum-${forumId}`);
      console.log(`User ${socket.userId} left forum-${forumId}`);
    });

    // Handle chat message
    socket.on('send-message', async (data) => {
      try {
        const { forumId, message, parentChatId } = data;

        if (!message || message.trim() === '') return;

        // Save to database
        const chat = await Chat.create({
          forum_id: forumId,
          user_id: socket.userId,
          message: message.trim(),
          parent_chat_id: parentChatId || null,
          read_by: [socket.userId] // Mark as read by sender
        });

        // Get user info for broadcasting
        const user = await User.findByPk(socket.userId, {
          attributes: ['id', 'nickname', 'role', 'nametag_color', 'profile_picture']
        });

        // Broadcast to others in the same forum
        socket.to(`forum-${forumId}`).emit('new-message', {
          id: chat.id,
          user_id: chat.user_id,
          message: chat.message,
          parent_chat_id: chat.parent_chat_id,
          created_at: chat.created_at,
          user: user.toJSON(),
          read_by: chat.read_by
        });

        // Send confirmation to sender
        socket.emit('message-sent', {
          id: chat.id,
          user_id: chat.user_id,
          message: chat.message,
          parent_chat_id: chat.parent_chat_id,
          created_at: chat.created_at,
          user: user.toJSON(),
          read_by: chat.read_by
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message-error', { error: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { forumId, isTyping } = data;
      const typingKey = `${forumId}_${socket.userId}`;

      if (isTyping) {
        // Set timeout to clear typing status after 3 seconds
        const timeout = setTimeout(() => {
          typingStatus.delete(typingKey);
          socket.to(`forum-${forumId}`).emit('user-typing', {
            userId: socket.userId,
            forumId,
            isTyping: false
          });
        }, 3000);

        typingStatus.set(typingKey, timeout);
        
        socket.to(`forum-${forumId}`).emit('user-typing', {
          userId: socket.userId,
          forumId,
          isTyping: true
        });
      } else {
        // Clear typing indicator
        if (typingStatus.has(typingKey)) {
          clearTimeout(typingStatus.get(typingKey));
          typingStatus.delete(typingKey);
        }

        socket.to(`forum-${forumId}`).emit('user-typing', {
          userId: socket.userId,
          forumId,
          isTyping: false
        });
      }
    });

    // Handle message read receipt
    socket.on('mark-read', async (data) => {
      const { forumId, messageIds } = data;
      
      try {
        // Update read_by field for messages
        const messages = await Chat.findAll({
          where: { id: messageIds }
        });

        for (const msg of messages) {
          const readBy = msg.read_by || [];
          if (!readBy.includes(socket.userId)) {
            readBy.push(socket.userId);
            await msg.update({ read_by: readBy });
          }
        }

        // Notify others that user has read messages
        socket.to(`forum-${forumId}`).emit('messages-read', {
          userId: socket.userId,
          messageIds
        });

      } catch (error) {
        console.error('Error marking as read:', error);
      }
    });

    // Handle edit message
    socket.on('edit-message', async (data) => {
      try {
        const { forumId, messageId, message } = data;

        const chat = await Chat.findByPk(messageId);
        if (!chat || chat.user_id !== socket.userId) {
          return socket.emit('message-error', { error: 'Cannot edit this message' });
        }

        await chat.update({ 
          message: message.trim(),
          updated_at: new Date()
        });

        socket.to(`forum-${forumId}`).emit('message-edited', {
          messageId: chat.id,
          message: chat.message,
          updated_at: chat.updated_at
        });

      } catch (error) {
        console.error('Error editing message:', error);
        socket.emit('message-error', { error: 'Failed to edit message' });
      }
    });

    // Handle delete message
    socket.on('delete-message', async (data) => {
      try {
        const { forumId, messageId } = data;

        const chat = await Chat.findByPk(messageId);
        if (!chat || chat.user_id !== socket.userId) {
          return socket.emit('message-error', { error: 'Cannot delete this message' });
        }

        await chat.destroy();

        socket.to(`forum-${forumId}`).emit('message-deleted', {
          messageId: chat.id
        });

      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('message-error', { error: 'Failed to delete message' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId} (${socket.id})`);
      
      const userInfo = onlineUsers.get(socket.userId);
      onlineUsers.delete(socket.userId);

      // Clear all typing timeouts
      for (const [key, timeout] of typingStatus.entries()) {
        if (key.endsWith(`_${socket.userId}`)) {
          clearTimeout(timeout);
          typingStatus.delete(key);
        }
      }

      // Update user status in database
      try {
        await User.update({ is_online: false }, { where: { id: socket.userId } });
      } catch (error) {
        console.error('Error updating offline status:', error);
      }

      broadcastOnlineUsers(io);
    });
  });
}

// Helper: Broadcast online users list
function broadcastOnlineUsers(io) {
  const onlineUsersList = Array.from(onlineUsers.values()).map(userInfo => ({
    nickname: userInfo.nickname
  }));
  
  io.emit('online-users', onlineUsersList);
}

// Helper: Mark messages as read when user joins forum
async function markMessagesAsRead(io, forumId, userId) {
  try {
    const messages = await Chat.findAll({
      where: { forum_id: forumId }
    });

    const unreadMessageIds = [];
    
    for (const msg of messages) {
      const readBy = msg.read_by || [];
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        await msg.update({ read_by: readBy });
        unreadMessageIds.push(msg.id);
      }
    }

    if (unreadMessageIds.length > 0) {
      io.to(`forum-${forumId}`).emit('messages-read', {
        userId,
        messageIds: unreadMessageIds
      });
    }
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

// Helper: Check if user is online
function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

// Helper: Get all online users
function getOnlineUsers() {
  return Array.from(onlineUsers.values()).map(userInfo => ({
    nickname: userInfo.nickname
  }));
}

module.exports = {
  initializeSocket,
  isUserOnline,
  getOnlineUsers
};

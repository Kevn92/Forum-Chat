// server.js (bagian model relationships yang benar)
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const sequelize = require('./config/database');
const { initializeSocket } = require('./socket/socketHandler');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Forum = require('./models/Forum');
const Chat = require('./models/Chat');
const ForumRead = require('./models/ForumRead');

// ========== Model Relationships ==========
// User - Forum relationships
User.hasMany(Forum, { foreignKey: 'creator_id', as: 'forums' });
Forum.belongsTo(User, { foreignKey: 'creator_id', as: 'creator' });

// User - Chat relationships
User.hasMany(Chat, { foreignKey: 'user_id', as: 'chats' });
Chat.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Forum - Chat relationships
Forum.hasMany(Chat, { foreignKey: 'forum_id', as: 'chats' });
Chat.belongsTo(Forum, { foreignKey: 'forum_id', as: 'forum' });

// Self-reference for replies (Chat - Chat)
Chat.belongsTo(Chat, { foreignKey: 'parent_chat_id', as: 'parent' });
Chat.hasMany(Chat, { foreignKey: 'parent_chat_id', as: 'replies' });
// ========================================

// Import routes
const authRoutes = require('./routes/authRoutes');
const forumRoutes = require('./routes/forumRoutes');
const chatRoutes = require('./routes/chatRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

// Flash messages
app.use(flash());

// Multer configuration for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + req.session.userId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Make user data available to all views
app.use(async (req, res, next) => {
  res.locals.currentUser = null;
  res.locals.userId = req.session?.userId;
  res.locals.role = req.session?.role;
  res.locals.theme = req.session?.theme || 'light';

  if (req.session?.userId) {
    try {
      const user = await User.findByPk(req.session.userId, {
        attributes: ['id', 'username', 'nickname', 'role', 'theme', 'is_online']
      });
      res.locals.currentUser = user;
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }

  next();
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/auth', authRoutes);
app.use('/forums', forumRoutes);
app.use('/chat', chatRoutes);
app.use('/profile', (req, res, next) => {
  // Add multer upload to req for profile routes
  req.upload = upload;
  next();
}, profileRoutes);
app.use('/admin', adminRoutes);

// Home route
app.get('/', (req, res) => {
  if (req.session?.userId) {
    res.redirect('/forums');
  } else {
    res.redirect('/auth/login');
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    message: 'Page not found',
    error: {},
    theme: req.session?.theme || 'light'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {},
    theme: req.session?.theme || 'light'
  });
});

// Database connection and server start
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize socket handler
initializeSocket(io);

// Make io available to routes
app.set('io', io);

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Sync database
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced');

    // Ensure all passwords are hashed (for plaintext legacy values)
    const users = await User.findAll();
    for (const user of users) {
      const rawPass = user.password;
      if (rawPass && !rawPass.startsWith('$2a$') && !rawPass.startsWith('$2b$') && !rawPass.startsWith('$2y$')) {
        const hashed = await bcrypt.hash(rawPass, 10);
        user.password = hashed;
        await user.save();
        console.log(`🔒 Hashed password for user ${user.username}`);
      }
    }

    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📝 Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔌 WebSocket server initialized`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
}

startServer();

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  sequelize.close().then(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});
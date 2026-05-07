const User = require('../models/User');
const AuthLog = require('../models/AuthLog');

exports.getRegister = (req, res) => {
  res.render('auth/register', { 
    error: null,
    theme: req.session.theme || 'light'
  });
};

exports.postRegister = async (req, res) => {
  try {
    const { username, password, phone } = req.body;
    
    // Validasi input
    if (!username || !password || !phone) {
      return res.render('auth/register', { 
        error: 'Semua field harus diisi',
        theme: req.session.theme || 'light'
      });
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.render('auth/register', { 
        error: 'Username sudah digunakan',
        theme: req.session.theme || 'light'
      });
    }

    await User.create({
      username,
      password,
      phone,
      nickname: username // Default nickname sama dengan username
    });

    await AuthLog.create({
      username,
      activity: 'REGISTER_SUCCESS',
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.redirect('/auth/login?alert=register_success');
  } catch (error) {
    console.error(error);
    res.render('auth/register', { 
      error: 'Registrasi gagal',
      theme: req.session.theme || 'light'
    });
  }
};

exports.getLogin = (req, res) => {
  res.render('auth/login', { 
    error: null,
    theme: req.session.theme || 'light'
  });
};

exports.postLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ where: { username } });
    if (!user) {
      await AuthLog.create({ username, activity: 'LOGIN_FAILED', ip_address: req.ip, user_agent: req.get('User-Agent') });
      return res.redirect('/auth/login?alert=login_failed');
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      await AuthLog.create({ username, activity: 'LOGIN_FAILED', ip_address: req.ip, user_agent: req.get('User-Agent') });
      return res.redirect('/auth/login?alert=login_failed');
    }

    // Set session
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.theme = user.theme;
    
    await AuthLog.create({ username, activity: 'LOGIN_SUCCESS', ip_address: req.ip, user_agent: req.get('User-Agent') });
    res.redirect('/forums?alert=login_success');
  } catch (error) {
    console.error(error);
    res.render('auth/login', { 
      error: 'Login gagal',
      theme: req.session.theme || 'light'
    });
  }
};

exports.logout = async (req, res) => {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findByPk(req.session.userId);
      if (user) {
        await AuthLog.create({
          username: user.username,
          activity: 'LOGOUT',
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/auth/login?alert=logout_success');
  });
};
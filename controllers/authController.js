const User = require('../models/User');

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

    res.redirect('/auth/login');
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
      return res.render('auth/login', { 
        error: 'Username tidak ditemukan',
        theme: req.session.theme || 'light'
      });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.render('auth/login', { 
        error: 'Password salah',
        theme: req.session.theme || 'light'
      });
    }

    // Set session
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.theme = user.theme;
    
    res.redirect('/forums');
  } catch (error) {
    console.error(error);
    res.render('auth/login', { 
      error: 'Login gagal',
      theme: req.session.theme || 'light'
    });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/auth/login');
  });
};
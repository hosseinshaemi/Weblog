const passport = require('passport');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { sendEmail } = require('../utils/mailer');
const { reach } = require('yup');

exports.login = (req, res) => {
  res.render('login', {
    pageTitle: 'ورود به بخش مدیریت',
    path: '/login',
    message: req.flash('success_msg'),
    error: req.flash('error'),
  });
};

exports.handleLogin = async (req, res, next) => {
  if (!req.body['g-recaptcha-response']) {
    req.flash('error', 'اعتبار سنجی captcha الزامی می باشد');
    return res.redirect('/users/login');
  }

  const secretKey = process.env.CAPTCHA_SECRET;
  const verifyUrl = `https://google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body['g-recaptcha-response']}
    &remoteip=${req.connection.remoteAddress}`;

  const response = await fetch(verifyUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
  });

  const json = await response.json();

  if (json.success) {
    passport.authenticate('local', {
      failureRedirect: '/users/login',
      failureFlash: true,
    })(req, res, next);
  } else {
    req.flash('error', 'مشکلی در اعتبارسنجی captcha هست');
    res.redirect('/users/login');
  }
};

exports.rememberMe = (req, res) => {
  if (req.body.remember) {
    req.session.cookie.originalMaxAge = 24 * 60 * 60 * 1000;
  } else {
    req.session.cookie.expire = null;
  }

  res.redirect('/dashboard');
};

exports.logout = (req, res) => {
  req.session = null;
  req.logout();
  // req.flash("success_msg", "خروج موفقیت آمیز بود");
  res.redirect('/users/login');
};

exports.register = (req, res) => {
  res.render('register', {
    pageTitle: 'ثبت نام کاربر جدید',
    path: '/register',
  });
};

exports.createUser = async (req, res) => {
  const errors = [];
  try {
    await User.userValidation(req.body);
    const { fullname, email, password } = req.body;

    const user = await User.findOne({ email });
    if (user) {
      errors.push({ message: 'کاربری با این ایمیل موجود است' });
      return res.render('register', {
        pageTitle: 'ثبت نام کاربر',
        path: '/register',
        errors,
      });
    }

    await User.create({ fullname, email, password });

    sendEmail(
      email,
      fullname,
      'خوش آمدی به وبلاگ حسین',
      'خیلی خوشحالیم که در جمع ما هستی'
    );

    req.flash('success_msg', 'ثبت نام موفقیت آمیز بود.');
    res.redirect('/users/login');
  } catch (err) {
    console.log(err);
    err.inner.forEach((e) => {
      errors.push({
        name: e.path,
        message: e.message,
      });
    });

    return res.render('register', {
      pageTitle: 'ثبت نام کاربر',
      path: '/register',
      errors,
    });
  }
};

exports.forgetPassword = (req, res) => {
  res.render('forgetPass', {
    pageTitle: 'فراموشی رمز عبور',
    path: '/login',
    message: req.flash('success_msg'),
    error: req.flash('error'),
  });
};

exports.handleForgetPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    req.flash('error', 'کاربری با این ایمیل یافت نشد');
    return res.render('forgetPass', {
      pageTitle: 'فراموشی رمز عبور',
      path: '/login',
      message: req.flash('success_msg'),
      error: req.flash('error'),
    });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
  const resetLink = `http://localhost/users/reset-password/${token}`;
  sendEmail(
    user.email,
    user.fullname,
    'فراموشی رمز عبور',
    `
    جهت تغییر رمز عبور روی لینک زیر کلیک کنید
    <a href="${resetLink}" target="_blank">بازیابی رمز عبور</a>
    `
  );
  req.flash('success_msg', 'ایمیل حاوی لینک با موفقیت ارسال شد');
  res.render('forgetPass', {
    pageTitle: 'فراموشی رمز عبور',
    path: '/login',
    message: req.flash('success_msg'),
    error: req.flash('error'),
  });
};

exports.resetPassword = (req, res) => {
  const token = req.params.token;
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.log(err);
    if (!decodedToken) return res.redirect('/404');
  }

  res.render('resetPass', {
    pageTitle: 'تغییر رمز عبور',
    path: '/login',
    message: req.flash('success_msg'),
    error: req.flash('error'),
    userId: decodedToken.userId,
  });
};

exports.handleResetPassword = async (req, res) => {
  const { password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    req.flash('error', 'کلمه عبور با تکرار آن مطابقت ندارد');
    return res.render('resetPass', {
      pageTitle: 'تغییر رمز عبور',
      path: '/login',
      message: req.flash('success_msg'),
      error: req.flash('error'),
      userId: req.params.id,
    });
  }

  const user = await User.findOne({ _id: req.params.id });
  if (!user) return res.redirect('/404');
  user.password = password;
  await user.save();

  req.flash('success_msg', 'رمز عبور با موفقیت تغییر یافت');
  res.redirect('/users/login');
};

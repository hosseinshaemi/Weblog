const Yup = require('yup');

exports.schema = Yup.object().shape({
  fullname: Yup.string().required('نام و نام خانوادگی الزامی میباشد'),
  email: Yup.string()
    .email('آدرس ایمیل صحیح نیست')
    .required('آدرس ایمیل الزامی است'),
  message: Yup.string().required('پیام اصلی الزامی است'),
});

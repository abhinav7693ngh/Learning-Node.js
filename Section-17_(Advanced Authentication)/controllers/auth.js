const crypto = require('crypto');

const User = require('../models/user');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendGrid = require('nodemailer-sendgrid-transport');

const transporter = nodemailer.createTransport(sendGrid({
    auth : {
        api_key: 'secret'
    }
}));


exports.getLogin = (req, res, next) => {
    let message = req.flash('error');
    if(message.length > 0){
        message = message[0];
    }
    else{
        message = null;
    }
    res.render('auth/login.ejs',{
        path : '/login',
        pageTitle: 'Login',
        errorMessage : message
    });
};

exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message
    });
};

exports.postSignup = (req, res, next) => { 
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    User.findOne({email : email})
        .then(userDoc => {
            if(userDoc){
                req.flash('error','Email exist already, please pick a different one');
                return res.redirect('/signup');
            }
            return bcrypt.hash(password, 12)
                .then(hashedPassword => {
                    const user = new User({
                        email: email,
                        password: hashedPassword,
                        cart: { items: [] }
                    });
                    return user.save();
                }).then(result => {
                    res.redirect('/login');
                    return transporter.sendMail({
                        to : email,
                        from : '2016007@iiitdmj.ac.in',
                        subject : 'SignUp Succeeded',
                        html : '<h1>Successfully signed up</h1>'
                    })
                }).catch(err => {
                    console.log(err);
                });
        }).catch(err => {
            console.log(err);
        });;    
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    User.findOne({email : email})
        .then(user => {
            if(!user){
                req.flash('error', 'Invalid email or password');
                return res.redirect('/login');
            }
            bcrypt.compare(password, user.password).then(doMatch => {
                if(doMatch){
                    req.session.isLoggedIn = true;
                    req.session.user = user;
                    return req.session.save((err) => {
                        console.log(err);
                        res.redirect('/');
                    });
                }
                else{
                    req.flash('error', 'Invalid email or password');
                    return res.redirect('/login');
                }
            }).catch(err => {
                console.log(err);
                return res.redirect('/login');
            });
        })
        .catch(err => console.log(err));
};

exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        res.redirect('/');
    });
};

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/reset.ejs', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message
    });
};

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if(err){
            console.log(err);
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({email : req.body.email})
            .then(user => {
                if(!user){
                    req.flash('error','No Account with that email found');  
                    return res.redirect('/reset');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                user.save().then(()=>{
                    res.redirect('/');
                    transporter.sendMail({
                        to: req.body.email,
                        from: '2016007@iiitdmj.ac.in',
                        subject: 'Password Reset',
                        html: `
                        <p>You requested password reset</p>
                        <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to reset the password</p>
                    `
                    })
                }).catch(err => {
                    console.log(err);
                });
            })
            .catch(err => {
            console.log(err);
        })
    });
};


exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({resetToken : token, resetTokenExpiration : {$gt : Date.now()}})
        .then(user => {
            if(user){
                let message = req.flash('error');
                if (message.length > 0) {
                    message = message[0];
                }
                else {
                    message = null;
                }
                res.render('auth/new-password.ejs', {
                    path: '/new-password',
                    pageTitle: 'New Password',
                    errorMessage: message,
                    userId: user._id.toString(),
                    passwordToken: token
                });
            }
            else{
                req.flash('error', 'Link expired');
                return res.redirect('/login');
            }
        })
        .catch(err => {
            console.log(err);
        })
    
};


exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;
    User.findOne({
        resetToken : passwordToken,
        resetTokenExpiration : {$gt : Date.now()},
        _id : userId
    }).then(user => {
        resetUser = user;
        return bcrypt.hash(newPassword, 12);
    }).then(hashedPassword => {
        resetUser.password = hashedPassword;
        resetUser.resetToken = null;
        resetUser.resetTokenExpiration = undefined;
        return resetUser.save();
    }).then(result => {
        res.redirect('/login');
    })
    .catch(err => {
        console.log(err);
    })
};
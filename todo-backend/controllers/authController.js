const {check, validationResult} = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const jwt = require('jsonwebtoken');

exports.postRegister = [
    check('fullName')
        .isLength({min : 2})
        .withMessage('Full Name must be atleast 2 characters long')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Full Name must only contain alphabets'),

    check('email')
        .isEmail()
        .withMessage('Enter a valid email')
        .normalizeEmail()
        .custom(async (value) => {
            const existingUser = await User.findOne({email: value});
            if (existingUser) {
                throw new Error('Email already exists');
            }
            return true;
        }),

    check('password')
        .isLength({min: 8})
        .withMessage('Password must be atleast 8 characters long')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?/:{}|<>_~`]/)
        .withMessage('Password must contain at least one special character')
        .trim(),

    check('confirmPassword')
        .trim()
        .custom((value, {req}) => {
            if(value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    async (req, res, next) => {
        try {
            const {fullName, email, password} = req.body;
            const errors = validationResult(req);
            
            if(!errors.isEmpty()) {
                // Transform errors into a more usable format
                const errorMessages = {};
                errors.array().forEach(error => {
                    errorMessages[error.path] = error.msg;
                });
                
                return res.status(422).json({
                    message: "Validation failed",
                    errors: errorMessages,
                    success: false
                });
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            const user = new User({fullName, email, password: hashedPassword});
            await user.save();
            
            res.status(201).json({
                message: "User registered successfully",
                success: true,
                redirect: '/login'
            });
            
        } catch (err) {
            console.error('Registration error:', err);
            
            // Handle duplicate email error from MongoDB
            if (err.code === 11000) {
                return res.status(422).json({
                    message: "Email already exists",
                    errors: { email: "This email is already registered" },
                    success: false
                });
            }
            
            return res.status(500).json({
                message: "Internal server error",
                errors: { general: "Something went wrong. Please try again." },
                success: false
            });
        }
    }
];

exports.postLogin = async (req, res, next) => {
    try {
        const {email, password} = req.body;
        const user = await User.findOne({email});
        if(!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                errors: { password: 'Invalid email or password' }
            });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                errors: { password: 'Invalid email or password' }
            });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {expiresIn: '24h'}
        );

        req.session.user = {
            id: user._id,
            email: user.email,
            fullName: user.fullName
        };

        req.session.isLoggedIn = true;

        await req.session.save();

        return res.status(200).json({
            success: true,
            message: 'Login successful! Redirecting...',
            token: token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.',
            errors: { general: 'Something went wrong. Please try again.' }
        });
    }
}

exports.postLogout = async (req, res) => {
    try {
        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error during logout. Please try again.',
                });
            }
            
            // Clear the session cookie
            res.clearCookie('connect.sid');
            
            return res.status(200).json({
                success: true,
                message: 'Logout successful'
            });
        });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during logout.',
        });
    }
};
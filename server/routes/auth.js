const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Login endpoint
router.post('/login', [
  body('secretId').trim().notEmpty().withMessage('Secret ID is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    
    const { secretId, password } = req.body;
    
    // Find user
    const user = await User.findOne({ secretId });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({ error: 'Account temporarily locked due to too many failed attempts' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.updateOne({
        $unset: {
          loginAttempts: 1,
          lockUntil: 1
        },
        $set: {
          lastLogin: new Date()
        }
      });
    } else {
      await user.updateOne({ lastLogin: new Date() });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { id: user._id, secretId: user.secretId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    logger.info(`User ${secretId} logged in successfully`);
    
    res.json({
      token,
      user: {
        id: user._id,
        secretId: user.secretId,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify token endpoint
router.get('/verify', auth, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      secretId: req.user.secretId,
      role: req.user.role
    }
  });
});

// Change password endpoint
router.put('/change-password', [
  auth,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // Verify current password
    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    req.user.password = newPassword;
    await req.user.save();
    
    logger.info(`User ${req.user.secretId} changed password`);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
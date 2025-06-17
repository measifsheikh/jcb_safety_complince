const express = require('express');
const { body, validationResult, query } = require('express-validator');
const SafetyRecord = require('../models/SafetyRecord');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all safety records with filtering and search
router.get('/', [
  auth,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date'),
  query('area').optional().isIn(['PRODUCTION_FLOOR', 'WAREHOUSE', 'MAINTENANCE', 'OFFICE', 'LOADING_DOCK', 'QUALITY_CONTROL', 'SHIPPING', 'RECEIVING', 'LABORATORY', 'CAFETERIA']).withMessage('Invalid area'),
  query('defaultersOnly').optional().isBoolean().withMessage('DefaultersOnly must be boolean'),
  query('search').optional().isString().withMessage('Search must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      area,
      defaultersOnly,
      search,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query
    const query = {};
    
    // Date filtering
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Area filtering
    if (area) query.area = area;
    
    // Defaulter filtering
    if (defaultersOnly === 'true') query.isDefaulter = true;
    
    // Search functionality - search in name and department
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search
      query.$or = [
        { name: searchRegex },
        { department: searchRegex }
      ];
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [records, total] = await Promise.all([
      SafetyRecord.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SafetyRecord.countDocuments(query)
    ]);
    
    res.json({
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    logger.error('Get safety records error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new safety record
router.post('/', [
  auth,
  body('area').isIn(['PRODUCTION_FLOOR', 'WAREHOUSE', 'MAINTENANCE', 'OFFICE', 'LOADING_DOCK', 'QUALITY_CONTROL', 'SHIPPING', 'RECEIVING', 'LABORATORY', 'CAFETERIA']).withMessage('Invalid area'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('department').trim().isLength({ min: 2, max: 100 }).withMessage('Department must be between 2 and 100 characters'),
  body('safetyShoes').isBoolean().withMessage('SafetyShoes must be boolean'),
  body('safetyGlasses').isBoolean().withMessage('SafetyGlasses must be boolean'),
  body('safetyJacket').isBoolean().withMessage('SafetyJacket must be boolean'),
  body('date').optional().isISO8601().withMessage('Date must be valid ISO date'),
  body('strength').optional().isInt({ min: 1, max: 1000 }).withMessage('Strength must be between 1 and 1000')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    
    const recordData = {
      ...req.body,
      createdBy: req.user.secretId,
      date: req.body.date ? new Date(req.body.date) : new Date()
    };
    
    const record = new SafetyRecord(recordData);
    await record.save();
    
    logger.info(`Safety record created by ${req.user.secretId} for ${record.name}`);
    
    res.status(201).json(record);
  } catch (error) {
    logger.error('Create safety record error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single safety record
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await SafetyRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(record);
  } catch (error) {
    logger.error('Get safety record error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update safety record
router.put('/:id', [
  auth,
  body('area').optional().isIn(['PRODUCTION_FLOOR', 'WAREHOUSE', 'MAINTENANCE', 'OFFICE', 'LOADING_DOCK', 'QUALITY_CONTROL', 'SHIPPING', 'RECEIVING', 'LABORATORY', 'CAFETERIA']).withMessage('Invalid area'),
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('department').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Department must be between 2 and 100 characters'),
  body('safetyShoes').optional().isBoolean().withMessage('SafetyShoes must be boolean'),
  body('safetyGlasses').optional().isBoolean().withMessage('SafetyGlasses must be boolean'),
  body('safetyJacket').optional().isBoolean().withMessage('SafetyJacket must be boolean'),
  body('date').optional().isISO8601().withMessage('Date must be valid ISO date'),
  body('strength').optional().isInt({ min: 1, max: 1000 }).withMessage('Strength must be between 1 and 1000')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    
    const record = await SafetyRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        record[key] = req.body[key];
      }
    });
    
    await record.save();
    
    logger.info(`Safety record ${req.params.id} updated by ${req.user.secretId}`);
    
    res.json(record);
  } catch (error) {
    logger.error('Update safety record error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete safety record
router.delete('/:id', auth, async (req, res) => {
  try {
    const record = await SafetyRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    await SafetyRecord.findByIdAndDelete(req.params.id);
    
    logger.info(`Safety record ${req.params.id} deleted by ${req.user.secretId}`);
    
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    logger.error('Delete safety record error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
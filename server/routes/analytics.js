const express = require('express');
const { query, validationResult } = require('express-validator');
const SafetyRecord = require('../models/SafetyRecord');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Helper function to safely calculate percentage
const safePercentage = (numerator, denominator) => {
  if (!denominator || denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
};

// Get analytics dashboard data
router.get('/dashboard', [
  auth,
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }
    
    // Check if collection exists and has data
    const collectionExists = await SafetyRecord.countDocuments();
    if (collectionExists === 0) {
      return res.json({
        totalRecords: 0,
        totalDefaulters: 0,
        complianceRate: 0,
        nonCompliantRate: 0
      });
    }
    
    // Get overall stats with better error handling
    const [totalRecords, totalDefaulters, complianceRate] = await Promise.all([
      SafetyRecord.countDocuments(dateFilter).catch(err => {
        logger.error('Error counting total records:', err);
        return 0;
      }),
      SafetyRecord.countDocuments({ ...dateFilter, isDefaulter: true }).catch(err => {
        logger.error('Error counting defaulters:', err);
        return 0;
      }),
      SafetyRecord.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalEquipmentChecks: {
              $sum: {
                $add: [
                  { $cond: [{ $eq: ['$safetyShoes', true] }, 1, 0] },
                  { $cond: [{ $eq: ['$safetyGlasses', true] }, 1, 0] },
                  { $cond: [{ $eq: ['$safetyJacket', true] }, 1, 0] }
                ]
              }
            },
            totalPossibleChecks: { $sum: 3 }
          }
        }
      ]).catch(err => {
        logger.error('Error in compliance aggregation:', err);
        return [];
      })
    ]);
    
    const overallComplianceRate = (complianceRate && complianceRate[0]) 
      ? safePercentage(complianceRate[0].totalEquipmentChecks, complianceRate[0].totalPossibleChecks)
      : 0;
    
    res.json({
      totalRecords: totalRecords || 0,
      totalDefaulters: totalDefaulters || 0,
      complianceRate: overallComplianceRate,
      nonCompliantRate: safePercentage(totalDefaulters, totalRecords)
    });
  } catch (error) {
    logger.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get area vs defaulters chart data
router.get('/area-defaulters', [
  auth,
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }
    
    // Check if any data exists
    const hasData = await SafetyRecord.countDocuments(dateFilter);
    if (hasData === 0) {
      return res.json([]);
    }
    
    const areaStats = await SafetyRecord.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$area',
          totalPersons: { $sum: 1 },
          defaulters: { $sum: { $cond: ['$isDefaulter', 1, 0] } },
          totalStrength: { $sum: '$strength' },
          avgStrength: { $avg: '$strength' }
        }
      },
      {
        $project: {
          area: '$_id',
          totalPersons: 1,
          defaulters: 1,
          compliant: { $subtract: ['$totalPersons', '$defaulters'] },
          totalStrength: 1,
          avgStrength: { $round: [{ $ifNull: ['$avgStrength', 0] }, 0] },
          complianceRate: {
            $cond: {
              if: { $eq: ['$totalPersons', 0] },
              then: 0,
              else: {
                $round: [
                  { $multiply: [{ $divide: [{ $subtract: ['$totalPersons', '$defaulters'] }, '$totalPersons'] }, 100] },
                  1
                ]
              }
            }
          }
        }
      },
      { $sort: { defaulters: -1 } }
    ]);
    
    res.json(areaStats || []);
  } catch (error) {
    logger.error('Area defaulters analytics error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get monthly trend data
router.get('/monthly-trend', [
  auth,
  query('year').optional().isInt({ min: 2020, max: 2030 }).withMessage('Year must be between 2020 and 2030')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    
    const year = parseInt(req.query.year) || new Date().getFullYear();
    
    // Check if any data exists for the year
    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year}-12-31`);
    const hasYearData = await SafetyRecord.countDocuments({
      date: { $gte: yearStart, $lte: yearEnd }
    });
    
    let monthlyTrend = [];
    
    if (hasYearData > 0) {
      monthlyTrend = await SafetyRecord.aggregate([
        {
          $match: {
            date: { $gte: yearStart, $lte: yearEnd }
          }
        },
        {
          $group: {
            _id: { $month: '$date' },
            totalRecords: { $sum: 1 },
            defaulters: { $sum: { $cond: ['$isDefaulter', 1, 0] } },
            compliant: { $sum: { $cond: ['$isDefaulter', 0, 1] } }
          }
        },
        {
          $project: {
            month: '$_id',
            totalRecords: 1,
            defaulters: 1,
            compliant: 1,
            complianceRate: {
              $cond: {
                if: { $eq: ['$totalRecords', 0] },
                then: 0,
                else: {
                  $round: [
                    { $multiply: [{ $divide: ['$compliant', '$totalRecords'] }, 100] },
                    1
                  ]
                }
              }
            }
          }
        },
        { $sort: { month: 1 } }
      ]);
    }
    
    // Fill in missing months with zero data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const fullYearData = monthNames.map((name, index) => {
      const monthData = monthlyTrend.find(item => item.month === index + 1);
      return {
        month: name,
        monthNumber: index + 1,
        totalRecords: monthData?.totalRecords || 0,
        defaulters: monthData?.defaulters || 0,
        compliant: monthData?.compliant || 0,
        complianceRate: monthData?.complianceRate || 0
      };
    });
    
    res.json(fullYearData);
  } catch (error) {
    logger.error('Monthly trend analytics error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get equipment compliance breakdown
router.get('/equipment-breakdown', [
  auth,
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }
    
    // Check if any data exists
    const hasData = await SafetyRecord.countDocuments(dateFilter);
    if (hasData === 0) {
      return res.json([]);
    }
    
    const equipmentStats = await SafetyRecord.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          safetyShoesMissing: { $sum: { $cond: [{ $eq: ['$safetyShoes', false] }, 1, 0] } },
          safetyGlassesMissing: { $sum: { $cond: [{ $eq: ['$safetyGlasses', false] }, 1, 0] } },
          safetyJacketMissing: { $sum: { $cond: [{ $eq: ['$safetyJacket', false] }, 1, 0] } },
          safetyShoesCompliant: { $sum: { $cond: [{ $eq: ['$safetyShoes', true] }, 1, 0] } },
          safetyGlassesCompliant: { $sum: { $cond: [{ $eq: ['$safetyGlasses', true] }, 1, 0] } },
          safetyJacketCompliant: { $sum: { $cond: [{ $eq: ['$safetyJacket', true] }, 1, 0] } }
        }
      }
    ]);
    
    if (!equipmentStats || equipmentStats.length === 0) {
      return res.json([]);
    }
    
    const stats = equipmentStats[0];
    const totalRecords = stats.totalRecords || 1; // Prevent division by zero
    
    const equipmentBreakdown = [
      {
        equipment: 'Safety Shoes',
        compliant: stats.safetyShoesCompliant || 0,
        nonCompliant: stats.safetyShoesMissing || 0,
        complianceRate: safePercentage(stats.safetyShoesCompliant, totalRecords)
      },
      {
        equipment: 'Safety Glasses',
        compliant: stats.safetyGlassesCompliant || 0,
        nonCompliant: stats.safetyGlassesMissing || 0,
        complianceRate: safePercentage(stats.safetyGlassesCompliant, totalRecords)
      },
      {
        equipment: 'Safety Jacket',
        compliant: stats.safetyJacketCompliant || 0,
        nonCompliant: stats.safetyJacketMissing || 0,
        complianceRate: safePercentage(stats.safetyJacketCompliant, totalRecords)
      }
    ];
    
    res.json(equipmentBreakdown);
  } catch (error) {
    logger.error('Equipment breakdown analytics error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get department-wise analytics
router.get('/department-analytics', [
  auth,
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }
    
    // Check if any data exists
    const hasData = await SafetyRecord.countDocuments(dateFilter);
    if (hasData === 0) {
      return res.json([]);
    }
    
    const departmentStats = await SafetyRecord.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$department',
          totalPersons: { $sum: 1 },
          defaulters: { $sum: { $cond: ['$isDefaulter', 1, 0] } },
          avgStrength: { $avg: '$strength' }
        }
      },
      {
        $project: {
          department: '$_id',
          totalPersons: 1,
          defaulters: 1,
          compliant: { $subtract: ['$totalPersons', '$defaulters'] },
          avgStrength: { $round: [{ $ifNull: ['$avgStrength', 0] }, 0] },
          complianceRate: {
            $cond: {
              if: { $eq: ['$totalPersons', 0] },
              then: 0,
              else: {
                $round: [
                  { $multiply: [{ $divide: [{ $subtract: ['$totalPersons', '$defaulters'] }, '$totalPersons'] }, 100] },
                  1
                ]
              }
            }
          }
        }
      },
      { $sort: { complianceRate: 1 } }
    ]);
    
    res.json(departmentStats || []);
  } catch (error) {
    logger.error('Department analytics error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get daily compliance trend for a specific period
router.get('/daily-trend', [
  auth,
  query('startDate').isISO8601().withMessage('Start date is required and must be valid ISO date'),
  query('endDate').isISO8601().withMessage('End date is required and must be valid ISO date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate date range
    if (start > end) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }
    
    // Check if any data exists in the range
    const hasData = await SafetyRecord.countDocuments({
      date: { $gte: start, $lte: end }
    });
    
    if (hasData === 0) {
      return res.json([]);
    }
    
    const dailyTrend = await SafetyRecord.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' }
          },
          totalRecords: { $sum: 1 },
          defaulters: { $sum: { $cond: ['$isDefaulter', 1, 0] } },
          compliant: { $sum: { $cond: ['$isDefaulter', 0, 1] } }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          totalRecords: 1,
          defaulters: 1,
          compliant: 1,
          complianceRate: {
            $cond: {
              if: { $eq: ['$totalRecords', 0] },
              then: 0,
              else: {
                $round: [
                  { $multiply: [{ $divide: ['$compliant', '$totalRecords'] }, 100] },
                  1
                ]
              }
            }
          }
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    res.json(dailyTrend || []);
  } catch (error) {
    logger.error('Daily trend analytics error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

module.exports = router;
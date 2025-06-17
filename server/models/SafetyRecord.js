const mongoose = require('mongoose');

const AreaEnum = [
  'PRODUCTION_FLOOR',
  'WAREHOUSE',
  'MAINTENANCE',
  'OFFICE',
  'LOADING_DOCK',
  'QUALITY_CONTROL',
  'SHIPPING',
  'RECEIVING',
  'LABORATORY',
  'CAFETERIA'
];

const safetyRecordSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  area: {
    type: String,
    required: true,
    enum: AreaEnum
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  department: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  safetyShoes: {
    type: Boolean,
    required: true,
    default: false
  },
  safetyGlasses: {
    type: Boolean,
    required: true,
    default: false
  },
  safetyJacket: {
    type: Boolean,
    required: true,
    default: false
  },
  strength: {
    type: Number,
    default: 120,
    min: 1,
    max: 1000
  },
  isDefaulter: {
    type: Boolean,
    default: function() {
      return !(this.safetyShoes && this.safetyGlasses && this.safetyJacket);
    }
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
safetyRecordSchema.index({ date: 1, area: 1 });
safetyRecordSchema.index({ isDefaulter: 1 });
safetyRecordSchema.index({ createdBy: 1 });

// Virtual for compliance rate
safetyRecordSchema.virtual('complianceRate').get(function() {
  const totalEquipment = 3;
  const compliantEquipment = (this.safetyShoes ? 1 : 0) + 
                           (this.safetyGlasses ? 1 : 0) + 
                           (this.safetyJacket ? 1 : 0);
  return Math.round((compliantEquipment / totalEquipment) * 100);
});

// Pre-save middleware to calculate isDefaulter
safetyRecordSchema.pre('save', function(next) {
  this.isDefaulter = !(this.safetyShoes && this.safetyGlasses && this.safetyJacket);
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('SafetyRecord', safetyRecordSchema);

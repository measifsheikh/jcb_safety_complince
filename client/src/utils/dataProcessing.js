export const calculateDefaulters = (records, groupBy = 'area') => {
  const grouped = records.reduce((acc, record) => {
    const key = record[groupBy];
    if (!acc[key]) {
      acc[key] = {
        total: 0,
        defaulters: 0,
        compliant: 0
      };
    }
    
    acc[key].total++;
    if (record.isDefaulter) {
      acc[key].defaulters++;
    } else {
      acc[key].compliant++;
    }
    
    return acc;
  }, {});

  return Object.entries(grouped).map(([key, data]) => ({
    [groupBy]: key,
    ...data,
    complianceRate: ((data.compliant / data.total) * 100).toFixed(1)
  }));
};

export const calculateAreaStrength = (records) => {
  return records.reduce((acc, record) => {
    if (!acc[record.area]) {
      acc[record.area] = {
        area: record.area,
        totalPeople: 0,
        defaulters: 0,
        strength: record.strength || 120
      };
    }
    
    acc[record.area].totalPeople++;
    if (record.isDefaulter) {
      acc[record.area].defaulters++;
    }
    
    return acc;
  }, {});
};

export const processChartData = (records, chartType) => {
  switch (chartType) {
    case 'area-defaulters':
      return calculateDefaulters(records, 'area');
    
    case 'monthly-trend':
      return records.reduce((acc, record) => {
        const month = new Date(record.date).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!acc[month]) {
          acc[month] = { month, total: 0, defaulters: 0 };
        }
        acc[month].total++;
        if (record.isDefaulter) {
          acc[month].defaulters++;
        }
        return acc;
      }, {});
    
    case 'equipment-breakdown':
      const equipmentData = {
        shoes: { missing: 0, present: 0 },
        glasses: { missing: 0, present: 0 },
        jacket: { missing: 0, present: 0 }
      };
      
      records.forEach(record => {
        equipmentData.shoes[record.safetyShoes ? 'present' : 'missing']++;
        equipmentData.glasses[record.safetyGlasses ? 'present' : 'missing']++;
        equipmentData.jacket[record.safetyJacket ? 'present' : 'missing']++;
      });
      
      return equipmentData;
    
    default:
      return records;
  }
};

export const filterByDateRange = (records, startDate, endDate) => {
  if (!startDate && !endDate) return records;
  
  const start = startDate ? new Date(startDate) : new Date('1900-01-01');
  const end = endDate ? new Date(endDate) : new Date();
  
  return records.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= start && recordDate <= end;
  });
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>\"']/g, '') // Remove potential XSS characters
    .substring(0, 255); // Limit length
};

export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const value = data[field];
    const fieldRules = rules[field];
    
    if (fieldRules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[field] = `${field} is required`;
    }
    
    if (value && fieldRules.minLength && value.length < fieldRules.minLength) {
      errors[field] = `${field} must be at least ${fieldRules.minLength} characters`;
    }
    
    if (value && fieldRules.maxLength && value.length > fieldRules.maxLength) {
      errors[field] = `${field} must be no more than ${fieldRules.maxLength} characters`;
    }
  });
  
  return errors;
};
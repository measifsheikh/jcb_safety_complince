const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const setupDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Check if admin user exists
    const existingUser = await User.findOne({ secretId: process.env.SECRET_ID });
    
    if (!existingUser) {
      // Create admin user
      const adminUser = new User({
        secretId: process.env.SECRET_ID,
        password: process.env.SECRET_PASSWORD || 'admin123456',
        role: 'admin'
      });
      
      await adminUser.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
    
    console.log('Database setup completed');
    process.exit(0);
  } catch (error) {
    console.error('Database setup error:', error);
    process.exit(1);
  }
};

setupDatabase();

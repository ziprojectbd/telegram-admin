import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '@/models/User';
import Settings from '@/models/Settings';
import dbConnect from '@/lib/db';

async function seed() {
  try {
    await dbConnect();
    console.log('Connected to MongoDB');

    // Seed admin user
    const existingUser = await User.findOne({ email: 'demo@telegram.dev' });
    
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('demo123', 10);
      const demoUser = await User.create({
        name: 'Demo User',
        email: 'demo@telegram.dev',
        password: hashedPassword,
      });
      console.log('✅ Demo user created:', demoUser.email);
    } else {
      console.log('Demo user already exists');
    }

    // Seed Settings with default admin credentials (global — single document per app)
    const existingSettings = await Settings.findOne({});
    if (!existingSettings) {
      await Settings.create({
        adminEmail: 'demo@telegram.dev',
        adminPassword: 'demo123',
      });
      console.log('✅ Default settings created with admin credentials');
    } else {
      console.log('Settings already exist');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();

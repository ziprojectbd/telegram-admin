import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '@/models/User';
import dbConnect from '@/lib/db';

async function seed() {
  try {
    await dbConnect();
    console.log('Connected to MongoDB');

    // Check if demo user already exists
    const existingUser = await User.findOne({ email: 'demo@telegram.dev' });
    
    if (existingUser) {
      console.log('Demo user already exists');
      process.exit(0);
    }

    // Create demo user
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    const demoUser = await User.create({
      name: 'Demo User',
      email: 'demo@telegram.dev',
      password: hashedPassword,
    });

    console.log('Demo user created successfully:', demoUser.email);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();

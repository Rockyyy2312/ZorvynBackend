import mongoose from 'mongoose';
import User from './models/user.model.js';
import { config } from './config/env.js';

async function reset() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(config.mongoUri || 'mongodb://localhost:27017/financedb');
    console.log('Connected.');

    const users = await User.find();
    console.log(`Found ${users.length} users in the database.`);

    for (const user of users) {
      console.log(`Resetting password for ${user.email}...`);
      user.password = 'password123';
      await user.save();
      console.log(`Password reset for ${user.email} successful.`);
    }

    console.log('All passwords successfully reset to "password123".');
  } catch (err) {
    console.error('Error during password reset:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

reset();

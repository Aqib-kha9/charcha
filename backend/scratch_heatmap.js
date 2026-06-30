import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { triggerHeatmapRecompute } from './src/controllers/heatmapController.js';
import config from './src/config/index.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB. Triggering heatmap recompute...');
  await triggerHeatmapRecompute();
  console.log('Heatmap recomputed.');
  process.exit(0);
}

run();

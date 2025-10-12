import express, { Request, Response } from 'express';
import { seedCollections } from '../db/seed-data.js';

const router = express.Router();

/**
 * POST /api/seed
 * Seeds the database with initial data
 * Note: This is a one-time operation. Consider removing or protecting this endpoint in production.
 */
router.post('/seed', async (_req: Request, res: Response) => {
  try {
    console.log('🌱 Starting database seed via API endpoint...');
    
    const summary = await seedCollections();
    
    console.log('✅ Database seeded successfully via API');
    
    res.json({
      success: true,
      message: 'Database seeded successfully',
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Seed failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;


/**
 * Validates required environment variables for production deployment
 */
export function validateProductionEnv(): void {
  const required = [
    'OPENAI_API_KEY',
    'NEO4J_CLOUD_URI',
    'NEO4J_CLOUD_USERNAME',
    'NEO4J_CLOUD_PASSWORD',
    'PINECONE_API_KEY',
    'MONGODB_CLOUD_URI',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    console.error('\n❌ Missing required environment variables in production:');
    missing.forEach(key => console.error(`   - ${key}`));
    throw new Error(
      `Missing required environment variables in production: ${missing.join(', ')}`
    );
  }

  if (process.env.NODE_ENV === 'production') {
    // Warn about localhost URLs in production
    const localPatterns = ['localhost', '127.0.0.1'];
    const cloudVars = ['NEO4J_CLOUD_URI', 'MONGODB_CLOUD_URI', 'WASTEER_API_URL'];

    for (const envVar of cloudVars) {
      const value = process.env[envVar];
      if (value && localPatterns.some(pattern => value.includes(pattern))) {
        console.warn(`⚠️  WARNING: ${envVar} contains localhost in production: ${value}`);
      }
    }
  }
}


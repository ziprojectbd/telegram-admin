import mongoose from 'mongoose';

const envUri = process.env.MONGODB_URI;

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB.
 * Priority: customUri > DB-stored URI (globalThis) > MONGODB_URI env variable.
 * Set mongodbUri in Settings page to make it fully DB-driven with no env needed.
 */
async function dbConnect(customUri?: string) {
  const G = globalThis as any;

  // If a custom URI is provided (e.g., after settings change), reconnect with it
  if (customUri && G.__mongoUri !== customUri) {
    if (cached.conn) {
      await mongoose.disconnect();
      cached.conn = null;
      cached.promise = null;
    }
    G.__mongoUri = customUri;
  }

  // Determine URI: custom > DB-stored > env fallback
  const uri = customUri || G.__mongoUri || envUri;

  if (!uri) {
    throw new Error(
      'No MongoDB URI configured. Set mongodbUri in Settings page or MONGODB_URI in .env.local.'
    );
  }

  if (cached.conn) {
    // Verify the connection is still alive
    if (mongoose.connection.readyState === 1) {
      return cached.conn;
    }
    // Connection dropped — reconnect
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then((mongoose) => mongoose);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * Load DB-stored MongoDB URI from Settings collection and inject into dbConnect.
 * Called once at app startup (from layout.tsx).
 * Uses env URI for initial connection, then switches to DB-stored URI if available.
 */
export async function loadDbUriFromSettings() {
  const G = globalThis as any;
  if (G.__mongoUriLoaded) return;
  G.__mongoUriLoaded = true;

  if (!envUri) {
    console.warn('⚠️ MONGODB_URI not set in env. Waiting for DB URI from Settings page...');
    return;
  }

  try {
    // Connect via normal dbConnect path to keep cache consistent
    await dbConnect(envUri);
    const settings = await mongoose.connection.db!.collection('settings').findOne({});
    const dbUri = (settings as any)?.mongodbUri;
    if (dbUri && typeof dbUri === 'string' && dbUri.trim()) {
      G.__mongoUri = dbUri.trim();
      console.log('📦 Loaded MongoDB URI from Settings collection');
    }
  } catch (err) {
    console.warn('⚠️ Could not load MongoDB URI from Settings:', err);
  }
}

export default dbConnect;
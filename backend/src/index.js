import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { initDb } from './config/db.js';
import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Configure CORS to support HTTP-only cookies and credentials transmission
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Setup payload and cookie parsing
app.use(express.json());
app.use(cookieParser());

// Server health monitoring endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Connect routers
app.use('/auth', authRoutes);
app.use('/notes', notesRoutes);

// Catch-all 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint route not found.' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Server unhandled error occurred:', err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

// Start Express and SQLite
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`==========================================`);
      console.log(`SecureVault API Backend listening on port ${PORT}`);
      console.log(`Configured CORS Client Origin: ${CLIENT_ORIGIN}`);
      console.log(`==========================================`);
    });
  } catch (error) {
    console.error('Fatal initialization error:', error);
    process.exit(1);
  }
}

startServer();

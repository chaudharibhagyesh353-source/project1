import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getDb } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Zod schemas for input validation
const registerSchema = z.object({
  email: z.string()
    .trim()
    .min(1, { message: 'Email is required.' })
    .email({ message: 'Invalid email address format.' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters long.' })
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email format.' }),
  password: z.string().min(1, { message: 'Password is required.' })
});

/**
 * POST /auth/register
 * Create a new user account
 */
router.post('/register', async (req, res) => {
  try {
    const db = getDb();
    
    // Validate request body
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      const firstErrorMessage = Object.values(errors).flat()[0];
      return res.status(400).json({ error: firstErrorMessage, details: errors });
    }
    
    const { email, password } = parseResult.data;
    
    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }
    
    // Hash password with bcrypt (10 rounds minimum)
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Save user to database
    await db.run(
      'INSERT INTO users (email, passwordHash) VALUES (?, ?)',
      [email, passwordHash]
    );
    
    return res.status(201).json({ message: 'User registered successfully. You can now log in.' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

/**
 * POST /auth/login
 * Authenticate and return signed JWT + httpOnly cookie
 */
router.post('/login', async (req, res) => {
  try {
    const db = getDb();
    
    // Validate request body
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      const firstErrorMessage = Object.values(errors).flat()[0];
      return res.status(400).json({ error: firstErrorMessage, details: errors });
    }
    
    const { email, password } = parseResult.data;
    
    // Retrieve user
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    
    // Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * POST /auth/logout
 * Clear authentication session/cookies
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({ message: 'Logged out successfully.' });
});

/**
 * GET /auth/me
 * Check currently authenticated user via session token
 */
router.get('/me', authenticateToken, (req, res) => {
  return res.status(200).json({ user: req.user });
});

export default router;

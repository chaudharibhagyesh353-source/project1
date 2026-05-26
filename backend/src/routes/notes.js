import express from 'express';
import { z } from 'zod';
import { getDb } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const router = express.Router();

// Input validation schema for creating a note
const createNoteSchema = z.object({
  title: z.string()
    .trim()
    .min(1, { message: 'Title is required.' })
    .max(100, { message: 'Title cannot exceed 100 characters.' }),
  encryptedBody: z.string()
    .min(1, { message: 'Encrypted body is required.' }),
  clientIv: z.string()
    .min(1, { message: 'Client IV is required.' })
});

/**
 * GET /notes
 * List all notes belonging to the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    
    // Fetch all notes for the current user
    const dbNotes = await db.all(
      'SELECT id, title, encryptedContent, iv, authTag, clientIv, createdAt FROM notes WHERE userId = ? ORDER BY createdAt DESC',
      [userId]
    );
    
    const notes = [];
    
    for (const note of dbNotes) {
      try {
        // Decrypt server-side encryption to get client-side encrypted body
        const clientEncryptedBody = decrypt(note.encryptedContent, note.iv, note.authTag);
        
        notes.push({
          id: note.id,
          title: note.title,
          encryptedBody: clientEncryptedBody,
          clientIv: note.clientIv,
          createdAt: note.createdAt
        });
      } catch (decryptionError) {
        console.error(`Failed to decrypt note ID ${note.id}:`, decryptionError);
      }
    }
    
    return res.status(200).json(notes);
  } catch (error) {
    console.error('Fetch notes error:', error);
    return res.status(500).json({ error: 'Internal server error while fetching notes.' });
  }
});

/**
 * POST /notes
 * Create a new note (body is client-encrypted)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    
    // Validate note parameters
    const parseResult = createNoteSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      const firstErrorMessage = Object.values(errors).flat()[0];
      return res.status(400).json({ error: firstErrorMessage, details: errors });
    }
    
    const { title, encryptedBody, clientIv } = parseResult.data;
    
    // Encrypt the client's ciphertext under the server's key
    const { encryptedContent, iv, authTag } = encrypt(encryptedBody);
    
    // Save to database, including the title
    const result = await db.run(
      `INSERT INTO notes (userId, title, encryptedContent, iv, authTag, clientIv) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, title, encryptedContent, iv, authTag, clientIv]
    );
    
    return res.status(201).json({
      message: 'Note saved successfully.',
      note: {
        id: result.lastID,
        title,
        encryptedBody,
        clientIv,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create note error:', error);
    return res.status(500).json({ error: 'Internal server error while saving note.' });
  }
});

/**
 * DELETE /notes/:id
 * Delete a note by ID (user ownership check enforced)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const noteId = req.params.id;
    
    // Fetch the note to check ownership
    const note = await db.get('SELECT userId FROM notes WHERE id = ?', [noteId]);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found.' });
    }
    
    // Enforce cross-user boundaries
    if (note.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden. You do not own this note.' });
    }
    
    // Perform deletion
    await db.run('DELETE FROM notes WHERE id = ?', [noteId]);
    
    return res.status(200).json({ message: 'Note deleted successfully.' });
  } catch (error) {
    console.error('Delete note error:', error);
    return res.status(500).json({ error: 'Internal server error while deleting note.' });
  }
});

export default router;

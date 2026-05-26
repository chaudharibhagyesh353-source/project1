import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCrypto } from '../hooks/useCrypto';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  LogOut, 
  Lock, 
  Calendar, 
  AlertTriangle,
  FolderOpen,
  Search,
  Copy,
  Check
} from 'lucide-react';
import { API_URL } from '../context/AuthContext';

export default function Dashboard() {
  const { user, token, cryptoKey, logout } = useAuth();
  const { encryptText, decryptText } = useCrypto();
  const queryClient = useQueryClient();

  // Local state for the note creator form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState(null);

  // Local state for search & clipboard copies
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  
  // Local state for alert toasts
  const [toast, setToast] = useState(null);

  // Local state for delete confirmation modal
  const [noteToDelete, setNoteToDelete] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. React Query: Fetch notes with in-memory decryption
  const { data: notes, isLoading, isError, error } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/notes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve notes from server.');
      }

      const encryptedNotes = await response.json();

      // Decrypt note bodies client-side
      const decryptedNotes = await Promise.all(
        encryptedNotes.map(async (note) => {
          try {
            const plaintextBody = await decryptText(note.encryptedBody, note.clientIv, cryptoKey);
            return {
              ...note,
              body: plaintextBody
            };
          } catch (decryptionError) {
            console.error(`Error decrypting note ${note.id}:`, decryptionError);
            return {
              ...note,
              body: '[Decryption Error: Unable to decrypt note body with current key]'
            };
          }
        })
      );

      return decryptedNotes;
    },
    enabled: !!token && !!cryptoKey,
  });

  // 2. React Query Mutation: Create note with client-side encryption
  const createNoteMutation = useMutation({
    mutationFn: async ({ title, body }) => {
      // Browser encryption
      const { encryptedBody, iv } = await encryptText(body, cryptoKey);

      const response = await fetch(`${API_URL}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          encryptedBody,
          clientIv: iv
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save note.');
      }

      return response.json();
    },
    onSuccess: () => {
      setTitle('');
      setBody('');
      setFormError(null);
      showToast('Note created and encrypted successfully!');
      // Invalidate query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (err) => {
      setFormError(err.message || 'Error occurred while saving the note.');
    }
  });

  // 3. React Query Mutation: Delete note with Optimistic UI updates
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId) => {
      const response = await fetch(`${API_URL}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete note.');
      }

      return response.json();
    },
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const previousNotes = queryClient.getQueryData(['notes']);

      // Optimistically delete
      queryClient.setQueryData(['notes'], (old) => {
        return old ? old.filter(note => note.id !== noteId) : [];
      });

      showToast('Deleting note...', 'info');
      return { previousNotes };
    },
    onError: (err, noteId, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes);
      }
      showToast(`Deletion failed: ${err.message}`, 'danger');
    },
    onSuccess: () => {
      showToast('Note deleted successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  const handleCreateNoteSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !body.trim()) {
      setFormError('Both title and body are required.');
      return;
    }

    createNoteMutation.mutate({ title, body });
  };

  const confirmDeleteNote = () => {
    if (noteToDelete) {
      deleteNoteMutation.mutate(noteToDelete);
      setNoteToDelete(null);
    }
  };

  const handleCopyNote = (noteId, noteBodyText) => {
    navigator.clipboard.writeText(noteBodyText);
    setCopiedId(noteId);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Plaintext note content copied to clipboard.');
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Filter notes client-side based on search query
  const filteredNotes = notes?.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    note.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Note editor character & word count calculations
  const charCount = body.length;
  const wordCount = body.trim() === '' ? 0 : body.trim().split(/\s+/).length;

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="nav-brand">
          <Lock size={20} />
          <span>SecureVault</span>
        </div>
        <div className="nav-user">
          <span className="user-email">{user?.email}</span>
          <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </nav>

      {/* Floating Action Toast Banner */}
      {toast && (
        <div 
          className={`alert alert-${toast.type === 'danger' ? 'danger' : toast.type === 'info' ? 'secondary' : 'success'}`} 
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 1000,
            maxWidth: '350px',
            boxShadow: 'var(--shadow-md)',
            animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Main Content Area */}
      <main className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">My Encrypted Vault</h1>
        </div>

        <div className="dashboard-grid">
          {/* Note Creator Form Panel (Left Column) */}
          <section>
            <div className="panel-card">
              <h3 className="panel-title">
                <Plus size={18} />
                New Encrypted Note
              </h3>
              
              {formError && (
                <div className="alert alert-danger" style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateNoteSubmit}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Note Title"
                    style={{ paddingLeft: '1rem' }}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    disabled={createNoteMutation.isPending}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0.4rem' }}>
                  <label className="form-label">Content</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Type secret content here..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={createNoteMutation.isPending}
                    required
                  ></textarea>
                </div>
                
                {/* Character and Word Counters */}
                <div 
                  style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-secondary)', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '1.2rem',
                    padding: '0 0.2rem'
                  }}
                >
                  <span>{charCount} characters</span>
                  <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  disabled={createNoteMutation.isPending}
                >
                  {createNoteMutation.isPending ? (
                    <>
                      <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                      Encrypting & Saving...
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      Save Encrypted
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>

          {/* Notes list Display Area (Right Column) */}
          <section className="notes-section">
            
            {/* Search and Filters Bar */}
            {!isLoading && notes && notes.length > 0 && (
              <div 
                style={{ 
                  position: 'relative', 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '0.5rem' 
                }}
              >
                <Search 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '1rem', 
                    color: 'var(--text-muted)' 
                  }} 
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search decrypted notes by title or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.8rem' }}
                />
              </div>
            )}

            {isLoading && (
              <div className="spinner-container">
                <div className="spinner"></div>
              </div>
            )}

            {isError && (
              <div className="alert alert-danger">
                <AlertTriangle size={18} />
                <span>{error.message || 'Error fetching notes.'}</span>
              </div>
            )}

            {!isLoading && !isError && (!notes || notes.length === 0) && (
              <div className="empty-state">
                <FolderOpen className="empty-icon" size={48} />
                <h3>No notes found</h3>
                <p>Add your first encrypted note using the panel on the left. All content is encrypted client-side before submission.</p>
              </div>
            )}

            {!isLoading && !isError && notes && notes.length > 0 && filteredNotes.length === 0 && (
              <div className="empty-state" style={{ padding: '3rem 2rem' }}>
                <Search className="empty-icon" size={36} />
                <h3>No results match your search</h3>
                <p>Try refining your search keyword or clear the search input to see all notes.</p>
              </div>
            )}

            {!isLoading && !isError && filteredNotes && filteredNotes.length > 0 && (
              <div className="notes-grid">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="note-card">
                    <div>
                      <div className="note-header">
                        <h4 className="note-title">{note.title}</h4>
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          {/* Copy to Clipboard Button */}
                          <button 
                            className="btn-icon"
                            onClick={() => handleCopyNote(note.id, note.body)}
                            title="Copy Decrypted Content"
                            style={{ color: copiedId === note.id ? '#10b981' : 'var(--text-secondary)' }}
                          >
                            {copiedId === note.id ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                          
                          {/* Delete Button */}
                          <button 
                            className="btn-icon" 
                            onClick={() => setNoteToDelete(note.id)}
                            title="Delete Note"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="note-body">
                        {note.body.length > 150 
                          ? `${note.body.slice(0, 150)}...` 
                          : note.body}
                      </p>
                    </div>
                    <div className="note-footer">
                      <div className="note-date">
                        <Calendar size={12} />
                        <span>{formatDate(note.createdAt)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#10b981' }}>
                        <Lock size={10} />
                        <span>Encrypted</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Confirmation Modal */}
      {noteToDelete !== null && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Encrypted Note</h3>
            <p className="modal-desc">
              Are you sure you want to delete this note? This action is irreversible and the ciphertext will be deleted from the database permanently.
            </p>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setNoteToDelete(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={confirmDeleteNote}
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


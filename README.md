# 🔐 SecureVault – Full Stack Encrypted Notes Application

SecureVault is a secure full-stack encrypted notes application built with **React**, **Node.js**, and **SQLite**.

Users can:

- Register & Login securely
- Create encrypted personal notes
- View only their own notes
- Delete notes safely
- Store data protected using **AES-256-GCM encryption**

---

# ✨ Features

## Authentication
✅ User Registration  
✅ User Login  
✅ Password hashing using bcrypt (10 rounds)  
✅ JWT Authentication  
✅ Protected API routes  
✅ httpOnly cookie authentication

## Notes Management
✅ Create Notes  
✅ View Personal Notes  
✅ Delete Notes  
✅ User isolation (no cross-user access)

## Security Features
✅ AES-256-GCM encryption  
✅ Unique IV generation per encryption  
✅ Authentication Tag validation  
✅ Environment variable secrets  
✅ Protected routes middleware

## Frontend Features
✅ React Router protected pages  
✅ Login & Register forms  
✅ Dashboard UI  
✅ Loading states  
✅ Error handling  
✅ React Query data fetching

---

# 🛠 Tech Stack

## Frontend

- React 19
- Vite
- React Router DOM
- React Query
- Lucide React

## Backend

- Node.js
- Express.js
- SQLite
- JWT
- bcrypt
- Zod Validation
- Crypto API (AES-256-GCM)

---

# 📁 Project Structure

```plaintext
company project/
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── components/
│   │   └── App.jsx
│   │
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── config/
│   │   └── index.js
│   │
│   ├── database.sqlite
│   └── package.json
│
└── README.md
```

---

# ⚙️ Environment Variables

Create a `.env` file inside **backend/**

Example:

```env
PORT=5000
JWT_SECRET=your_jwt_secret

SERVER_ENCRYPTION_KEY=64_character_hex_key
```

Generate encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

# 🚀 Installation & Setup

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd "company project"
```

---

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

Backend runs on:

```plaintext
http://localhost:5000
```

---

## Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```plaintext
http://localhost:5173
```

---

# API Endpoints

## Auth Routes

### Register User

```http
POST /auth/register
```

### Login User

```http
POST /auth/login
```

---

## Notes Routes

### Get Notes

```http
GET /notes
```

### Create Note

```http
POST /notes
```

### Delete Note

```http
DELETE /notes/:id
```

All notes endpoints require authentication.

---

# 🔒 Encryption Implementation

This project uses **AES-256-GCM** encryption for secure note storage.

## Why AES-256-GCM?

AES-256-GCM provides:

- Strong encryption
- Data confidentiality
- Integrity verification
- Tamper detection

Unlike CBC mode, GCM includes an **authentication tag**, allowing the system to verify encrypted data integrity.

---

## IV Handling

Every encryption operation generates a **unique Initialization Vector (IV)**.

The IV is:

- Randomly generated
- Stored alongside encrypted data
- Required during decryption

IV reuse is dangerous because it can weaken AES-GCM security and expose encrypted relationships.

---

## Authentication Tag Protection

AES-GCM produces an **authentication tag**.

It protects against:

- Ciphertext tampering
- Message modification
- Forged encrypted payloads

If the tag is altered or missing, decryption fails.

---

## Known Limitation

The encryption key is currently loaded from an environment variable.

Production systems should use:

- AWS KMS
- Azure Key Vault
- Hardware Security Modules (HSM)

for stronger secret management.

---

# 🤖 AI Usage Log

### ChatGPT

Used for:

- Debugging npm / backend setup
- Encryption understanding
- README refinement

Modified outputs to match project architecture.

### GitHub Copilot

Used for:

- Code suggestions
- Component scaffolding
- API integration assistance

Reviewed and adjusted generated suggestions.

---

# 📌 Future Improvements

- Edit Note feature
- Refresh tokens
- Password reset
- Docker deployment
- Mobile version (React Native)
- Advanced key management

---

# 👨‍💻 Author

**Bhagyesh Chaudhari**

Full Stack Developer

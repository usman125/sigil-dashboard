# Sigil Dashboard

A zero-knowledge SaaS dashboard for managing encrypted email aliases. Built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- **Email/Password Authentication** - Traditional login with email and password
- **Master Password Encryption** - Zero-knowledge encryption using AES-256-GCM
- **Generate Aliases** - Create random @subkontinent.com email addresses
- **Inbox** - View emails received by your aliases
- **Alias Management** - List, copy, and delete aliases

## Architecture

The dashboard uses a two-password system:

1. **Account Password** - Stored (hashed) on the server for authentication
2. **Master Password** - Never leaves your device, used to encrypt/decrypt data

```
┌──────────────────┐     ┌─────────────────────┐
│  Next.js Client  │────▶│  zero-knowladge-vault│
│                  │     │      Backend         │
│  - Crypto.ts     │     │                     │
│  - Local encrypt │     │  - Auth (JWT)       │
│  - Master PW     │     │  - Aliases API      │
│                  │     │  - Mailgun webhook  │
└──────────────────┘     └─────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+
- The `zero-knowladge-vault` backend running

### Installation

```bash
# Clone and install
cd sigil-dashboard
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your backend URL

# Run development server
npm run dev
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

For production:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api/v1
```

## Project Structure

```
src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx      # Login with email/password + master PW
│   │   └── register/page.tsx   # Account creation
│   ├── dashboard/
│   │   ├── page.tsx            # Dashboard overview
│   │   ├── inbox/page.tsx      # Email inbox
│   │   ├── aliases/page.tsx    # Alias management
│   │   └── settings/page.tsx   # Account settings
│   ├── layout.tsx
│   └── page.tsx                # Landing page
├── components/
│   ├── Sidebar.tsx
│   └── GenerateAliasModal.tsx
├── hooks/
│   └── useAuth.ts              # Auth state management
└── lib/
    ├── crypto.ts               # Client-side encryption
    ├── api.ts                  # API client
    ├── auth.ts                 # Auth utilities
    └── utils.ts                # Helpers
```

## Security

- All sensitive data is encrypted client-side before being sent to the server
- Master password is stored only in `sessionStorage` (cleared on tab close)
- Server stores only the hash of the derived auth key, never the master password
- AES-256-GCM encryption with PBKDF2 key derivation (310,000 iterations)

## API Endpoints

The dashboard communicates with these backend endpoints:

### Auth
- `POST /auth/register` - Register with email, password, salt, authKeyHash
- `POST /auth/login` - Login with email/password
- `POST /auth/verify-master` - Verify master password
- `GET /auth/me` - Get current user

### Aliases
- `GET /aliases/user-aliases` - Get user's aliases
- `POST /aliases/generate` - Generate new alias
- `POST /aliases/sync-aliases` - Sync aliases to server
- `DELETE /aliases/:id` - Delete an alias

### Emails
- `GET /emails/alias-emails/:aliasId` - Get emails for an alias
- `GET /emails/:id` - Get single email

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint
npm run lint
```

## License

MIT

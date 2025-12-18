# Smart Interview Simulator

A web platform that simulates real technical and behavioral interviews, providing structured feedback to improve interview readiness.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Phase](https://img.shields.io/badge/phase-1%20(Foundation)-green.svg)

## 🎯 Overview

Smart Interview Simulator helps engineering students, early-career developers, and career switchers prepare for technical interviews through:

- **Role-based interviews** - Questions tailored to Frontend, Backend, Full Stack, DevOps, and Data roles
- **Timed sessions** - Practice under real interview pressure
- **Structured feedback** - Detailed analysis of your answers with improvement suggestions
- **Progress tracking** - Monitor your improvement over time

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/shukla-shashwat/SIS.git
   cd SIS
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```
   
   Or manually:
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

3. **Configure environment**
   ```bash
   cd server
   cp .env.example .env
   ```
   
   Edit `.env` and set your JWT secret:
   ```
   JWT_SECRET=your-secure-random-string
   ```

4. **Initialize database**
   ```bash
   cd server
   npm run db:init
   ```

5. **Start development servers**
   
   From the root directory:
   ```bash
   npm run dev
   ```
   
   This starts both frontend (port 5173) and backend (port 5000).

6. **Open the app**
   
   Navigate to [http://localhost:5173](http://localhost:5173)

## 📁 Project Structure

```
SIS/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React context (Auth)
│   │   ├── pages/          # Page components
│   │   └── services/       # API service layer
│   └── ...
├── server/                 # Express backend
│   ├── src/
│   │   ├── db/            # Database connection & initialization
│   │   ├── middleware/    # Auth & validation middleware
│   │   ├── routes/        # API routes
│   │   └── services/      # Business logic (feedback)
│   └── ...
└── package.json           # Root package (dev scripts)
```

## 🛠️ Tech Stack

### Frontend
- React 18
- React Router v6
- Tailwind CSS
- Axios
- Lucide Icons

### Backend
- Node.js + Express
- SQLite (better-sqlite3)
- JWT Authentication
- bcrypt for password hashing

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get user profile |
| PUT | `/api/users/profile` | Update profile |
| GET | `/api/users/stats` | Get performance stats |

### Interviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interviews/start` | Start new session |
| POST | `/api/interviews/:id/answer` | Submit answer |
| POST | `/api/interviews/:id/complete` | Complete session |
| GET | `/api/interviews` | List sessions |
| GET | `/api/interviews/:id` | Get session details |
| DELETE | `/api/interviews/:id` | Delete session |

### Questions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/questions` | Get questions |
| GET | `/api/questions/topics` | Get topics |
| GET | `/api/questions/roles` | Get available roles |

## 📊 Features

### Phase 1 (Current) ✅
- [x] User authentication (register/login)
- [x] Dashboard with performance overview
- [x] Profile management (role, experience, tech stack)
- [x] Interview session with timed questions
- [x] Rule-based feedback system
- [x] Interview history
- [x] Score tracking and trends
- [x] Static question bank (20+ questions)

### Phase 2 (Planned)
- [ ] LangChain-powered question retrieval
- [ ] Dynamic question selection
- [ ] Difficulty tagging improvements

### Phase 3 (Planned)
- [ ] Adaptive interview agent
- [ ] Follow-up questions
- [ ] Topic switching based on performance

### Phase 4 (Planned)
- [ ] ML-based scoring
- [ ] Readiness prediction
- [ ] Confidence pattern detection

## 🧪 Development

### Running Tests
```bash
# Frontend tests
cd client && npm test

# Backend tests
cd server && npm test
```

### Database Reset
```bash
cd server
rm -rf data/sis.db
npm run db:init
```

### Adding Questions
Edit `server/src/db/init.js` and add questions to the `questions` array, then reinitialize the database.

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

Built with ❤️ for interview preparation
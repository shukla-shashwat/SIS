require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('./connection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

console.log('Initializing database...');

// Create tables
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    target_role TEXT,
    experience_level TEXT,
    tech_stack TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Interview sessions table
  CREATE TABLE IF NOT EXISTS interview_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    tech_stack TEXT,
    difficulty TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'in_progress',
    total_questions INTEGER DEFAULT 0,
    answered_questions INTEGER DEFAULT 0,
    score REAL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Questions table (static question bank)
  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    role TEXT NOT NULL,
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    question_text TEXT NOT NULL,
    expected_keywords TEXT,
    ideal_answer TEXT,
    time_limit INTEGER DEFAULT 300,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Session answers table
  CREATE TABLE IF NOT EXISTS session_answers (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    answer_text TEXT,
    time_taken INTEGER,
    score REAL,
    feedback TEXT,
    strengths TEXT,
    weaknesses TEXT,
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );

  -- Session feedback (overall session feedback)
  CREATE TABLE IF NOT EXISTS session_feedback (
    id TEXT PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    overall_score REAL,
    topic_scores TEXT,
    strengths TEXT,
    weaknesses TEXT,
    recommendations TEXT,
    readiness_score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON interview_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_questions_role ON questions(role);
  CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
  CREATE INDEX IF NOT EXISTS idx_answers_session ON session_answers(session_id);
`);

console.log('Tables created successfully.');

// Seed questions
const seedQuestions = () => {
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM questions').get();
  
  if (existingCount.count > 0) {
    console.log('Questions already seeded. Skipping...');
    return;
  }

  console.log('Seeding question bank...');
  
  const questions = [
    // JavaScript - Frontend Developer
    {
      category: 'technical',
      role: 'frontend',
      topic: 'JavaScript Fundamentals',
      difficulty: 'easy',
      question_text: 'Explain the difference between var, let, and const in JavaScript.',
      expected_keywords: 'scope,hoisting,block,function,reassign,redeclare,temporal dead zone',
      ideal_answer: 'var is function-scoped and hoisted, let is block-scoped and not hoisted, const is block-scoped, not hoisted, and cannot be reassigned after declaration.',
      time_limit: 180
    },
    {
      category: 'technical',
      role: 'frontend',
      topic: 'JavaScript Fundamentals',
      difficulty: 'medium',
      question_text: 'What is a closure in JavaScript? Provide an example use case.',
      expected_keywords: 'function,scope,outer,inner,lexical,private,encapsulation,remember,access',
      ideal_answer: 'A closure is a function that has access to variables from its outer (enclosing) function scope even after the outer function has returned. Use cases include data privacy, creating factory functions, and maintaining state.',
      time_limit: 240
    },
    {
      category: 'technical',
      role: 'frontend',
      topic: 'JavaScript Fundamentals',
      difficulty: 'hard',
      question_text: 'Explain the event loop in JavaScript. How do microtasks and macrotasks differ?',
      expected_keywords: 'call stack,callback queue,microtask,macrotask,promise,setTimeout,async,single-threaded,priority',
      ideal_answer: 'The event loop handles asynchronous operations by checking if the call stack is empty and then processing tasks from queues. Microtasks (Promises) have higher priority than macrotasks (setTimeout, setInterval) and are processed before the next macrotask.',
      time_limit: 300
    },
    {
      category: 'technical',
      role: 'frontend',
      topic: 'React',
      difficulty: 'easy',
      question_text: 'What is the virtual DOM and why does React use it?',
      expected_keywords: 'representation,memory,diff,reconciliation,performance,real DOM,update,efficient',
      ideal_answer: 'The virtual DOM is an in-memory representation of the real DOM. React uses it to improve performance by calculating the minimum number of changes needed and batching updates to the real DOM.',
      time_limit: 180
    },
    {
      category: 'technical',
      role: 'frontend',
      topic: 'React',
      difficulty: 'medium',
      question_text: 'Explain the useEffect hook and its cleanup function.',
      expected_keywords: 'side effects,lifecycle,mount,unmount,dependencies,cleanup,subscription,memory leak',
      ideal_answer: 'useEffect handles side effects in functional components. It runs after render and can optionally return a cleanup function that runs before the component unmounts or before the effect runs again. Dependencies array controls when the effect re-runs.',
      time_limit: 240
    },
    {
      category: 'technical',
      role: 'frontend',
      topic: 'React',
      difficulty: 'hard',
      question_text: 'How would you optimize a React application that is rendering slowly?',
      expected_keywords: 'memo,useMemo,useCallback,lazy,suspense,virtualization,profiler,code splitting,shouldComponentUpdate',
      ideal_answer: 'Optimization strategies include: React.memo for preventing unnecessary re-renders, useMemo/useCallback for expensive computations, lazy loading with Suspense, virtualization for long lists, code splitting, using the React Profiler to identify bottlenecks, and proper key usage in lists.',
      time_limit: 300
    },
    
    // Backend Developer
    {
      category: 'technical',
      role: 'backend',
      topic: 'APIs',
      difficulty: 'easy',
      question_text: 'What is REST and what are its key principles?',
      expected_keywords: 'stateless,client-server,uniform interface,cacheable,HTTP methods,resources,endpoints',
      ideal_answer: 'REST (Representational State Transfer) is an architectural style for APIs. Key principles include: stateless communication, client-server separation, uniform interface using HTTP methods, cacheability, and resource-based URLs.',
      time_limit: 180
    },
    {
      category: 'technical',
      role: 'backend',
      topic: 'APIs',
      difficulty: 'medium',
      question_text: 'How would you handle authentication and authorization in a REST API?',
      expected_keywords: 'JWT,token,session,OAuth,middleware,bearer,refresh token,roles,permissions',
      ideal_answer: 'Common approaches include JWT tokens (stateless), session-based auth (stateful), or OAuth for third-party auth. Implementation involves middleware that validates tokens, checks permissions, and protects routes. Refresh tokens help maintain security while improving UX.',
      time_limit: 300
    },
    {
      category: 'technical',
      role: 'backend',
      topic: 'Databases',
      difficulty: 'medium',
      question_text: 'Explain the difference between SQL and NoSQL databases. When would you use each?',
      expected_keywords: 'relational,schema,ACID,scalability,flexibility,document,structured,unstructured,joins',
      ideal_answer: 'SQL databases are relational with fixed schemas, ACID compliance, and good for complex queries with joins. NoSQL databases offer flexible schemas, horizontal scalability, and are better for unstructured data. Use SQL for transactional data with relationships, NoSQL for high-volume, flexible data structures.',
      time_limit: 240
    },
    {
      category: 'technical',
      role: 'backend',
      topic: 'Databases',
      difficulty: 'hard',
      question_text: 'How would you design a database schema for a social media application with users, posts, and comments?',
      expected_keywords: 'normalization,foreign key,index,one-to-many,many-to-many,relationships,primary key,constraints',
      ideal_answer: 'Design would include: Users table (id, email, name), Posts table (id, user_id FK, content, timestamp), Comments table (id, post_id FK, user_id FK, content, timestamp). Add indexes on foreign keys and frequently queried columns. Consider denormalization for read-heavy operations.',
      time_limit: 360
    },

    // Full Stack
    {
      category: 'technical',
      role: 'fullstack',
      topic: 'Architecture',
      difficulty: 'medium',
      question_text: 'Explain the MVC pattern and how it applies to web applications.',
      expected_keywords: 'model,view,controller,separation,concerns,data,presentation,logic,request',
      ideal_answer: 'MVC separates application into Model (data/business logic), View (presentation/UI), and Controller (handles requests, coordinates Model and View). In web apps, the server typically has Models and Controllers, while the frontend serves as the View layer.',
      time_limit: 240
    },
    {
      category: 'technical',
      role: 'fullstack',
      topic: 'Architecture',
      difficulty: 'hard',
      question_text: 'How would you design a real-time notification system for a web application?',
      expected_keywords: 'WebSocket,polling,Server-Sent Events,pub/sub,Redis,queue,scalability,fallback',
      ideal_answer: 'Use WebSockets for bidirectional real-time communication, with SSE or long-polling as fallbacks. Implement pub/sub pattern with Redis for scalability across multiple servers. Use message queues for reliability. Consider notification preferences and batching for UX.',
      time_limit: 360
    },

    // Behavioral Questions
    {
      category: 'behavioral',
      role: 'any',
      topic: 'Problem Solving',
      difficulty: 'medium',
      question_text: 'Tell me about a time you had to debug a difficult issue. What was your approach?',
      expected_keywords: 'systematic,reproduce,isolate,logs,hypothesis,testing,root cause,solution,learned',
      ideal_answer: 'A good answer includes: describing the problem, systematic debugging approach (reproduce, isolate, hypothesize, test), tools/techniques used, collaboration if applicable, the solution found, and lessons learned.',
      time_limit: 300
    },
    {
      category: 'behavioral',
      role: 'any',
      topic: 'Teamwork',
      difficulty: 'medium',
      question_text: 'Describe a situation where you disagreed with a team member. How did you handle it?',
      expected_keywords: 'listen,understand,perspective,compromise,data,communication,resolution,respect,outcome',
      ideal_answer: 'Strong answers show: active listening, understanding the other perspective, presenting your viewpoint with data/reasoning, finding common ground, reaching a constructive resolution, and maintaining professional relationships.',
      time_limit: 300
    },
    {
      category: 'behavioral',
      role: 'any',
      topic: 'Growth',
      difficulty: 'easy',
      question_text: 'How do you stay updated with new technologies and industry trends?',
      expected_keywords: 'learning,courses,documentation,community,projects,blogs,conferences,practice,experiment',
      ideal_answer: 'Good answers mention: reading documentation and blogs, taking online courses, following industry leaders, participating in communities, building personal projects, attending meetups/conferences, and hands-on experimentation.',
      time_limit: 180
    },
    {
      category: 'behavioral',
      role: 'any',
      topic: 'Project Management',
      difficulty: 'medium',
      question_text: 'Describe a project you led or significantly contributed to. What was your role and impact?',
      expected_keywords: 'responsibility,planning,execution,challenges,collaboration,results,metrics,learned',
      ideal_answer: 'Strong answers include: clear role description, project goals, planning and execution approach, challenges faced and overcome, collaboration with others, measurable results/impact, and lessons learned.',
      time_limit: 300
    },

    // System Design
    {
      category: 'technical',
      role: 'fullstack',
      topic: 'System Design',
      difficulty: 'hard',
      question_text: 'How would you design a URL shortener service like bit.ly?',
      expected_keywords: 'hash,database,redirect,cache,analytics,scalability,collision,base62,distributed',
      ideal_answer: 'Key components: URL encoding (base62 hash or counter), database for mappings, redirect service (301/302), caching layer (Redis), analytics tracking. Consider: collision handling, custom URLs, expiration, rate limiting, and horizontal scaling.',
      time_limit: 420
    },
    {
      category: 'technical',
      role: 'backend',
      topic: 'System Design',
      difficulty: 'hard',
      question_text: 'Explain how you would implement rate limiting in an API.',
      expected_keywords: 'token bucket,sliding window,Redis,middleware,headers,429,distributed,quota',
      ideal_answer: 'Algorithms: token bucket, sliding window, fixed window. Implementation: middleware checking request count, Redis for distributed systems, return 429 status with retry headers. Consider: per-user vs global limits, different tiers, graceful degradation.',
      time_limit: 300
    }
  ];

  const insert = db.prepare(`
    INSERT INTO questions (id, category, role, topic, difficulty, question_text, expected_keywords, ideal_answer, time_limit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((questions) => {
    for (const q of questions) {
      insert.run(
        uuidv4(),
        q.category,
        q.role,
        q.topic,
        q.difficulty,
        q.question_text,
        q.expected_keywords,
        q.ideal_answer,
        q.time_limit
      );
    }
  });

  insertMany(questions);
  console.log(`Seeded ${questions.length} questions.`);
};

seedQuestions();

console.log('Database initialization complete!');
process.exit(0);

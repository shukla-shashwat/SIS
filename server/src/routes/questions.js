const express = require('express');
const db = require('../db/connection');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /api/questions - Get questions for interview
router.get('/', (req, res) => {
  try {
    const { role, category, difficulty, limit = 10 } = req.query;

    let query = 'SELECT id, category, role, topic, difficulty, question_text, time_limit FROM questions WHERE 1=1';
    const params = [];

    if (role && role !== 'any') {
      query += ' AND (role = ? OR role = ?)';
      params.push(role, 'any');
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (difficulty) {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }

    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(parseInt(limit));

    const questions = db.prepare(query).all(...params);

    res.json({ questions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// GET /api/questions/topics - Get available topics
router.get('/topics', (req, res) => {
  try {
    const { role } = req.query;

    let query = `
      SELECT DISTINCT topic, role, category, COUNT(*) as count
      FROM questions
    `;
    const params = [];

    if (role && role !== 'any') {
      query += ' WHERE role = ? OR role = ?';
      params.push(role, 'any');
    }

    query += ' GROUP BY topic, role, category ORDER BY topic';

    const topics = db.prepare(query).all(...params);

    res.json({ topics });
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({ error: 'Failed to get topics' });
  }
});

// GET /api/questions/roles - Get available roles
router.get('/roles', (req, res) => {
  try {
    const roles = [
      { id: 'frontend', name: 'Frontend Developer', description: 'React, JavaScript, CSS, HTML' },
      { id: 'backend', name: 'Backend Developer', description: 'Node.js, APIs, Databases' },
      { id: 'fullstack', name: 'Full Stack Developer', description: 'Frontend + Backend' },
      { id: 'devops', name: 'DevOps Engineer', description: 'CI/CD, Cloud, Infrastructure' },
      { id: 'data', name: 'Data Engineer', description: 'Data pipelines, SQL, Python' }
    ];

    // Get question counts per role
    const counts = db.prepare(`
      SELECT role, COUNT(*) as count FROM questions GROUP BY role
    `).all();

    const countMap = counts.reduce((acc, c) => {
      acc[c.role] = c.count;
      return acc;
    }, {});

    const rolesWithCounts = roles.map(r => ({
      ...r,
      questionCount: countMap[r.id] || 0
    }));

    res.json({ roles: rolesWithCounts });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

module.exports = router;

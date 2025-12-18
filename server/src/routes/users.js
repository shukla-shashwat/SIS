const express = require('express');
const { body } = require('express-validator');
const db = require('../db/connection');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Validation rules
const profileValidation = [
  body('targetRole').optional().isIn(['frontend', 'backend', 'fullstack', 'devops', 'data']),
  body('experienceLevel').optional().isIn(['student', 'junior', 'mid', 'senior']),
  body('techStack').optional().isArray(),
];

// GET /api/users/profile
router.get('/profile', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, email, name, target_role, experience_level, tech_stack, created_at, updated_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get interview stats
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
        AVG(CASE WHEN status = 'completed' THEN score END) as avg_score
      FROM interview_sessions 
      WHERE user_id = ?
    `).get(req.user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        targetRole: user.target_role,
        experienceLevel: user.experience_level,
        techStack: user.tech_stack ? JSON.parse(user.tech_stack) : [],
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      stats: {
        totalSessions: stats.total_sessions || 0,
        completedSessions: stats.completed_sessions || 0,
        avgScore: stats.avg_score ? Math.round(stats.avg_score * 10) / 10 : null
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// PUT /api/users/profile
router.put('/profile', profileValidation, validate, (req, res) => {
  try {
    const { name, targetRole, experienceLevel, techStack } = req.body;
    
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (targetRole !== undefined) {
      updates.push('target_role = ?');
      values.push(targetRole);
    }
    if (experienceLevel !== undefined) {
      updates.push('experience_level = ?');
      values.push(experienceLevel);
    }
    if (techStack !== undefined) {
      updates.push('tech_stack = ?');
      values.push(JSON.stringify(techStack));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.user.id);

    db.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);

    // Return updated user
    const user = db.prepare(`
      SELECT id, email, name, target_role, experience_level, tech_stack
      FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        targetRole: user.target_role,
        experienceLevel: user.experience_level,
        techStack: user.tech_stack ? JSON.parse(user.tech_stack) : []
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/users/stats
router.get('/stats', (req, res) => {
  try {
    // Overall stats
    const overall = db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
        AVG(CASE WHEN status = 'completed' THEN score END) as avg_score,
        MAX(CASE WHEN status = 'completed' THEN score END) as best_score
      FROM interview_sessions 
      WHERE user_id = ?
    `).get(req.user.id);

    // Recent sessions
    const recentSessions = db.prepare(`
      SELECT id, role, difficulty, status, score, started_at, completed_at
      FROM interview_sessions 
      WHERE user_id = ?
      ORDER BY started_at DESC
      LIMIT 5
    `).all(req.user.id);

    // Score trend (last 10 completed sessions)
    const scoreTrend = db.prepare(`
      SELECT score, completed_at
      FROM interview_sessions 
      WHERE user_id = ? AND status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 10
    `).all(req.user.id).reverse();

    // Topic performance
    const topicPerformance = db.prepare(`
      SELECT 
        q.topic,
        AVG(sa.score) as avg_score,
        COUNT(*) as question_count
      FROM session_answers sa
      JOIN questions q ON sa.question_id = q.id
      JOIN interview_sessions s ON sa.session_id = s.id
      WHERE s.user_id = ?
      GROUP BY q.topic
    `).all(req.user.id);

    res.json({
      overall: {
        totalSessions: overall.total_sessions || 0,
        completedSessions: overall.completed_sessions || 0,
        avgScore: overall.avg_score ? Math.round(overall.avg_score * 10) / 10 : null,
        bestScore: overall.best_score ? Math.round(overall.best_score * 10) / 10 : null
      },
      recentSessions,
      scoreTrend,
      topicPerformance
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;

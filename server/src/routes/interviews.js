const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const feedbackService = require('../services/feedback');
const aiServices = require('../services/ai');

const router = express.Router();

// All routes require authentication
router.use(auth);

// POST /api/interviews/start - Start a new interview session
router.post('/start', [
  body('role').isIn(['frontend', 'backend', 'fullstack', 'devops', 'data']).withMessage('Invalid role'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard', 'adaptive']).withMessage('Invalid difficulty'),
  body('questionCount').optional().isInt({ min: 3, max: 20 }).withMessage('Question count must be 3-20'),
], validate, async (req, res) => {
  try {
    const { role, difficulty = 'medium', questionCount = 5 } = req.body;
    const isAdaptive = difficulty === 'adaptive';
    const actualDifficulty = isAdaptive ? 'medium' : difficulty;

    // Create session first
    const sessionId = uuidv4();
    
    let questions;
    let selectionMethod = 'static';

    // Try AI-powered question selection
    if (aiServices.isAIEnabled()) {
      try {
        const selectedQuestions = await aiServices.questionSelector.selectQuestionsForSession({
          role,
          difficulty: actualDifficulty,
          answeredQuestionIds: [],
          totalQuestions: questionCount,
          recentScores: []
        }, questionCount);

        if (selectedQuestions.length > 0) {
          questions = selectedQuestions.map(q => ({
            id: q.id,
            category: q.metadata.category,
            role: q.metadata.role,
            topic: q.metadata.topic,
            difficulty: q.metadata.difficulty,
            question_text: q.content,
            time_limit: q.metadata.timeLimit,
            expected_keywords: q.metadata.expectedKeywords.join(','),
            ideal_answer: q.metadata.idealAnswer
          }));
          selectionMethod = 'ai';
        }
      } catch (error) {
        console.error('AI question selection failed, using fallback:', error.message);
      }
    }

    // Fallback to static selection
    if (!questions || questions.length === 0) {
      let query = `
        SELECT id, category, role, topic, difficulty, question_text, time_limit, expected_keywords, ideal_answer
        FROM questions 
        WHERE (role = ? OR role = 'any')
      `;
      const params = [role];

      if (!isAdaptive) {
        query += ' AND difficulty = ?';
        params.push(actualDifficulty);
      }

      query += ' ORDER BY RANDOM() LIMIT ?';
      params.push(parseInt(questionCount));

      questions = db.prepare(query).all(...params);
    }

    if (questions.length === 0) {
      return res.status(400).json({ error: 'No questions available for this role' });
    }

    // Save session
    db.prepare(`
      INSERT INTO interview_sessions (id, user_id, role, difficulty, total_questions, status)
      VALUES (?, ?, ?, ?, ?, 'in_progress')
    `).run(sessionId, req.user.id, role, isAdaptive ? 'adaptive' : actualDifficulty, questions.length);

    res.status(201).json({
      session: {
        id: sessionId,
        role,
        difficulty: isAdaptive ? 'adaptive' : actualDifficulty,
        totalQuestions: questions.length,
        status: 'in_progress',
        selectionMethod,
        aiEnabled: aiServices.isAIEnabled()
      },
      questions: questions.map((q, index) => ({
        id: q.id,
        index: index + 1,
        category: q.category,
        topic: q.topic,
        difficulty: q.difficulty,
        text: q.question_text,
        questionText: q.question_text, // kept for backwards compatibility
        timeLimit: q.time_limit
      }))
    });
  } catch (error) {
    console.error('Start interview error:', error);
    res.status(500).json({ error: 'Failed to start interview' });
  }
});

// POST /api/interviews/:sessionId/answer - Submit an answer
router.post('/:sessionId/answer', [
  body('questionId').notEmpty().withMessage('Question ID is required'),
  body('answerText').notEmpty().withMessage('Answer is required'),
  body('timeTaken').optional().isInt({ min: 0 }).withMessage('Invalid time'),
], validate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, answerText, timeTaken } = req.body;

    // Verify session belongs to user and is in progress
    const session = db.prepare(`
      SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?
    `).get(sessionId, req.user.id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'in_progress') {
      return res.status(400).json({ error: 'Session is not in progress' });
    }

    // Get the question
    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if already answered
    const existingAnswer = db.prepare(`
      SELECT id FROM session_answers WHERE session_id = ? AND question_id = ?
    `).get(sessionId, questionId);

    if (existingAnswer) {
      return res.status(400).json({ error: 'Question already answered' });
    }

    // Evaluate the answer (AI or rule-based)
    let evaluation;
    let evaluationMethod = 'rules';
    
    if (aiServices.isAIEnabled()) {
      try {
        evaluation = await aiServices.answerEvaluator.evaluateAnswer(answerText, question, timeTaken);
        evaluationMethod = evaluation.evaluationMethod || 'ai';
      } catch (error) {
        console.error('AI evaluation failed, using rules:', error.message);
        evaluation = feedbackService.evaluateAnswer(answerText, question);
        evaluationMethod = 'fallback';
      }
    } else {
      evaluation = feedbackService.evaluateAnswer(answerText, question);
    }

    // Save the answer
    const answerId = uuidv4();
    db.prepare(`
      INSERT INTO session_answers (id, session_id, question_id, answer_text, time_taken, score, feedback, strengths, weaknesses)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      answerId,
      sessionId,
      questionId,
      answerText,
      timeTaken || null,
      evaluation.score,
      evaluation.feedback,
      JSON.stringify(evaluation.strengths),
      JSON.stringify(evaluation.weaknesses)
    );

    // Update session progress
    db.prepare(`
      UPDATE interview_sessions 
      SET answered_questions = answered_questions + 1 
      WHERE id = ?
    `).run(sessionId);

    res.json({
      answerId,
      evaluationMethod,
      evaluation: {
        score: evaluation.score,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        suggestions: evaluation.suggestions,
        keywordScore: evaluation.keywordScore,
        matchedKeywords: evaluation.matchedKeywords,
        missedKeywords: evaluation.missedKeywords?.slice(0, 5) || []
      }
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// GET /api/interviews/:sessionId/next-question - Get next AI-selected question
router.get('/:sessionId/next-question', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session belongs to user
    const session = db.prepare(`
      SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?
    `).get(sessionId, req.user.id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Session already completed' });
    }

    // Check if we've reached the question limit
    if (session.answered_questions >= session.total_questions) {
      return res.json({ 
        complete: true, 
        message: 'All questions answered. Please complete the interview.' 
      });
    }

    // Get already answered question IDs
    const answeredQuestions = db.prepare(`
      SELECT question_id FROM session_answers WHERE session_id = ?
    `).all(sessionId).map(r => r.question_id);

    // Get session history for AI context
    const sessionHistory = db.prepare(`
      SELECT sa.score, q.topic, q.difficulty, q.category
      FROM session_answers sa
      JOIN questions q ON sa.question_id = q.id
      WHERE sa.session_id = ?
      ORDER BY sa.answered_at
    `).all(sessionId);

    // Get available questions for this role/difficulty
    let availableQuestions = db.prepare(`
      SELECT * FROM questions 
      WHERE role = ? AND difficulty IN (?, 'medium')
      ${answeredQuestions.length > 0 ? `AND id NOT IN (${answeredQuestions.map(() => '?').join(',')})` : ''}
      LIMIT 20
    `).all(session.role, session.difficulty, ...answeredQuestions);

    if (availableQuestions.length === 0) {
      return res.json({ 
        complete: true, 
        message: 'No more questions available. Please complete the interview.' 
      });
    }

    let selectedQuestion;
    let selectionMethod = 'random';

    // Try AI-powered selection
    if (aiServices.isAIEnabled()) {
      try {
        const result = await aiServices.questionSelector.selectNextQuestion({
          role: session.role,
          difficulty: session.difficulty,
          answeredQuestionIds: answeredQuestions,
          totalQuestions: session.total_questions,
          recentScores: sessionHistory.map(h => h.score)
        });
        if (result && result.question) {
          // Find the matching question from available questions
          selectedQuestion = availableQuestions.find(q => q.id === result.question.id) || result.question;
          selectionMethod = 'ai';
        }
      } catch (aiError) {
        console.error('AI question selection failed:', aiError.message);
      }
    }

    // Fallback to weighted random selection
    if (!selectedQuestion) {
      // Weighted selection based on performance
      const avgScore = sessionHistory.length > 0 
        ? sessionHistory.reduce((sum, h) => sum + h.score, 0) / sessionHistory.length 
        : 50;

      // If doing well, try harder questions; if struggling, try easier ones
      let targetDifficulty = session.difficulty;
      if (avgScore >= 80) {
        targetDifficulty = session.difficulty === 'easy' ? 'medium' : 'hard';
      } else if (avgScore < 50) {
        targetDifficulty = session.difficulty === 'hard' ? 'medium' : 'easy';
      }

      // Try to find questions matching target difficulty
      const targetQuestions = availableQuestions.filter(q => q.difficulty === targetDifficulty);
      const pool = targetQuestions.length > 0 ? targetQuestions : availableQuestions;
      
      selectedQuestion = pool[Math.floor(Math.random() * pool.length)];
    }

    res.json({
      complete: false,
      selectionMethod,
      questionNumber: session.answered_questions + 1,
      totalQuestions: session.total_questions,
      question: {
        id: selectedQuestion.id,
        category: selectedQuestion.category,
        topic: selectedQuestion.topic,
        difficulty: selectedQuestion.difficulty,
        text: selectedQuestion.question_text,
        timeLimit: selectedQuestion.time_limit
      }
    });
  } catch (error) {
    console.error('Get next question error:', error);
    res.status(500).json({ error: 'Failed to get next question' });
  }
});

// POST /api/interviews/:sessionId/complete - Complete the interview
router.post('/:sessionId/complete', (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session
    const session = db.prepare(`
      SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?
    `).get(sessionId, req.user.id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Session already completed' });
    }

    // Get all answers with question data
    const answers = db.prepare(`
      SELECT sa.*, q.topic, q.category, q.difficulty
      FROM session_answers sa
      JOIN questions q ON sa.question_id = q.id
      WHERE sa.session_id = ?
    `).all(sessionId);

    // Calculate session feedback
    const sessionFeedback = feedbackService.calculateSessionFeedback(answers);

    // Update session
    db.prepare(`
      UPDATE interview_sessions 
      SET status = 'completed', score = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(sessionFeedback.overallScore, sessionId);

    // Save session feedback
    const feedbackId = uuidv4();
    db.prepare(`
      INSERT INTO session_feedback (id, session_id, overall_score, topic_scores, strengths, weaknesses, recommendations, readiness_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      feedbackId,
      sessionId,
      sessionFeedback.overallScore,
      JSON.stringify(sessionFeedback.topicScores),
      JSON.stringify(sessionFeedback.strengths),
      JSON.stringify(sessionFeedback.weaknesses),
      JSON.stringify(sessionFeedback.recommendations),
      sessionFeedback.readinessScore
    );

    res.json({
      message: 'Interview completed',
      feedback: {
        overallScore: sessionFeedback.overallScore,
        topicScores: sessionFeedback.topicScores,
        strengths: sessionFeedback.strengths,
        weaknesses: sessionFeedback.weaknesses,
        recommendations: sessionFeedback.recommendations,
        readinessScore: sessionFeedback.readinessScore,
        readinessLevel: feedbackService.getReadinessLevel(sessionFeedback.readinessScore)
      }
    });
  } catch (error) {
    console.error('Complete interview error:', error);
    res.status(500).json({ error: 'Failed to complete interview' });
  }
});

// GET /api/interviews - Get user's interview history
router.get('/', (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT s.*, sf.overall_score as feedback_score, sf.readiness_score
      FROM interview_sessions s
      LEFT JOIN session_feedback sf ON s.id = sf.session_id
      WHERE s.user_id = ?
    `;
    const params = [req.user.id];

    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }

    query += ' ORDER BY s.started_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const sessions = db.prepare(query).all(...params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM interview_sessions WHERE user_id = ?';
    const countParams = [req.user.id];
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      sessions: sessions.map(s => ({
        id: s.id,
        role: s.role,
        difficulty: s.difficulty,
        status: s.status,
        totalQuestions: s.total_questions,
        answeredQuestions: s.answered_questions,
        score: s.score,
        readinessScore: s.readiness_score,
        startedAt: s.started_at,
        completedAt: s.completed_at
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Get interviews error:', error);
    res.status(500).json({ error: 'Failed to get interviews' });
  }
});

// GET /api/interviews/:sessionId - Get session details
router.get('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get session
    const session = db.prepare(`
      SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?
    `).get(sessionId, req.user.id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get answers with questions
    const answers = db.prepare(`
      SELECT 
        sa.id, sa.answer_text, sa.time_taken, sa.score, sa.feedback, sa.strengths, sa.weaknesses, sa.answered_at,
        q.id as question_id, q.category, q.topic, q.difficulty, q.question_text, q.time_limit
      FROM session_answers sa
      JOIN questions q ON sa.question_id = q.id
      WHERE sa.session_id = ?
      ORDER BY sa.answered_at
    `).all(sessionId);

    // Get session feedback if completed
    let feedback = null;
    if (session.status === 'completed') {
      const sf = db.prepare('SELECT * FROM session_feedback WHERE session_id = ?').get(sessionId);
      if (sf) {
        feedback = {
          overallScore: sf.overall_score,
          topicScores: JSON.parse(sf.topic_scores || '{}'),
          strengths: JSON.parse(sf.strengths || '[]'),
          weaknesses: JSON.parse(sf.weaknesses || '[]'),
          recommendations: JSON.parse(sf.recommendations || '[]'),
          readinessScore: sf.readiness_score,
          readinessLevel: feedbackService.getReadinessLevel(sf.readiness_score)
        };
      }
    }

    res.json({
      session: {
        id: session.id,
        role: session.role,
        difficulty: session.difficulty,
        status: session.status,
        totalQuestions: session.total_questions,
        answeredQuestions: session.answered_questions,
        score: session.score,
        startedAt: session.started_at,
        completedAt: session.completed_at
      },
      answers: answers.map(a => ({
        id: a.id,
        question: {
          id: a.question_id,
          category: a.category,
          topic: a.topic,
          difficulty: a.difficulty,
          text: a.question_text,
          timeLimit: a.time_limit
        },
        answerText: a.answer_text,
        timeTaken: a.time_taken,
        score: a.score,
        feedback: a.feedback,
        strengths: JSON.parse(a.strengths || '[]'),
        weaknesses: JSON.parse(a.weaknesses || '[]'),
        answeredAt: a.answered_at
      })),
      feedback
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// DELETE /api/interviews/:sessionId - Delete a session
router.delete('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify ownership
    const session = db.prepare(`
      SELECT id FROM interview_sessions WHERE id = ? AND user_id = ?
    `).get(sessionId, req.user.id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Delete (cascades to answers and feedback)
    db.prepare('DELETE FROM interview_sessions WHERE id = ?').run(sessionId);

    res.json({ message: 'Session deleted' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

module.exports = router;

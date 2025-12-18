/**
 * Question Document Store
 * Manages questions as documents for intelligent retrieval
 */

const db = require('../../db/connection');

class QuestionStore {
  constructor() {
    this.questionsCache = null;
    this.lastCacheTime = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all questions as documents with metadata
   */
  getAllQuestions() {
    // Check cache
    if (this.questionsCache && this.lastCacheTime && 
        (Date.now() - this.lastCacheTime) < this.cacheTimeout) {
      return this.questionsCache;
    }

    const questions = db.prepare(`
      SELECT 
        id, category, role, topic, difficulty, 
        question_text, expected_keywords, ideal_answer, time_limit
      FROM questions
    `).all();

    // Transform to document format
    this.questionsCache = questions.map(q => ({
      id: q.id,
      content: q.question_text,
      metadata: {
        category: q.category,
        role: q.role,
        topic: q.topic,
        difficulty: q.difficulty,
        expectedKeywords: q.expected_keywords?.split(',').map(k => k.trim()) || [],
        idealAnswer: q.ideal_answer,
        timeLimit: q.time_limit
      }
    }));

    this.lastCacheTime = Date.now();
    return this.questionsCache;
  }

  /**
   * Get questions filtered by criteria
   */
  getFilteredQuestions({ role, difficulty, category, excludeIds = [] }) {
    const allQuestions = this.getAllQuestions();
    
    return allQuestions.filter(q => {
      // Exclude already asked questions
      if (excludeIds.includes(q.id)) return false;
      
      // Role filter (match specific role or 'any')
      if (role && q.metadata.role !== role && q.metadata.role !== 'any') return false;
      
      // Difficulty filter
      if (difficulty && q.metadata.difficulty !== difficulty) return false;
      
      // Category filter
      if (category && q.metadata.category !== category) return false;
      
      return true;
    });
  }

  /**
   * Get questions grouped by topic
   */
  getQuestionsByTopic(role) {
    const questions = this.getFilteredQuestions({ role });
    const grouped = {};
    
    questions.forEach(q => {
      const topic = q.metadata.topic;
      if (!grouped[topic]) {
        grouped[topic] = [];
      }
      grouped[topic].push(q);
    });
    
    return grouped;
  }

  /**
   * Get a specific question by ID
   */
  getQuestionById(id) {
    const allQuestions = this.getAllQuestions();
    return allQuestions.find(q => q.id === id);
  }

  /**
   * Get topics covered in a session (for context)
   */
  getSessionTopicsCovered(answeredQuestionIds) {
    const allQuestions = this.getAllQuestions();
    const topics = new Set();
    
    answeredQuestionIds.forEach(id => {
      const q = allQuestions.find(q => q.id === id);
      if (q) {
        topics.add(q.metadata.topic);
      }
    });
    
    return Array.from(topics);
  }

  /**
   * Clear cache (call when questions are updated)
   */
  clearCache() {
    this.questionsCache = null;
    this.lastCacheTime = null;
  }
}

module.exports = new QuestionStore();

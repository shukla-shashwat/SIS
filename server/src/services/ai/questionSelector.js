/**
 * Intelligent Question Selector
 * Uses LangChain + Ollama (local Llama) to intelligently select the next question
 * based on session context, performance, and coverage
 */

const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { createModel, isAIEnabled, shouldFallback } = require('./config');
const questionStore = require('./questionStore');

// Prompt template for question selection - simplified for small models
const questionSelectionPrompt = PromptTemplate.fromTemplate(`
Pick one question ID from this list for a {role} {difficulty} interview:
{availableQuestions}

Reply with just the ID, nothing else.
`);

class QuestionSelector {
  constructor() {
    this.model = null;
    this.outputParser = new StringOutputParser();
  }

  /**
   * Initialize the AI model
   */
  initModel() {
    if (!this.model && isAIEnabled()) {
      this.model = createModel({ temperature: 0.2, numPredict: 40 });
    }
    return this.model;
  }

  /**
   * Select the next question using AI
   */
  async selectNextQuestion(sessionContext) {
    const {
      role,
      difficulty,
      answeredQuestionIds = [],
      totalQuestions,
      recentScores = []
    } = sessionContext;

    // Get available questions (excluding already asked)
    const availableQuestions = questionStore.getFilteredQuestions({
      role,
      difficulty,
      excludeIds: answeredQuestionIds
    });

    if (availableQuestions.length === 0) {
      // Fallback: get any questions for the role, regardless of difficulty
      const fallbackQuestions = questionStore.getFilteredQuestions({
        role,
        excludeIds: answeredQuestionIds
      });
      
      if (fallbackQuestions.length === 0) {
        return null; // No more questions available
      }
      
      // Random selection as last resort
      return this.randomSelect(fallbackQuestions);
    }

    // Try AI selection if enabled
    if (this.initModel()) {
      try {
        return await this.aiSelect(sessionContext, availableQuestions);
      } catch (error) {
        console.error('AI question selection failed:', error.message);
        if (shouldFallback()) {
          return this.smartFallbackSelect(sessionContext, availableQuestions);
        }
        throw error;
      }
    }

    // Use smart fallback if AI not enabled
    return this.smartFallbackSelect(sessionContext, availableQuestions);
  }

  /**
   * AI-powered question selection
   */
  async aiSelect(sessionContext, availableQuestions) {
    const {
      role,
      difficulty,
      answeredQuestionIds = [],
      totalQuestions,
      recentScores = []
    } = sessionContext;

    // Get topics already covered
    const topicsCovered = questionStore.getSessionTopicsCovered(answeredQuestionIds);
    
    // Format available questions for the prompt
    const formattedQuestions = availableQuestions.map(q => 
      `- ID: ${q.id} | Topic: ${q.metadata.topic} | Difficulty: ${q.metadata.difficulty} | Question: "${q.content.substring(0, 100)}..."`
    ).join('\n');

    // Calculate recent performance
    const avgScore = recentScores.length > 0 
      ? Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length)
      : null;
    const performanceDesc = avgScore === null ? 'No answers yet' :
      avgScore >= 70 ? `Strong (${avgScore}% avg)` :
      avgScore >= 50 ? `Moderate (${avgScore}% avg)` : `Needs improvement (${avgScore}% avg)`;

    // Create the chain
    const chain = questionSelectionPrompt.pipe(this.model).pipe(this.outputParser);

    // Get AI response
    const response = await chain.invoke({
      role,
      difficulty,
      availableQuestions: formattedQuestions
    });

    // Parse response - just look for a question ID in the text
    const responseText = response.trim();
    
    // Try to find any question ID from our list in the response
    let selectedQuestion = null;
    for (const q of availableQuestions) {
      if (responseText.includes(q.id)) {
        selectedQuestion = q;
        break;
      }
    }
    
    if (!selectedQuestion) {
      // If AI didn't return a valid ID, fall back to smart selection
      console.warn('AI returned invalid question ID, using fallback');
      return this.smartFallbackSelect(sessionContext, availableQuestions);
    }

    return {
      question: selectedQuestion,
      reasoning: 'AI selected',
      selectionMethod: 'ai'
    };
  }

  /**
   * Smart fallback selection without AI
   */
  smartFallbackSelect(sessionContext, availableQuestions) {
    const { answeredQuestionIds = [], recentScores = [] } = sessionContext;
    
    // Get topics already covered
    const topicsCovered = questionStore.getSessionTopicsCovered(answeredQuestionIds);
    
    // Prioritize questions from uncovered topics
    let candidates = availableQuestions.filter(q => 
      !topicsCovered.includes(q.metadata.topic)
    );
    
    // If all topics covered, use all available
    if (candidates.length === 0) {
      candidates = availableQuestions;
    }

    // Adjust for performance
    const avgScore = recentScores.length > 0 
      ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
      : 50;

    // Sort by difficulty appropriateness
    const difficultyOrder = avgScore >= 70 
      ? ['hard', 'medium', 'easy']
      : avgScore >= 50 
        ? ['medium', 'easy', 'hard']
        : ['easy', 'medium', 'hard'];

    candidates.sort((a, b) => {
      const aOrder = difficultyOrder.indexOf(a.metadata.difficulty);
      const bOrder = difficultyOrder.indexOf(b.metadata.difficulty);
      return aOrder - bOrder;
    });

    // Add some randomness among top candidates
    const topCandidates = candidates.slice(0, Math.min(3, candidates.length));
    const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    return {
      question: selected,
      reasoning: `Selected based on topic diversity and difficulty appropriateness`,
      suggestedDifficulty: selected.metadata.difficulty,
      selectionMethod: 'fallback'
    };
  }

  /**
   * Random selection (last resort)
   */
  randomSelect(questions) {
    const selected = questions[Math.floor(Math.random() * questions.length)];
    return {
      question: selected,
      reasoning: 'Randomly selected from available questions',
      suggestedDifficulty: selected.metadata.difficulty,
      selectionMethod: 'random'
    };
  }

  /**
   * Select multiple questions for a session
   */
  async selectQuestionsForSession(sessionContext, count) {
    const questions = [];
    const usedIds = [...(sessionContext.answeredQuestionIds || [])];
    const scores = [...(sessionContext.recentScores || [])];

    for (let i = 0; i < count; i++) {
      const result = await this.selectNextQuestion({
        ...sessionContext,
        answeredQuestionIds: usedIds,
        recentScores: scores
      });

      if (!result) break;

      questions.push(result.question);
      usedIds.push(result.question.id);
    }

    return questions;
  }
}

module.exports = new QuestionSelector();

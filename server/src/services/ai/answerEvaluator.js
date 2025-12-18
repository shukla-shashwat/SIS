/**
 * AI-Powered Answer Evaluator
 * Uses Ollama (local Llama) to provide nuanced, contextual feedback on interview answers
 */

const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { createModel, isAIEnabled, shouldFallback } = require('./config');
const ruleFeedback = require('../feedback');

// Evaluation prompt template - simplified for small models
const evaluationPrompt = PromptTemplate.fromTemplate(`
Score this interview answer from 0 to 100.
Question: {questionText}
Answer: {candidateAnswer}

Reply with just a number from 0 to 100.
`);

class AnswerEvaluator {
  constructor() {
    this.model = null;
    this.outputParser = new StringOutputParser();
  }

  /**
   * Initialize AI model
   */
  initModel() {
    if (!this.model && isAIEnabled()) {
      this.model = createModel({ temperature: 0.1, numPredict: 60 });
    }
    return this.model;
  }

  /**
   * Evaluate an answer using AI
   */
  async evaluateAnswer(answer, question, timeTaken = null) {
    // Always calculate rule-based evaluation first (as baseline and fallback)
    const ruleEvaluation = ruleFeedback.evaluateAnswer(answer, {
      expected_keywords: question.metadata?.expectedKeywords?.join(',') || question.expected_keywords || '',
      ideal_answer: question.metadata?.idealAnswer || question.ideal_answer || ''
    });

    // Try AI evaluation if enabled
    if (this.initModel()) {
      try {
        const aiEvaluation = await this.aiEvaluate(answer, question, timeTaken);
        
        // Blend AI and rule-based evaluations for robustness
        return this.blendEvaluations(aiEvaluation, ruleEvaluation);
      } catch (error) {
        console.error('AI evaluation failed:', error.message);
        if (shouldFallback()) {
          return {
            ...ruleEvaluation,
            evaluationMethod: 'fallback'
          };
        }
        throw error;
      }
    }

    return {
      ...ruleEvaluation,
      evaluationMethod: 'rules'
    };
  }

  /**
   * Perform AI-powered evaluation
   */
  async aiEvaluate(answer, question, timeTaken) {
    const questionText = question.content || question.question_text;

    // Create the chain
    const chain = evaluationPrompt.pipe(this.model).pipe(this.outputParser);

    // Get AI response
    const response = await chain.invoke({
      questionText,
      candidateAnswer: answer || '(No answer provided)'
    });

    // Parse score from response - just extract any number
    const numberMatch = response.match(/\d+/);
    const aiScore = numberMatch ? Math.min(100, Math.max(0, parseInt(numberMatch[0]))) : null;
    
    if (aiScore === null) {
      throw new Error('Could not extract score from AI response');
    }

    return {
      score: aiScore,
      feedback: 'Evaluated by AI',
      strengths: [],
      weaknesses: [],
      keyConceptsCovered: [],
      keyConceptsMissed: [],
      suggestions: [],
      evaluationMethod: 'ai'
    };
  }

  /**
   * Blend AI and rule-based evaluations for robustness
   */
  blendEvaluations(aiEval, ruleEval) {
    // Weight: 50% AI score, 50% rules (since AI only provides score now)
    const blendedScore = Math.round(aiEval.score * 0.5 + ruleEval.score * 0.5);

    return {
      score: blendedScore,
      feedback: ruleEval.feedback || 'Answer evaluated',
      strengths: ruleEval.strengths || [],
      weaknesses: ruleEval.weaknesses || [],
      suggestions: ruleEval.suggestions || [],
      matchedKeywords: ruleEval.matchedKeywords || [],
      missedKeywords: ruleEval.missedKeywords || [],
      keywordScore: ruleEval.keywordScore,
      wordCount: ruleEval.wordCount,
      evaluationMethod: 'ai-blended'
    };
  }
}

module.exports = new AnswerEvaluator();

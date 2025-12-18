/**
 * AI Services Index
 * Exports all AI-related services for Ollama (local Llama)
 */

const config = require('./config');
const questionStore = require('./questionStore');
const questionSelector = require('./questionSelector');
const answerEvaluator = require('./answerEvaluator');

module.exports = {
  // Configuration
  isAIEnabled: config.isAIEnabled,
  shouldFallback: config.shouldFallback,
  getOllamaBaseUrl: config.getOllamaBaseUrl,
  getModelName: config.getModelName,
  
  // Services
  questionStore,
  questionSelector,
  answerEvaluator
};

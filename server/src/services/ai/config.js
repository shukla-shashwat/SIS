/**
 * AI Configuration and Utilities
 * Centralized AI setup for the application using Ollama (local LLM)
 */

const { ChatOllama } = require('@langchain/ollama');

// Check if AI is enabled and Ollama is configured
const isAIEnabled = () => {
  return process.env.AI_ENABLED === 'true';
};

// Get Ollama base URL (default to localhost)
const getOllamaBaseUrl = () => {
  return process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
};

// Get the model name to use
const getModelName = () => {
  return process.env.OLLAMA_MODEL || 'llama3.2';
};

// Create a configured Ollama model instance
const createModel = (options = {}) => {
  if (!isAIEnabled()) {
    return null;
  }

  return new ChatOllama({
    baseUrl: getOllamaBaseUrl(),
    model: getModelName(),
    temperature: options.temperature ?? 0.3,
    numPredict: options.numPredict || 20,  // Very short for fast responses
  });
};

// Should fall back to rule-based system if AI fails
const shouldFallback = () => {
  return process.env.AI_FALLBACK_TO_RULES !== 'false';
};

module.exports = {
  isAIEnabled,
  createModel,
  shouldFallback,
  getOllamaBaseUrl,
  getModelName
};

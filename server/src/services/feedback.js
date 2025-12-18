/**
 * Feedback Service - Rule-based answer evaluation
 * Phase 1: No AI, just keyword matching and heuristics
 */

class FeedbackService {
  /**
   * Evaluate a single answer
   */
  evaluateAnswer(answer, question) {
    const answerText = (answer || '').toLowerCase().trim();
    const expectedKeywords = (question.expected_keywords || '').toLowerCase().split(',').map(k => k.trim());
    
    // Calculate keyword coverage
    const matchedKeywords = expectedKeywords.filter(keyword => 
      answerText.includes(keyword)
    );
    const keywordScore = expectedKeywords.length > 0 
      ? (matchedKeywords.length / expectedKeywords.length) * 100 
      : 0;

    // Calculate length score (reasonable answers are 50-500 words)
    const wordCount = answerText.split(/\s+/).filter(w => w.length > 0).length;
    let lengthScore = 0;
    if (wordCount >= 30 && wordCount <= 500) {
      lengthScore = 100;
    } else if (wordCount >= 15 && wordCount < 30) {
      lengthScore = 60;
    } else if (wordCount > 500) {
      lengthScore = 70;
    } else if (wordCount >= 5) {
      lengthScore = 40;
    }

    // Calculate structure score (has multiple sentences, uses technical terms)
    const sentenceCount = (answerText.match(/[.!?]+/g) || []).length;
    const hasStructure = sentenceCount >= 2;
    const structureScore = hasStructure ? 100 : 50;

    // Calculate overall score
    const overallScore = Math.round(
      (keywordScore * 0.5) + (lengthScore * 0.3) + (structureScore * 0.2)
    );

    // Generate feedback
    const strengths = [];
    const weaknesses = [];

    if (keywordScore >= 70) {
      strengths.push('Good coverage of key concepts');
    } else if (keywordScore >= 40) {
      weaknesses.push('Some important concepts were missing');
    } else {
      weaknesses.push('Many key concepts were not addressed');
    }

    if (lengthScore >= 80) {
      strengths.push('Answer has good depth and detail');
    } else if (wordCount < 30) {
      weaknesses.push('Answer could be more detailed');
    } else if (wordCount > 500) {
      weaknesses.push('Answer could be more concise');
    }

    if (hasStructure) {
      strengths.push('Well-structured response');
    } else {
      weaknesses.push('Consider structuring your answer with multiple points');
    }

    // Generate improvement suggestions
    const missedKeywords = expectedKeywords.filter(k => !answerText.includes(k));
    const suggestions = [];
    
    if (missedKeywords.length > 0) {
      suggestions.push(`Consider discussing: ${missedKeywords.slice(0, 3).join(', ')}`);
    }
    
    if (wordCount < 30) {
      suggestions.push('Provide more examples and explanations');
    }

    if (!hasStructure) {
      suggestions.push('Break your answer into clear points or steps');
    }

    return {
      score: overallScore,
      keywordScore: Math.round(keywordScore),
      matchedKeywords,
      missedKeywords,
      wordCount,
      strengths,
      weaknesses,
      suggestions,
      feedback: this.generateFeedbackText(overallScore, strengths, weaknesses)
    };
  }

  /**
   * Generate human-readable feedback text
   */
  generateFeedbackText(score, strengths, weaknesses) {
    let feedback = '';
    
    if (score >= 80) {
      feedback = 'Excellent answer! ';
    } else if (score >= 60) {
      feedback = 'Good answer with room for improvement. ';
    } else if (score >= 40) {
      feedback = 'Decent attempt, but needs more depth. ';
    } else {
      feedback = 'This answer needs significant improvement. ';
    }

    if (strengths.length > 0) {
      feedback += `Strengths: ${strengths.join(', ')}. `;
    }

    if (weaknesses.length > 0) {
      feedback += `Areas to improve: ${weaknesses.join(', ')}.`;
    }

    return feedback;
  }

  /**
   * Calculate overall session feedback
   */
  calculateSessionFeedback(answers) {
    if (!answers || answers.length === 0) {
      return {
        overallScore: 0,
        topicScores: {},
        strengths: [],
        weaknesses: [],
        recommendations: [],
        readinessScore: 0
      };
    }

    // Calculate overall score
    const validScores = answers.filter(a => a.score !== null);
    const overallScore = validScores.length > 0
      ? Math.round(validScores.reduce((sum, a) => sum + a.score, 0) / validScores.length)
      : 0;

    // Calculate topic scores
    const topicScores = {};
    answers.forEach(a => {
      if (a.topic) {
        if (!topicScores[a.topic]) {
          topicScores[a.topic] = { total: 0, count: 0 };
        }
        topicScores[a.topic].total += a.score || 0;
        topicScores[a.topic].count += 1;
      }
    });

    Object.keys(topicScores).forEach(topic => {
      topicScores[topic] = Math.round(topicScores[topic].total / topicScores[topic].count);
    });

    // Identify strengths (topics with score >= 70)
    const strengths = Object.entries(topicScores)
      .filter(([_, score]) => score >= 70)
      .map(([topic]) => topic);

    // Identify weaknesses (topics with score < 50)
    const weaknesses = Object.entries(topicScores)
      .filter(([_, score]) => score < 50)
      .map(([topic]) => topic);

    // Generate recommendations
    const recommendations = [];
    
    if (weaknesses.length > 0) {
      recommendations.push(`Focus on improving: ${weaknesses.join(', ')}`);
    }

    if (overallScore < 50) {
      recommendations.push('Review fundamental concepts and practice more');
    } else if (overallScore < 70) {
      recommendations.push('Good foundation, now work on depth and examples');
    } else {
      recommendations.push('Strong performance! Try harder difficulty questions');
    }

    // Calculate readiness score (0-100)
    const readinessScore = Math.min(100, Math.round(
      (overallScore * 0.6) + 
      (Math.min(answers.length, 10) * 4) // Bonus for completing more questions
    ));

    return {
      overallScore,
      topicScores,
      strengths,
      weaknesses,
      recommendations,
      readinessScore
    };
  }

  /**
   * Get readiness level text
   */
  getReadinessLevel(score) {
    if (score >= 80) return 'Interview Ready';
    if (score >= 60) return 'Almost Ready';
    if (score >= 40) return 'Needs Practice';
    return 'Keep Learning';
  }
}

module.exports = new FeedbackService();

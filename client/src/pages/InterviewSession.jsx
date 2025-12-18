import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { interviewAPI } from '../services/api';
import { 
  Clock, 
  Send, 
  ChevronRight, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Lightbulb,
  Sparkles
} from 'lucide-react';

const InterviewSession = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [session, setSession] = useState(location.state?.session || null);
  const [currentQuestion, setCurrentQuestion] = useState(location.state?.questions?.[0] || null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(location.state?.questions?.length || 5);
  const [answer, setAnswer] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeStarted, setTimeStarted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [evaluationMethod, setEvaluationMethod] = useState(null);
  const [selectionMethod, setSelectionMethod] = useState(null);
  const [loading, setLoading] = useState(!location.state);
  const [error, setError] = useState('');

  // Fetch session data if not passed via state
  useEffect(() => {
    if (!location.state) {
      fetchSession();
    } else if (location.state?.questions?.[0]) {
      // Set initial question from state
      setCurrentQuestion(location.state.questions[0]);
      setTotalQuestions(location.state.session?.totalQuestions || location.state.questions.length);
    }
  }, [sessionId]);

  // Timer effect
  useEffect(() => {
    if (currentQuestion && !feedback) {
      setTimeRemaining(currentQuestion.timeLimit || 120);
      setTimeStarted(Date.now());
    }
  }, [currentQuestion, feedback]);

  useEffect(() => {
    if (timeRemaining <= 0 || feedback) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, feedback]);

  const fetchSession = async () => {
    try {
      const response = await interviewAPI.getById(sessionId);
      setSession(response.data.session);
      
      // If session has answers, we need to reconstruct the state
      if (response.data.session.status === 'completed') {
        navigate(`/interview/result/${sessionId}`);
        return;
      }

      // For now, redirect to setup if no questions available
      if (response.data.answers.length === response.data.session.totalQuestions) {
        navigate(`/interview/result/${sessionId}`);
        return;
      }

      // Note: In a real app, you'd fetch the remaining questions
      // For now, we'll redirect to setup
      navigate('/interview/setup');
    } catch (err) {
      setError('Failed to load session');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      setError('Please provide an answer');
      return;
    }

    setError('');
    setSubmitting(true);

    const timeTaken = Math.round((Date.now() - timeStarted) / 1000);

    try {
      const response = await interviewAPI.submitAnswer(sessionId, {
        questionId: currentQuestion.id,
        answerText: answer,
        timeTaken
      });
      setFeedback(response.data.evaluation);
      setEvaluationMethod(response.data.evaluationMethod);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchNextQuestion = async () => {
    setLoadingQuestion(true);
    try {
      const response = await interviewAPI.getNextQuestion(sessionId);
      
      if (response.data.complete) {
        // No more questions, complete the interview
        handleCompleteInterview();
        return;
      }

      setCurrentQuestion(response.data.question);
      setQuestionNumber(response.data.questionNumber);
      setTotalQuestions(response.data.totalQuestions);
      setSelectionMethod(response.data.selectionMethod);
      setAnswer('');
      setFeedback(null);
      setEvaluationMethod(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get next question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleNextQuestion = () => {
    if (questionNumber < totalQuestions) {
      fetchNextQuestion();
    } else {
      handleCompleteInterview();
    }
  };

  const handleCompleteInterview = async () => {
    try {
      await interviewAPI.complete(sessionId);
      navigate(`/interview/result/${sessionId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete interview');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No questions available</p>
      </div>
    );
  }

  const progress = (questionNumber / totalQuestions) * 100;
  const isLastQuestion = questionNumber >= totalQuestions;
  const timeWarning = timeRemaining < 60 && timeRemaining > 0;
  const timeExpired = timeRemaining === 0;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600">
              Question {questionNumber} of {totalQuestions}
            </span>
            <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full capitalize">
              {currentQuestion.difficulty}
            </span>
            <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
              {currentQuestion.topic}
            </span>
            {selectionMethod === 'ai' && (
              <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                <Sparkles size={12} />
                AI Selected
              </span>
            )}
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
            timeExpired ? 'bg-red-100 text-red-700' :
            timeWarning ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'
          }`}>
            <Clock size={16} />
            <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Question Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-800 leading-relaxed">
          {currentQuestion.text || currentQuestion.questionText}
        </h2>
      </div>

      {/* Answer Section */}
      {!feedback ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Your Answer
          </label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            rows={8}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
            disabled={submitting}
          />
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">
              {answer.trim().split(/\s+/).filter(w => w.length > 0).length} words
            </p>
            <button
              onClick={handleSubmitAnswer}
              disabled={submitting || !answer.trim()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Evaluating...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit Answer
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Feedback Section */
        <div className="space-y-6 animate-slide-up">
          {/* Score Card */}
          <div className={`rounded-xl p-6 ${
            feedback.score >= 70 ? 'bg-green-50 border border-green-200' :
            feedback.score >= 50 ? 'bg-yellow-50 border border-yellow-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  feedback.score >= 70 ? 'bg-green-100' :
                  feedback.score >= 50 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  {feedback.score >= 70 ? (
                    <CheckCircle className="text-green-600" size={32} />
                  ) : feedback.score >= 50 ? (
                    <Lightbulb className="text-yellow-600" size={32} />
                  ) : (
                    <XCircle className="text-red-600" size={32} />
                  )}
                </div>
                <div>
                  <p className="text-4xl font-bold text-slate-800">{feedback.score}%</p>
                  <p className={`font-medium ${
                    feedback.score >= 70 ? 'text-green-700' :
                    feedback.score >= 50 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {feedback.score >= 70 ? 'Great answer!' :
                     feedback.score >= 50 ? 'Good attempt' : 'Needs improvement'}
                  </p>
                </div>
              </div>
              {evaluationMethod === 'ai' && (
                <div className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  <Sparkles size={14} />
                  AI Evaluated
                </div>
              )}
            </div>
          </div>

          {/* Detailed Feedback */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Feedback</h3>
            <p className="text-slate-600 mb-6">{feedback.feedback}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              {feedback.strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                    <CheckCircle size={16} />
                    Strengths
                  </h4>
                  <ul className="space-y-1">
                    {feedback.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-slate-600">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {feedback.weaknesses.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-yellow-700 mb-2 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Areas to Improve
                  </h4>
                  <ul className="space-y-1">
                    {feedback.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-slate-600">• {w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {feedback.suggestions.length > 0 && (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Lightbulb size={16} />
                  Suggestions
                </h4>
                <ul className="space-y-1">
                  {feedback.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-slate-600">• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Keywords */}
            {feedback.matchedKeywords?.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-slate-700 mb-2">
                  Key Concepts Covered ({feedback.keywordScore}%)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {feedback.matchedKeywords.map((k, i) => (
                    <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                      {k}
                    </span>
                  ))}
                  {feedback.missedKeywords?.slice(0, 5).map((k, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs line-through">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Next Button */}
          <div className="flex justify-end">
            <button
              onClick={handleNextQuestion}
              disabled={loadingQuestion}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingQuestion ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Loading Question...
                </>
              ) : (
                <>
                  {isLastQuestion ? 'Finish Interview' : 'Next Question'}
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;

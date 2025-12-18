import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { interviewAPI } from '../services/api';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  Home
} from 'lucide-react';

const InterviewResult = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedAnswers, setExpandedAnswers] = useState({});

  useEffect(() => {
    fetchResults();
  }, [sessionId]);

  const fetchResults = async () => {
    try {
      const response = await interviewAPI.getById(sessionId);
      setSession(response.data.session);
      setAnswers(response.data.answers);
      setFeedback(response.data.feedback);
    } catch (err) {
      setError('Failed to load results');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAnswer = (answerId) => {
    setExpandedAnswers(prev => ({
      ...prev,
      [answerId]: !prev[answerId]
    }));
  };

  const getScoreColor = (score) => {
    if (score >= 70) return { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' };
    if (score >= 50) return { bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-500' };
    return { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' };
  };

  const getReadinessColor = (level) => {
    switch (level) {
      case 'Interview Ready': return 'text-green-600 bg-green-100';
      case 'Almost Ready': return 'text-blue-600 bg-blue-100';
      case 'Needs Practice': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-red-600 bg-red-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Interview Results</h1>
        <p className="text-slate-500 mt-1 capitalize">
          {session?.role} Interview • {session?.difficulty} difficulty
        </p>
      </div>

      {/* Overall Score Card */}
      {feedback && (
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-8 text-white mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-4xl font-bold">{feedback.overallScore}%</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Overall Score</h2>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getReadinessColor(feedback.readinessLevel)}`}>
                  {feedback.readinessLevel}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <p className="text-primary-200 text-sm">Questions</p>
                <p className="text-2xl font-bold">{answers.length}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <p className="text-primary-200 text-sm">Readiness</p>
                <p className="text-2xl font-bold">{feedback.readinessScore}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {feedback?.strengths?.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <CheckCircle size={18} />
              <span className="text-sm font-medium">Strong In</span>
            </div>
            <p className="text-green-800 font-semibold">{feedback.strengths.length} topics</p>
          </div>
        )}
        
        {feedback?.weaknesses?.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-700 mb-2">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">Needs Work</span>
            </div>
            <p className="text-yellow-800 font-semibold">{feedback.weaknesses.length} topics</p>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-700 mb-2">
            <Target size={18} />
            <span className="text-sm font-medium">Answered</span>
          </div>
          <p className="text-slate-800 font-semibold">{answers.length}/{session?.totalQuestions}</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-700 mb-2">
            <Clock size={18} />
            <span className="text-sm font-medium">Duration</span>
          </div>
          <p className="text-slate-800 font-semibold">
            {session?.completedAt ? Math.round((new Date(session.completedAt) - new Date(session.startedAt)) / 60000) : 0} min
          </p>
        </div>
      </div>

      {/* Topic Performance */}
      {feedback?.topicScores && Object.keys(feedback.topicScores).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h3 className="font-semibold text-slate-800 mb-4">Performance by Topic</h3>
          <div className="space-y-4">
            {Object.entries(feedback.topicScores).map(([topic, score]) => {
              const colors = getScoreColor(score);
              return (
                <div key={topic}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{topic}</span>
                    <span className={`text-sm font-bold ${colors.text}`}>{score}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colors.bar} transition-all duration-500`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {feedback?.recommendations?.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <TrendingUp size={20} />
            Recommendations
          </h3>
          <ul className="space-y-2">
            {feedback.recommendations.map((rec, i) => (
              <li key={i} className="text-blue-700 flex items-start gap-2">
                <span className="text-blue-400">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Question Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 mb-8">
        <div className="p-6 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Question Breakdown</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {answers.map((answer, index) => {
            const colors = getScoreColor(answer.score);
            const isExpanded = expandedAnswers[answer.id];
            
            return (
              <div key={answer.id} className="p-4">
                <button
                  onClick={() => toggleAnswer(answer.id)}
                  className="w-full flex items-start gap-4"
                >
                  <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <span className={`font-bold text-sm ${colors.text}`}>{answer.score}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-500">Q{index + 1}</span>
                      <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                        {answer.question.topic}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium line-clamp-2">
                      {answer.question.text}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="text-slate-400 flex-shrink-0" size={20} />
                  ) : (
                    <ChevronDown className="text-slate-400 flex-shrink-0" size={20} />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-4 ml-14 space-y-4 animate-fade-in">
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">Your Answer:</p>
                      <p className="text-slate-700 bg-slate-50 p-3 rounded-lg text-sm">
                        {answer.answerText}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">Feedback:</p>
                      <p className="text-slate-700 text-sm">{answer.feedback}</p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      {answer.strengths?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-green-700 mb-1">Strengths:</p>
                          <ul className="text-sm text-slate-600">
                            {answer.strengths.map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {answer.weaknesses?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-yellow-700 mb-1">To Improve:</p>
                          <ul className="text-sm text-slate-600">
                            {answer.weaknesses.map((w, i) => (
                              <li key={i}>• {w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to="/interview/setup"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlayCircle size={20} />
          Practice Again
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Home size={20} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default InterviewResult;

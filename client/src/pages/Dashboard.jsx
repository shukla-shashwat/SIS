import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI, interviewAPI } from '../services/api';
import { 
  PlayCircle, 
  Trophy, 
  Target, 
  TrendingUp,
  Clock,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, sessionsRes] = await Promise.all([
        userAPI.getStats(),
        interviewAPI.getAll({ limit: 5 })
      ]);
      setStats(statsRes.data);
      setRecentSessions(sessionsRes.data.sessions);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Completed</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">In Progress</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-slate-500 mt-1">Ready to improve your interview skills?</p>
        </div>
        <Link
          to="/interview/setup"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlayCircle size={20} />
          Start Interview
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-50 rounded-lg">
              <Target className="text-primary-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Sessions</p>
              <p className="text-2xl font-bold text-slate-800">
                {stats?.overall?.totalSessions || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <Trophy className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-slate-800">
                {stats?.overall?.completedSessions || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <TrendingUp className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg. Score</p>
              <p className="text-2xl font-bold text-slate-800">
                {stats?.overall?.avgScore !== null ? `${stats.overall.avgScore}%` : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Trophy className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Best Score</p>
              <p className="text-2xl font-bold text-slate-800">
                {stats?.overall?.bestScore !== null ? `${stats.overall.bestScore}%` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start & Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Start */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Quick Start</h3>
          <p className="text-primary-100 text-sm mb-6">
            Jump into a practice session with your preferred settings.
          </p>
          <Link
            to="/interview/setup"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary-700 font-medium rounded-lg hover:bg-primary-50 transition-colors"
          >
            <PlayCircle size={18} />
            New Interview
          </Link>
          
          {!user?.targetRole && (
            <div className="mt-6 p-3 bg-white/10 rounded-lg">
              <p className="text-sm text-primary-100">
                💡 Set up your profile to get personalized questions
              </p>
              <Link to="/profile" className="text-sm font-medium text-white hover:underline">
                Complete Profile →
              </Link>
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Recent Sessions</h3>
            <Link to="/history" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View All
            </Link>
          </div>
          
          {recentSessions.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-500">No interview sessions yet</p>
              <p className="text-sm text-slate-400 mt-1">Start your first interview to see your history</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  to={session.status === 'completed' 
                    ? `/interview/result/${session.id}` 
                    : `/interview/session/${session.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      session.score !== null ? getScoreColor(session.score) : 'bg-slate-100 text-slate-600'
                    }`}>
                      {session.score !== null ? (
                        <span className="font-bold text-sm">{Math.round(session.score)}</span>
                      ) : (
                        <Clock size={18} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 capitalize">
                        {session.role} Interview
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatDate(session.startedAt)} • {session.answeredQuestions}/{session.totalQuestions} questions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(session.status)}
                    <ChevronRight className="text-slate-400" size={20} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Topic Performance */}
      {stats?.topicPerformance?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Performance by Topic</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.topicPerformance.map((topic) => (
              <div key={topic.topic} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-700">{topic.topic}</span>
                  <span className={`text-sm font-bold ${
                    topic.avg_score >= 70 ? 'text-green-600' :
                    topic.avg_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {Math.round(topic.avg_score)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      topic.avg_score >= 70 ? 'bg-green-500' :
                      topic.avg_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${topic.avg_score}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {topic.question_count} question{topic.question_count !== 1 ? 's' : ''} answered
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

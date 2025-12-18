import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { interviewAPI } from '../services/api';
import { 
  Clock, 
  ChevronRight, 
  AlertCircle,
  Filter,
  Trash2
} from 'lucide-react';

const InterviewHistory = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = { limit: 20, offset: 0 };
      if (filter !== 'all') params.status = filter;
      
      const response = await interviewAPI.getAll(params);
      setSessions(response.data.sessions);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Failed to load history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this interview session?')) {
      return;
    }

    try {
      await interviewAPI.delete(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      setError('Failed to delete session');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Interview History</h1>
          <p className="text-slate-500 mt-1">Review your past interview sessions</p>
        </div>
        
        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Sessions</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Clock className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-800 mb-2">No interviews found</h3>
          <p className="text-slate-500 mb-6">
            {filter === 'all' 
              ? "You haven't taken any interviews yet" 
              : `No ${filter.replace('_', ' ')} sessions`}
          </p>
          <Link
            to="/interview/setup"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Start Your First Interview
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {sessions.map((session) => (
              <Link
                key={session.id}
                to={session.status === 'completed' 
                  ? `/interview/result/${session.id}` 
                  : `/interview/session/${session.id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    session.score !== null ? getScoreColor(session.score) : 'bg-slate-100 text-slate-600'
                  }`}>
                    {session.score !== null ? (
                      <span className="font-bold">{Math.round(session.score)}</span>
                    ) : (
                      <Clock size={20} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-slate-800 capitalize">
                        {session.role} Interview
                      </p>
                      <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded capitalize">
                        {session.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {formatDate(session.startedAt)} • {session.answeredQuestions}/{session.totalQuestions} questions
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(session.status)}
                  <button
                    onClick={(e) => handleDelete(session.id, e)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete session"
                  >
                    <Trash2 size={18} />
                  </button>
                  <ChevronRight className="text-slate-400" size={20} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pagination info */}
      {pagination.total > 0 && (
        <p className="text-sm text-slate-500 mt-4 text-center">
          Showing {sessions.length} of {pagination.total} sessions
        </p>
      )}
    </div>
  );
};

export default InterviewHistory;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { interviewAPI, questionsAPI } from '../services/api';
import { 
  PlayCircle, 
  Code, 
  Clock, 
  BarChart3,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const InterviewSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState({
    role: user?.targetRole || '',
    difficulty: 'medium',
    questionCount: 5
  });

  const difficulties = [
    { id: 'easy', name: 'Easy', description: 'Fundamental concepts', color: 'green' },
    { id: 'medium', name: 'Medium', description: 'Standard interview level', color: 'yellow' },
    { id: 'hard', name: 'Hard', description: 'Advanced topics', color: 'red' }
  ];

  const questionCounts = [3, 5, 10];

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await questionsAPI.getRoles();
      setRoles(response.data.roles);
    } catch (err) {
      setError('Failed to load roles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = async () => {
    if (!settings.role) {
      setError('Please select a role');
      return;
    }

    setError('');
    setStarting(true);

    try {
      const response = await interviewAPI.start({
        role: settings.role,
        difficulty: settings.difficulty,
        questionCount: settings.questionCount
      });
      navigate(`/interview/session/${response.data.session.id}`, {
        state: { 
          session: response.data.session,
          questions: response.data.questions
        }
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start interview');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Start New Interview</h1>
        <p className="text-slate-500 mt-1">Configure your practice session</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Role Selection */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-50 rounded-lg">
              <Code className="text-primary-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Select Role</h2>
              <p className="text-sm text-slate-500">Choose the position you're preparing for</p>
            </div>
          </div>

          <div className="grid gap-3">
            {roles.map(role => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, role: role.id }))}
                className={`w-full p-4 border rounded-xl text-left transition-all ${
                  settings.role === role.id
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{role.name}</p>
                    <p className="text-sm text-slate-500">{role.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      {role.questionCount} questions
                    </span>
                    <ChevronRight className={`text-slate-400 transition-colors ${
                      settings.role === role.id ? 'text-primary-600' : ''
                    }`} size={20} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <BarChart3 className="text-yellow-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Difficulty Level</h2>
              <p className="text-sm text-slate-500">Select the challenge level</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {difficulties.map(diff => (
              <button
                key={diff.id}
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, difficulty: diff.id }))}
                className={`p-4 border rounded-xl text-center transition-all ${
                  settings.difficulty === diff.id
                    ? `border-${diff.color}-500 bg-${diff.color}-50 ring-2 ring-${diff.color}-200`
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="font-medium text-slate-800">{diff.name}</p>
                <p className="text-xs text-slate-500 mt-1">{diff.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Question Count */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Clock className="text-purple-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Session Length</h2>
              <p className="text-sm text-slate-500">Number of questions</p>
            </div>
          </div>

          <div className="flex gap-3">
            {questionCounts.map(count => (
              <button
                key={count}
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, questionCount: count }))}
                className={`flex-1 py-4 border rounded-xl text-center transition-all ${
                  settings.questionCount === count
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="text-2xl font-bold text-slate-800">{count}</p>
                <p className="text-xs text-slate-500 mt-1">
                  ~{count * 3} min
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Summary & Start */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Session Summary</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-primary-200 text-xs">Role</p>
              <p className="font-medium capitalize">{settings.role || 'Not selected'}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-primary-200 text-xs">Difficulty</p>
              <p className="font-medium capitalize">{settings.difficulty}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-primary-200 text-xs">Questions</p>
              <p className="font-medium">{settings.questionCount}</p>
            </div>
          </div>
          
          <button
            onClick={handleStartInterview}
            disabled={!settings.role || starting}
            className="w-full py-4 bg-white text-primary-700 font-semibold rounded-lg hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {starting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-700"></div>
                Starting...
              </>
            ) : (
              <>
                <PlayCircle size={20} />
                Start Interview
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetup;

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { User, Briefcase, Code, Award, Save, AlertCircle, Check } from 'lucide-react';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    targetRole: '',
    experienceLevel: '',
    techStack: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const roles = [
    { id: 'frontend', name: 'Frontend Developer' },
    { id: 'backend', name: 'Backend Developer' },
    { id: 'fullstack', name: 'Full Stack Developer' },
    { id: 'devops', name: 'DevOps Engineer' },
    { id: 'data', name: 'Data Engineer' }
  ];

  const experienceLevels = [
    { id: 'student', name: 'Student / Intern' },
    { id: 'junior', name: 'Junior (0-2 years)' },
    { id: 'mid', name: 'Mid-Level (2-5 years)' },
    { id: 'senior', name: 'Senior (5+ years)' }
  ];

  const techOptions = [
    'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js',
    'Python', 'Java', 'C#', 'Go', 'Rust',
    'SQL', 'MongoDB', 'PostgreSQL', 'Redis',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
    'Git', 'CI/CD', 'REST APIs', 'GraphQL'
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      const userData = response.data.user;
      setProfile({
        name: userData.name || '',
        targetRole: userData.targetRole || '',
        experienceLevel: userData.experienceLevel || '',
        techStack: userData.techStack || []
      });
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTechToggle = (tech) => {
    setProfile(prev => ({
      ...prev,
      techStack: prev.techStack.includes(tech)
        ? prev.techStack.filter(t => t !== tech)
        : [...prev.techStack, tech]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await userAPI.updateProfile(profile);
      updateUser(response.data.user);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-bold text-slate-800">Profile Settings</h1>
        <p className="text-slate-500 mt-1">Manage your interview preferences and experience</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
          <Check size={20} />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-50 rounded-lg">
              <User className="text-primary-600" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Basic Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
              />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
            </div>
          </div>
        </div>

        {/* Career Info Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-50 rounded-lg">
              <Briefcase className="text-green-600" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Career Focus</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Target Role
              </label>
              <select
                value={profile.targetRole}
                onChange={(e) => setProfile(prev => ({ ...prev, targetRole: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              >
                <option value="">Select a role...</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Experience Level
              </label>
              <div className="grid grid-cols-2 gap-3">
                {experienceLevels.map(level => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setProfile(prev => ({ ...prev, experienceLevel: level.id }))}
                    className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                      profile.experienceLevel === level.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    {level.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Code className="text-purple-600" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Tech Stack</h2>
          </div>

          <p className="text-sm text-slate-500 mb-4">
            Select technologies you're familiar with or want to focus on
          </p>

          <div className="flex flex-wrap gap-2">
            {techOptions.map(tech => (
              <button
                key={tech}
                type="button"
                onClick={() => handleTechToggle(tech)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  profile.techStack.includes(tech)
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                }`}
              >
                {tech}
              </button>
            ))}
          </div>

          {profile.techStack.length > 0 && (
            <p className="text-sm text-slate-500 mt-4">
              {profile.techStack.length} technolog{profile.techStack.length === 1 ? 'y' : 'ies'} selected
            </p>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;

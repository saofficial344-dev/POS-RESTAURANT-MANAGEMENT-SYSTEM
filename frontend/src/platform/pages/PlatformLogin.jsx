import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import platformAPI from '../services/platformApi';
import toast from 'react-hot-toast';
import { Zap, Eye, EyeOff, Shield } from 'lucide-react';

const PlatformLogin = () => {
  const { platformAdmin, platformLogin } = usePlatformAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);

  // Already logged in → redirect
  if (platformAdmin) {
    navigate('/platform/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await platformAPI.post('/auth/login', form);
      platformLogin(data);
      toast.success(`Welcome, ${data.admin.name}`);
      navigate('/platform/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">

      {/* Brand */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
          <Zap size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Developer Platform</h1>
        <p className="mt-2 text-sm text-gray-500">Bayroute SaaS Control Center</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl">

        {/* Security notice */}
        <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2.5 mb-6">
          <Shield size={14} className="text-indigo-400 shrink-0" />
          <p className="text-xs text-indigo-300 font-medium">
            Restricted — Platform Developers Only
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="developer@bayroute.com"
              className="w-full h-11 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 text-sm placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Platform password"
                className="w-full h-11 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 pr-11 text-sm placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 mt-2"
          >
            {loading ? 'Authenticating…' : 'Sign In to Platform'}
          </button>
        </form>

      </div>

      <p className="mt-8 text-gray-700 text-xs">
        ShahnaynLabs &copy; {new Date().getFullYear()} — Not for restaurant staff
      </p>
    </div>
  );
};

export default PlatformLogin;

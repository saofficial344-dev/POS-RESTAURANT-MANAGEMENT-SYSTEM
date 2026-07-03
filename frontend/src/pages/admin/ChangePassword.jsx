import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const ChangePassword = () => {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const isMustChange      = user?.mustChangePassword || false;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent,     setShowCurrent]     = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [submitting,      setSubmitting]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!isMustChange && !currentPassword) {
      toast.error('Current password is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { newPassword };
      if (!isMustChange) payload.currentPassword = currentPassword;

      await api.post('/auth/change-password', payload);
      toast.success('Password changed. Please log in again.');
      await logout();
      navigate('/login/admin', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full h-11 border border-gray-300 rounded-xl px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all pr-11';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900 px-8 py-7">
            <div className="w-12 h-12 bg-amber-400/20 rounded-2xl flex items-center justify-center mb-4">
              <KeyRound size={22} className="text-amber-400" />
            </div>
            <h1 className="text-xl font-black text-white">Change Password</h1>
            {isMustChange && (
              <p className="text-sm text-white/60 mt-1.5">
                Your password was reset by the platform administrator. Please set a new password to continue.
              </p>
            )}
          </div>

          {/* Alert for forced change */}
          {isMustChange && (
            <div className="mx-8 mt-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                You cannot access the dashboard until you set a new password.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            {/* Current password — only shown if NOT a forced change */}
            {!isMustChange && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className={inputCls}
                    placeholder="Enter current password"
                    required
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className={inputCls}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 8 && (
                <p className="text-xs text-red-500 mt-1">At least 8 characters required</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={`${inputCls} pr-4 ${confirmPassword && newPassword !== confirmPassword ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                placeholder="Repeat new password"
                required
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
              {confirmPassword && newPassword === confirmPassword && newPassword.length >= 8 && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 size={11} /> Passwords match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
              className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {submitting
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Changing…</>
                : <><KeyRound size={14} /> Change Password</>}
            </button>

            {!isMustChange && (
              <button type="button" onClick={() => navigate(-1)}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors">
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;

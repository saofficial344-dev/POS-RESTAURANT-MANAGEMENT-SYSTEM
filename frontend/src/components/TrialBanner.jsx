import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const TrialBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const restaurant = user?.restaurant;

  if (!restaurant) return null;

  const { planStatus, trialEndsAt, plan } = restaurant;

  if (!['trial', 'expired', 'past_due'].includes(planStatus)) return null;

  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt) - Date.now()) / 86400000))
    : null;

  const urgent = planStatus === 'expired' || planStatus === 'past_due' || (daysLeft !== null && daysLeft <= 5);

  let message = '';
  if (planStatus === 'expired') {
    message = 'Your trial has expired. Upgrade to continue using Bayroute.';
  } else if (planStatus === 'past_due') {
    message = 'Your payment is overdue. Please pay to avoid service interruption.';
  } else if (daysLeft === 0) {
    message = 'Your trial expires today.';
  } else if (daysLeft !== null) {
    message = `Free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`;
  } else {
    message = 'You are on a free trial.';
  }

  return (
    <div
      className={`w-full px-4 py-2.5 flex items-center justify-between gap-4 text-sm font-medium ${
        urgent
          ? 'bg-red-500/10 border-b border-red-500/20 text-red-400'
          : 'bg-amber-500/10 border-b border-amber-500/20 text-amber-400'
      }`}
    >
      <div className="flex items-center gap-2">
        <span>{urgent ? '⚠️' : '⏳'}</span>
        <span>
          {message}
          <span className="opacity-60 ml-2">Current plan: {plan}</span>
        </span>
      </div>
      <button
        className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
          urgent
            ? 'border-red-400/40 text-red-300 hover:bg-red-500/20'
            : 'border-amber-400/40 text-amber-300 hover:bg-amber-500/20'
        }`}
        onClick={() => navigate('/admin/subscription')}
      >
        Upgrade Now
      </button>
    </div>
  );
};

export default TrialBanner;

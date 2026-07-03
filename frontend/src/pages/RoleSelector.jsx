import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_CONFIG, WORKSPACE_ORDER, getDashboardPath } from "../utils/roleConfig";

const RoleSelector = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, skip the selector
  useEffect(() => {
    if (!loading && user?.role) {
      navigate(getDashboardPath(user.role), { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-14">

      {/* ── HEADER ── */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-black text-white tracking-tight">
          Bayroute
        </h1>
        <p className="mt-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Restaurant Management System
        </p>
        <div className="mt-5 h-px w-20 bg-white/15 mx-auto" />
        <p className="mt-5 text-gray-400 text-sm">
          Choose your workspace to continue
        </p>
      </div>

      {/* ── ROLE CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-xl">
        {WORKSPACE_ORDER.map((role) => {
          const cfg = ROLE_CONFIG[role];
          return (
            <button
              key={role}
              onClick={() => navigate(cfg.loginPath)}
              className="group relative bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 rounded-2xl p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            >
              {/* Icon */}
              <span className="text-3xl leading-none">{cfg.icon}</span>

              {/* Label */}
              <p className="mt-3 text-white text-sm font-semibold leading-tight">
                {cfg.label}
              </p>

              {/* Description */}
              <p className="mt-1 text-gray-500 text-xs leading-relaxed">
                {cfg.description}
              </p>

              {/* Accent bar — visible on hover */}
              <div
                className="absolute inset-x-0 bottom-0 h-[2px] rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ backgroundColor: cfg.accentColor }}
              />
            </button>
          );
        })}
      </div>

      {/* ── FOOTER ── */}
      <p className="mt-6 text-gray-600 text-xs">
        ShahnaynLabs &copy; {new Date().getFullYear()} &mdash; Bayroute POS
      </p>

    </div>
  );
};

export default RoleSelector;

import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ROLE_CONFIG, getDashboardPath } from "../utils/roleConfig";

const RoleLogin = () => {
  const { role } = useParams();
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ restaurantSlug: "", name: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletionBanner, setDeletionBanner] = useState(null);

  const config = ROLE_CONFIG[role];

  // Already authenticated → go to correct dashboard
  useEffect(() => {
    if (!authLoading && user?.role) {
      navigate(getDashboardPath(user.role), { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Show restaurant-deleted message if redirected from a deleted restaurant session
  useEffect(() => {
    try {
      const msg  = sessionStorage.getItem("authMessage");
      const type = sessionStorage.getItem("authMessageType");
      if (msg && type === "deleted") {
        setDeletionBanner(msg);
        sessionStorage.removeItem("authMessage");
        sessionStorage.removeItem("authMessageType");
      }
    } catch {}
  }, []);

  // Unknown role in URL → back to selector
  if (!config) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name:     form.name.trim(),
        password: form.password.trim(),
      };
      if (form.restaurantSlug.trim()) {
        payload.restaurantSlug = form.restaurantSlug.trim().toLowerCase();
      }

      const { data } = await API.post("/auth/login", payload);

      // Enforce workspace isolation — a cashier cannot sign in via /login/admin
      if (data.role !== role) {
        toast.error(`This workspace is for ${config.label} only.`);
        return;
      }

      login(data);
      toast.success(`Welcome, ${data.name}!`);

      if (data.mustChangePassword && data.role === "admin") {
        navigate("/admin/change-password", { replace: true });
      } else {
        navigate(getDashboardPath(data.role), { replace: true });
      }
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.requiresWorkspace) {
        toast.error("Multiple accounts found — please enter your Workspace Code.");
      } else if (err.response?.data?.code === "RESTAURANT_DELETED") {
        setDeletionBanner(
          err.response.data.message ||
          "This restaurant no longer exists or its account has been permanently deleted."
        );
      } else {
        toast.error(err.response?.data?.message || "Invalid credentials");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-10">

      {/* Back link */}
      <div className="w-full max-w-sm mb-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors focus-visible:outline-none focus-visible:text-white"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          All Workspaces
        </button>
      </div>

      {/* Deletion banner */}
      {deletionBanner && (
        <div className="w-full max-w-sm mb-4 bg-red-950/60 border border-red-700/60 rounded-2xl px-5 py-4">
          <p className="text-red-300 text-xs font-semibold uppercase tracking-wider mb-1">
            Account Unavailable
          </p>
          <p className="text-red-200 text-sm leading-relaxed">{deletionBanner}</p>
        </div>
      )}

      {/* Card */}
      <div className="w-full max-w-sm bg-white/[0.04] border border-white/[0.08] rounded-3xl overflow-hidden">

        {/* Role branding */}
        <div className="px-8 py-8 border-b border-white/[0.08] text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-3xl mb-4"
            style={{ backgroundColor: `${config.accentColor}20` }}
          >
            {config.icon}
          </div>
          <h1 className="text-xl font-bold text-white">{config.label}</h1>
          <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
            {config.description}
          </p>
        </div>

        {/* Form */}
        <div className="px-8 py-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Workspace Code — always shown upfront */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="rl-workspace"
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider"
              >
                <Building2 size={11} aria-hidden="true" />
                Workspace Code
                <span className="text-gray-600 normal-case font-normal tracking-normal">(optional)</span>
              </label>
              <input
                id="rl-workspace"
                type="text"
                autoComplete="off"
                placeholder="e.g. my-restaurant"
                value={form.restaurantSlug}
                onChange={(e) => setForm({ ...form, restaurantSlug: e.target.value })}
                className="w-full h-11 bg-white/[0.05] border border-white/10 rounded-xl px-4 text-sm text-white placeholder-gray-600 outline-none transition-all hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10"
              />
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Your restaurant&apos;s unique code — required when multiple restaurants share the same username.
              </p>
            </div>

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="rl-username"
                className="text-xs font-semibold text-gray-400 uppercase tracking-wider"
              >
                Username
              </label>
              <input
                id="rl-username"
                type="text"
                required
                autoComplete="username"
                placeholder="Enter username"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-11 bg-white/[0.05] border border-white/10 rounded-xl px-4 text-sm text-white placeholder-gray-600 outline-none transition-all hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="rl-password"
                className="text-xs font-semibold text-gray-400 uppercase tracking-wider"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="rl-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full h-11 bg-white/[0.05] border border-white/10 rounded-xl px-4 pr-12 text-sm text-white placeholder-gray-600 outline-none transition-all hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-0 flex items-center justify-center w-11 text-gray-600 hover:text-gray-300 rounded-r-xl transition-colors focus-visible:outline-none"
                >
                  {showPassword
                    ? <EyeOff size={15} aria-hidden="true" />
                    : <Eye    size={15} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-sm font-semibold text-white mt-2 transition-all duration-150 hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: config.accentColor }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    aria-hidden="true"
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>

          </form>

          {/* Forgot password link */}
          <div className="mt-5 text-center">
            <Link
              to="/forgot-password"
              state={{ role }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

      </div>

      {/* Footer */}
      <p className="mt-8 text-gray-700 text-xs">
        Bayroute POS &mdash; ShahnaynLabs &copy; {new Date().getFullYear()}
      </p>

    </div>
  );
};

export default RoleLogin;

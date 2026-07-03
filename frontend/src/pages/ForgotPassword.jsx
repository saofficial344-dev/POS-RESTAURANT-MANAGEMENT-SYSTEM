import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, CheckCircle, Mail, KeyRound, Lock } from "lucide-react";
import toast from "react-hot-toast";
import API from "../services/api";
import { ROLE_CONFIG } from "../utils/roleConfig";

// ── Step indicator ─────────────────────────────────────────────────────────────
const STEPS = [
  { label: "Find Account", icon: Mail },
  { label: "Verify OTP",   icon: KeyRound },
  { label: "New Password", icon: Lock },
];

const StepDot = ({ index, current }) => {
  const done    = index < current;
  const active  = index === current;
  const Icon    = STEPS[index].icon;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
          done   ? "bg-emerald-500/20 border-2 border-emerald-500" :
          active ? "bg-indigo-500/20  border-2 border-indigo-400" :
                   "bg-white/[0.04]   border-2 border-white/10"
        }`}
      >
        {done
          ? <CheckCircle size={16} className="text-emerald-400" />
          : <Icon size={14} className={active ? "text-indigo-300" : "text-gray-600"} />
        }
      </div>
      <span className={`text-[10px] font-semibold ${active ? "text-indigo-300" : done ? "text-emerald-400" : "text-gray-600"}`}>
        {STEPS[index].label}
      </span>
    </div>
  );
};

// ── OTP countdown timer ────────────────────────────────────────────────────────
const useCountdown = (seconds) => {
  const [remaining, setRemaining] = useState(seconds);
  const ref = useRef(null);

  const start = () => {
    clearInterval(ref.current);
    setRemaining(seconds);
    ref.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(ref.current); return 0; }
        return r - 1;
      });
    }, 1000);
  };

  useEffect(() => { start(); return () => clearInterval(ref.current); }, []); // eslint-disable-line

  return { remaining, restart: start };
};

// ── Main component ─────────────────────────────────────────────────────────────
const ForgotPassword = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const role      = location.state?.role;
  const config    = ROLE_CONFIG[role];

  const [step, setStep] = useState(0);

  // Step 0 state
  const [identifier, setIdentifier] = useState({ email: "", name: "", restaurantSlug: "" });
  const [useEmail, setUseEmail]      = useState(true);

  // Step 1 state
  const [otp, setOtp]                  = useState("");
  const [devOtp, setDevOtp]            = useState(null); // shown in dev mode only
  const { remaining, restart }         = useCountdown(60);
  const [resendLoading, setResendLoading] = useState(false);

  // Step 2 state
  const [resetToken, setResetToken]    = useState("");
  const [newPassword, setNewPassword]  = useState("");
  const [confirmPass, setConfirmPass]  = useState("");
  const [showPw, setShowPw]            = useState(false);
  const [showConfirm, setShowConfirm]  = useState(false);

  const [loading, setLoading] = useState(false);

  // ── Build the payload object shared by forgot-password and verify-otp ─────
  const buildPayload = () => {
    if (useEmail) {
      return { email: identifier.email.trim() };
    }
    const p = { name: identifier.name.trim() };
    if (identifier.restaurantSlug.trim()) {
      p.restaurantSlug = identifier.restaurantSlug.trim().toLowerCase();
    }
    return p;
  };

  // ── Step 0 → 1 : request OTP ─────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();

    const hasIdentifier = useEmail
      ? identifier.email.trim()
      : identifier.name.trim();

    if (!hasIdentifier) {
      toast.error(useEmail ? "Please enter your email address." : "Please enter your username.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await API.post("/auth/forgot-password", buildPayload());
      toast.success("OTP sent! Check your email.");

      // DEV ONLY — show OTP when backend returns it (no email service yet)
      if (data.otp) {
        setDevOtp(data.otp);
      }

      restart();
      setStep(1);
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error("Multiple accounts found — please switch to Username + Workspace mode and add your workspace code.");
        setUseEmail(false);
      } else {
        toast.error(err.response?.data?.message || "Failed to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1 resend ─────────────────────────────────────────────────────────
  const handleResend = async () => {
    setResendLoading(true);
    try {
      const { data } = await API.post("/auth/forgot-password", buildPayload());
      toast.success("New OTP sent!");
      if (data.otp) setDevOtp(data.otp);
      setOtp("");
      restart();
    } catch {
      toast.error("Failed to resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  // ── Step 1 → 2 : verify OTP ──────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      toast.error("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const payload = { ...buildPayload(), otp };
      const { data } = await API.post("/auth/verify-otp", payload);
      setResetToken(data.resetToken);
      setDevOtp(null);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 : set new password ─────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPass) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await API.post("/auth/reset-password", { token: resetToken, newPassword });
      toast.success("Password changed! Please sign in with your new password.");
      const loginPath = config?.loginPath || "/";
      navigate(loginPath, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password. Please start over.");
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input class ────────────────────────────────────────────────────
  const inputCls = "w-full h-11 bg-white/[0.05] border border-white/10 rounded-xl px-4 text-sm text-white placeholder-gray-600 outline-none transition-all hover:border-white/20 focus:border-white/30 focus:ring-2 focus:ring-white/10";
  const labelCls = "text-xs font-semibold text-gray-400 uppercase tracking-wider";

  // ── Back link destination ─────────────────────────────────────────────────
  const backPath  = config?.loginPath || "/";
  const backLabel = config ? `Back to ${config.label} Login` : "Back to Workspaces";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-10">

      {/* Back link */}
      <div className="w-full max-w-sm mb-6">
        <Link
          to={backPath}
          className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {backLabel}
        </Link>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white/[0.04] border border-white/[0.08] rounded-3xl overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-white/[0.08] text-center">
          <h1 className="text-xl font-bold text-white">Reset Password</h1>
          <p className="text-gray-500 text-xs mt-1.5">
            Verify your identity with a one-time code
          </p>
        </div>

        {/* Step indicator */}
        <div className="px-8 pt-6 pb-2">
          <div className="flex items-start justify-between">
            {STEPS.map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <StepDot index={i} current={step} />
              </div>
            ))}
          </div>
          {/* Connector lines */}
          <div className="flex justify-center mt-[-28px] mb-4 relative z-[-1]">
            <div className="w-full h-px bg-white/[0.06] mt-[18px]" />
          </div>
        </div>

        {/* ── Step 0: Find Account ── */}
        {step === 0 && (
          <form onSubmit={handleRequestOtp} noValidate className="px-8 pb-8 space-y-4">

            {/* Toggle: Email vs Username */}
            <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1">
              {[
                { id: true,  label: "Email" },
                { id: false, label: "Username" },
              ].map(({ id, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setUseEmail(id)}
                  className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all ${
                    useEmail === id
                      ? "bg-indigo-500 text-white shadow"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {useEmail ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="fp-email" className={labelCls}>Email Address</label>
                <input
                  id="fp-email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="your@email.com"
                  value={identifier.email}
                  onChange={(e) => setIdentifier({ ...identifier, email: e.target.value })}
                  className={inputCls}
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fp-name" className={labelCls}>Username</label>
                  <input
                    id="fp-name"
                    type="text"
                    required
                    autoFocus
                    autoComplete="username"
                    placeholder="Your username"
                    value={identifier.name}
                    onChange={(e) => setIdentifier({ ...identifier, name: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fp-slug" className={labelCls}>
                    Workspace Code
                    <span className="text-gray-600 normal-case font-normal tracking-normal ml-1">(optional)</span>
                  </label>
                  <input
                    id="fp-slug"
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. my-restaurant"
                    value={identifier.restaurantSlug}
                    onChange={(e) => setIdentifier({ ...identifier, restaurantSlug: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending OTP…
                </span>
              ) : (
                "Send OTP"
              )}
            </button>
          </form>
        )}

        {/* ── Step 1: Verify OTP ── */}
        {step === 1 && (
          <form onSubmit={handleVerifyOtp} noValidate className="px-8 pb-8 space-y-4">

            {/* Dev-mode OTP display */}
            {devOtp && (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                  Development Mode — OTP
                </p>
                <p className="text-2xl font-black text-amber-300 text-center tracking-[0.3em] font-mono">
                  {devOtp}
                </p>
                <p className="text-[10px] text-amber-500 text-center mt-1">
                  In production this is sent by email, not shown here.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="fp-otp" className={labelCls}>6-Digit OTP</label>
              <input
                id="fp-otp"
                type="text"
                required
                autoFocus
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={`${inputCls} text-center text-xl font-black tracking-[0.5em] font-mono`}
              />
              <p className="text-[11px] text-gray-600">
                {remaining > 0
                  ? `Expires in ${remaining}s`
                  : "OTP expired."}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full h-11 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : (
                "Verify OTP"
              )}
            </button>

            {/* Resend */}
            <div className="text-center">
              {remaining > 0 ? (
                <p className="text-xs text-gray-600">
                  Resend available in <span className="text-gray-400 font-semibold">{remaining}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                >
                  {resendLoading ? "Sending…" : "Resend OTP"}
                </button>
              )}
            </div>

            {/* Go back */}
            <button
              type="button"
              onClick={() => { setStep(0); setOtp(""); setDevOtp(null); }}
              className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              ← Change account details
            </button>
          </form>
        )}

        {/* ── Step 2: Set New Password ── */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} noValidate className="px-8 pb-8 space-y-4">

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300">Identity verified. Set your new password below.</p>
            </div>

            {/* New password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fp-newpw" className={labelCls}>New Password</label>
              <div className="relative">
                <input
                  id="fp-newpw"
                  type={showPw ? "text" : "password"}
                  required
                  autoFocus
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`${inputCls} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fp-confirmpw" className={labelCls}>Confirm Password</label>
              <div className="relative">
                <input
                  id="fp-confirmpw"
                  type={showConfirm ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className={`${inputCls} pr-12 ${
                    confirmPass && confirmPass !== newPassword
                      ? "border-red-500/50"
                      : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPass && confirmPass !== newPassword && (
                <p className="text-[11px] text-red-400">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPass}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                "Set New Password"
              )}
            </button>
          </form>
        )}

      </div>

      <p className="mt-8 text-gray-700 text-xs">
        Bayroute POS &mdash; ShahnaynLabs &copy; {new Date().getFullYear()}
      </p>

    </div>
  );
};

export default ForgotPassword;

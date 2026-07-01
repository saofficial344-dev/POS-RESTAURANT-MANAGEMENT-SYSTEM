import { useState, useContext, useEffect } from "react";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

const Login = () => {
  const [form, setForm] = useState({ name: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Consolidated into a single useContext call — same behaviour as before
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ── Auth logic — unchanged ── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const cleanForm = {
        name: form.name.trim(),
        password: form.password.trim(),
      };

      const { data } = await API.post("/auth/login", cleanForm);

      login(data);

      navigate(data.role === "admin" ? "/admin/menu" : "/pos/menu", {
        replace: true,
      });

      toast.success("Login Successful");

      if (data.role === "admin") {
        navigate("/admin/menu", { replace: true });
      } else {
        navigate("/pos/menu", { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Login Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      navigate("/admin/menu", { replace: true });
    }
    if (user?.role === "cashier") {
      navigate("/pos/menu", { replace: true });
    }
  }, [user]);
  /* ── End auth logic ── */

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-10">

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* ── BRAND HEADER ── */}
        <div className="px-8 pt-9 pb-7 text-center">
          <h1 className="text-3xl font-extrabold text-black tracking-tight">
            Bayroute
          </h1>
          <p className="text-gray-400 text-sm mt-2 font-medium">
            Login to continue
          </p>
        </div>

        {/* ── DIVIDER ── */}
        <div className="mx-8 h-px bg-gray-100" />

        {/* ── FORM ── */}
        <div className="px-8 py-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* USERNAME */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-username"
                className="text-sm font-semibold text-gray-700"
              >
                Username
              </label>
              <input
                id="login-username"
                type="text"
                required
                autoComplete="username"
                placeholder="Enter username"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-150 hover:border-gray-400 focus:border-black focus:ring-2 focus:ring-black/10"
              />
            </div>

            {/* PASSWORD */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-password"
                className="text-sm font-semibold text-gray-700"
              >
                Password
              </label>

              {/*
                The relative wrapper owns the mt spacing.
                The toggle button uses inset-y-0 so it always spans
                the exact height of the input — no translation math needed.
              */}
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full h-12 border border-gray-200 rounded-xl px-4 pr-12 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-150 hover:border-gray-400 focus:border-black focus:ring-2 focus:ring-black/10"
                />

                {/* PASSWORD VISIBILITY TOGGLE
                    inset-y-0 + flex items-center = perfectly centred,
                    regardless of input height or padding. */}
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center justify-center w-12 text-gray-400 rounded-r-xl transition-colors duration-150 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20"
                >
                  {showPassword
                    ? <EyeOff size={18} strokeWidth={2} aria-hidden="true" />
                    : <Eye    size={18} strokeWidth={2} aria-hidden="true" />
                  }
                </button>
              </div>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-black text-white rounded-xl text-sm font-semibold tracking-wide mt-1 transition-all duration-150 hover:bg-gray-900 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
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
                "Login"
              )}
            </button>

          </form>

          {/* REGISTER LINK */}
          <p className="text-sm text-center text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="text-black font-semibold hover:underline focus-visible:outline-none focus-visible:underline"
            >
              Register
            </button>
          </p>
        </div>

      </div>

    </div>
  );
};

export default Login;

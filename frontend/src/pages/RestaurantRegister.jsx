import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import toast from "react-hot-toast";

const PLANS = [
  {
    id: "Basic",
    label: "Basic",
    price: "Free",
    description: "Up to 1 branch, 10 users",
    features: ["Single branch", "Core POS features", "Basic reports"],
  },
  {
    id: "Advance",
    label: "Advance",
    price: "$29/mo",
    description: "Up to 3 branches, 30 users",
    features: ["3 branches", "Advanced analytics", "Priority support"],
    popular: true,
  },
  {
    id: "Premium",
    label: "Premium",
    price: "$79/mo",
    description: "Unlimited branches & users",
    features: ["Unlimited branches", "Developer API", "Dedicated support"],
  },
];

const RestaurantRegister = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [step, setStep]       = useState(1); // 1 = details, 2 = plan
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState({
    restaurantName: "",
    adminName:      "",
    email:          "",
    phone:          "",
    password:       "",
    confirmPassword:"",
    plan:           "Basic",
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validateStep1 = () => {
    if (!form.restaurantName.trim()) { toast.error("Restaurant name is required"); return false; }
    if (!form.adminName.trim())      { toast.error("Admin name is required");      return false; }
    if (!form.email.trim())          { toast.error("Email is required");           return false; }
    if (!form.password)              { toast.error("Password is required");        return false; }
    if (form.password.length < 6)    { toast.error("Password must be at least 6 characters"); return false; }
    if (form.password !== form.confirmPassword) { toast.error("Passwords do not match"); return false; }
    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await API.post("/auth/restaurant/register", {
        restaurantName: form.restaurantName.trim(),
        adminName:      form.adminName.trim(),
        email:          form.email.trim(),
        phone:          form.phone.trim(),
        password:       form.password,
        plan:           form.plan,
      });

      // Auto-login the new admin
      login({
        _id:          data._id,
        name:         data.name,
        role:         data.role,
        email:        data.email,
        restaurantId: data.restaurantId,
        token:        data.token,
        refreshToken: data.refreshToken,
        restaurant:   data.restaurant,
      });

      toast.success(`Welcome! ${data.restaurant?.name || form.restaurantName} is ready.`);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-14">

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-white tracking-tight">Bayroute</h1>
        <p className="mt-2 text-sm text-gray-500 uppercase tracking-widest font-semibold">
          Restaurant Management System
        </p>
      </div>

      <div className="w-full max-w-lg bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8">

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  s === step
                    ? "bg-indigo-500 text-white"
                    : s < step
                    ? "bg-green-500 text-white"
                    : "bg-white/10 text-gray-500"
                }`}
              >
                {s < step ? "✓" : s}
              </div>
              <span className={`text-sm font-medium ${s === step ? "text-white" : "text-gray-500"}`}>
                {s === 1 ? "Restaurant Details" : "Choose Plan"}
              </span>
              {s < 2 && <div className="w-8 h-px bg-white/10 mx-1" />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Details ── */}
        {step === 1 && (
          <form onSubmit={handleNext} className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-6">Restaurant Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Restaurant Name" required>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bayroute Restaurant"
                  value={form.restaurantName}
                  onChange={set("restaurantName")}
                  className={inputCls}
                />
              </Field>
              <Field label="Admin Name" required>
                <input
                  type="text"
                  required
                  placeholder="Your full name"
                  value={form.adminName}
                  onChange={set("adminName")}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email Address" required>
                <input
                  type="email"
                  required
                  placeholder="admin@restaurant.com"
                  value={form.email}
                  onChange={set("email")}
                  className={inputCls}
                />
              </Field>
              <Field label="Phone Number">
                <input
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={form.phone}
                  onChange={set("phone")}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Password" required>
                <input
                  type="password"
                  required
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={set("password")}
                  className={inputCls}
                />
              </Field>
              <Field label="Confirm Password" required>
                <input
                  type="password"
                  required
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  className={inputCls}
                />
              </Field>
            </div>

            <button type="submit" className={btnCls}>
              Continue to Plan Selection →
            </button>
          </form>
        )}

        {/* ── STEP 2: Plan ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-gray-500 hover:text-white text-sm transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-xl font-bold text-white">Choose Your Plan</h2>
            </div>

            <p className="text-gray-500 text-sm -mt-2">
              All plans include a 30-day free trial. No credit card required.
            </p>

            <div className="grid gap-3">
              {PLANS.map((plan) => (
                <label
                  key={plan.id}
                  className={`relative flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                    form.plan === plan.id
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={plan.id}
                    checked={form.plan === plan.id}
                    onChange={set("plan")}
                    className="mt-1 accent-indigo-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{plan.label}</span>
                      {plan.popular && (
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                      <span className="ml-auto text-indigo-400 font-bold text-sm">{plan.price}</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">{plan.description}</p>
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {plan.features.map((f) => (
                        <li key={f} className="text-gray-400 text-xs flex items-center gap-1">
                          <span className="text-green-500">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </label>
              ))}
            </div>

            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? "Creating your restaurant..." : "Start 30-Day Free Trial"}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6">
          Already registered?{" "}
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <p className="mt-8 text-gray-700 text-xs">
        ShahnaynLabs &copy; {new Date().getFullYear()} — Bayroute POS
      </p>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const inputCls =
  "w-full bg-white/[0.05] border border-white/[0.10] text-white rounded-xl px-4 py-2.5 text-sm placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all";

const btnCls =
  "w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-sm transition-all";

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-400 mb-1">
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

export default RestaurantRegister;

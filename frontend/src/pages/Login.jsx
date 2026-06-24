import { useState, useContext } from "react";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { useEffect } from "react";

const Login = () => {
  const [form, setForm] = useState({
    name: "",
    password: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const cleanForm = {
        name: form.name.trim(),
        password: form.password.trim(),
      };

      const { data } = await API.post(
        "/auth/login",
        cleanForm
      );

    login(data);

    navigate(data.role === "admin" ? "/admin/menu" : "/cashier/menu", {
      replace: true,
    });

      toast.success("Login Successful");

      if (data.role === "admin") {
        navigate("/admin/menu", {
          replace: true,
        });
      } else {
        navigate("/cashier/menu", {
          replace: true,
        });
      }

    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Login Failed"
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {

  if (user?.role === "admin") {
    navigate("/admin/menu", { replace: true });
  }

  if (user?.role === "cashier") {
    navigate("/cashier/menu", { replace: true });
  }

}, [user]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">

        {/* HEADER */}
        <div className="text-center mb-8">

          <h1 className="text-3xl font-extrabold text-black">
           Bayroute
          </h1>

          <p className="text-gray-500 text-sm mt-2">
            Login to continue
          </p>

        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          {/* USERNAME */}
          <div>

            <label className="text-sm font-medium text-gray-700">
              Username
            </label>

            <input
              type="text"
              required
              placeholder="Enter username"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mt-1 outline-none focus:ring-2 focus:ring-black"
            />

          </div>

          {/* PASSWORD */}
          <div>

            <label className="text-sm font-medium text-gray-700">
              Password
            </label>

            <div className="relative">

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                required
                placeholder="Enter password"
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password:
                      e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 mt-1 pr-12 outline-none focus:ring-2 focus:ring-black"
              />

              {/* EYE ICON */}
              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>

            </div>

          </div>

          {/* BUTTON */}
          <button
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-900 transition-all"
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
{/* REGISTER LINK */}
<div className="text-center mt-5">

  <p className="text-sm text-gray-600">
    Don&apos;t have an account?{" "}

    <span
      onClick={() => navigate("/register")}
      className="text-black font-semibold cursor-pointer hover:underline"
    >
      Register
    </span>

  </p>

</div>
        </form>

      </div>

    </div>
  );
};

export default Login;
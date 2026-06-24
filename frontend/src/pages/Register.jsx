import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    password: "",
    role: "cashier",
  });

  const [loading, setLoading] =
    useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      await API.post(
        "/auth/register",
        form
      );

      toast.success(
        "User Created Successfully"
      );

      navigate("/");

    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Registration Failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">

        {/* HEADER */}
        <div className="text-center mb-8">

          <h1 className="text-3xl font-extrabold text-black">
            Create Account
          </h1>

          <p className="text-gray-500 text-sm mt-2">
            Add new admin or cashier
          </p>

        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          {/* NAME */}
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

            <input
              type="password"
              required
              placeholder="Enter password"
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mt-1 outline-none focus:ring-2 focus:ring-black"
            />

          </div>

          {/* ROLE */}
          <div>

            <label className="text-sm font-medium text-gray-700">
              Select Role
            </label>

            <select
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mt-1 outline-none focus:ring-2 focus:ring-black"
            >
              <option value="cashier">
                Cashier
              </option>

              <option value="admin">
                Admin
              </option>
            </select>

          </div>

          {/* BUTTON */}
          <button
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-900 transition-all"
          >
            {loading
              ? "Creating..."
              : "Create User"}
          </button>

        </form>

        {/* LOGIN */}
        <p className="text-sm text-center text-gray-500 mt-6">

          Already have an account?

          <span
            onClick={() => navigate("/")}
            className="text-black font-semibold ml-1 cursor-pointer hover:underline"
          >
            Login
          </span>

        </p>

      </div>

    </div>
  );
};

export default Register;
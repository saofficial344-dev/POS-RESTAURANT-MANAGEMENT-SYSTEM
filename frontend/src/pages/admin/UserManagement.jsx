import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../services/api";

const ROLES = ["admin", "cashier", "kitchen", "waiter", "delivery", "manager"];

const ROLE_COLORS = {
  admin:    "bg-indigo-100 text-indigo-700",
  cashier:  "bg-emerald-100 text-emerald-700",
  kitchen:  "bg-amber-100  text-amber-700",
  waiter:   "bg-blue-100   text-blue-700",
  delivery: "bg-orange-100 text-orange-700",
  manager:  "bg-violet-100 text-violet-700",
};

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "cashier",
  branch: "",
};

// ─── Small helpers ────────────────────────────────────────────────────────────

const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${className}`}>
    {children}
  </span>
);

const FormField = ({ label, id, children }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
      {label}
    </label>
    {children}
  </div>
);

const inputCls =
  "w-full h-10 border border-gray-200 rounded-lg px-3 text-sm text-gray-900 outline-none transition-all hover:border-gray-400 focus:border-black focus:ring-2 focus:ring-black/10";

// ─── Main component ──────────────────────────────────────────────────────────

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState({ role: "", status: "" });
  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [showPw, setShowPw]         = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deleteId, setDeleteId]     = useState(null);
  // Admin creation verification — current admin must re-enter their own password
  const [adminVerifyPw, setAdminVerifyPw] = useState("");
  const [showAdminPw, setShowAdminPw]     = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────

  const loadUsers = async () => {
    try {
      const { data } = await API.get("/users");
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // ── Create / Edit ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowPw(false);
    setAdminVerifyPw("");
    setShowAdminPw(false);
    setShowModal(true);
  };

  const openEdit = (user) => {
    setForm({
      name:     user.name,
      email:    user.email || "",
      password: "",
      role:     user.role,
      branch:   user.branch || "",
    });
    setEditingId(user._id);
    setShowPw(false);
    setAdminVerifyPw("");
    setShowAdminPw(false);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = { ...form };
    // Don't send blank password on edit
    if (editingId && !payload.password) delete payload.password;

    // Creating a new admin requires the current admin's password for verification
    if (!editingId && form.role === "admin") {
      if (!adminVerifyPw) {
        toast.error("Enter your admin password to verify identity");
        setSaving(false);
        return;
      }
      payload.adminPassword = adminVerifyPw;
    }

    try {
      if (editingId) {
        await API.put(`/users/${editingId}`, payload);
        toast.success("User updated");
      } else {
        await API.post("/users", payload);
        toast.success(`${form.role === "admin" ? "Admin" : "User"} created successfully`);
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    try {
      await API.delete(`/users/${deleteId}`);
      toast.success("User deleted");
      setDeleteId(null);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  // ── Toggle Status ─────────────────────────────────────────────────────────

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const { data } = await API.patch(`/users/${userId}/status`);
      toast.success(`User ${data.status === "active" ? "activated" : "deactivated"}`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, status: data.status } : u))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Status update failed");
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────

  const visible = users.filter((u) => {
    if (filter.role   && u.role   !== filter.role)   return false;
    if (filter.status && u.status !== filter.status) return false;
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 min-h-full">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-400 mt-1">
            {users.length} staff member{users.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filter.role}
          onChange={(e) => setFilter({ ...filter, role: e.target.value })}
          className="h-9 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 outline-none hover:border-gray-400 focus:border-black transition-all capitalize"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r} className="capitalize">
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="h-9 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 outline-none hover:border-gray-400 focus:border-black transition-all"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {(filter.role || filter.status) && (
          <button
            onClick={() => setFilter({ role: "", status: "" })}
            className="h-9 px-3 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Loading users...
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <p className="text-sm font-medium">No users found</p>
            <p className="text-xs mt-1">Try adjusting your filters or add a new user</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Name", "Email", "Role", "Branch", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {user.name}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {user.email || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <Badge className={ROLE_COLORS[user.role] || "bg-gray-100 text-gray-600"}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {user.branch || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        className={
                          user.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-500"
                        }
                      >
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                          aria-label="Edit user"
                        >
                          <Pencil size={14} />
                        </button>

                        {/* Toggle status */}
                        <button
                          onClick={() => handleToggleStatus(user._id, user.status)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                          aria-label={user.status === "active" ? "Deactivate" : "Activate"}
                        >
                          {user.status === "active"
                            ? <ToggleRight size={16} className="text-green-500" />
                            : <ToggleLeft  size={16} className="text-gray-400" />}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteId(user._id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          aria-label="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit User" : "Create User"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSave} className="px-7 py-6 space-y-4">
              <FormField label="Username *" id="um-name">
                <input
                  id="um-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. john_cashier"
                  className={inputCls}
                />
              </FormField>

              <FormField label="Email (optional)" id="um-email">
                <input
                  id="um-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. john@bayroute.com"
                  className={inputCls}
                />
              </FormField>

              <FormField label={editingId ? "New Password (leave blank to keep)" : "Password *"} id="um-password">
                <div className="relative">
                  <input
                    id="um-password"
                    type={showPw ? "text" : "password"}
                    required={!editingId}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingId ? "Leave blank to keep current" : "Min 6 characters"}
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-gray-400 hover:text-gray-600 transition-colors rounded-r-lg focus-visible:outline-none"
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Role *" id="um-role">
                  <select
                    id="um-role"
                    required
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className={inputCls}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="capitalize">
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Branch" id="um-branch">
                  <input
                    id="um-branch"
                    type="text"
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                    placeholder="e.g. Main Branch"
                    className={inputCls}
                  />
                </FormField>
              </div>

              {/* Admin creation — identity verification */}
              {!editingId && form.role === "admin" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-800 mb-2">
                    Admin Account Verification
                  </p>
                  <p className="text-[11px] text-amber-700 mb-3 leading-relaxed">
                    Creating another Admin account is a sensitive action. Re-enter your own
                    admin password to confirm your identity.
                  </p>
                  <FormField label="Your Admin Password *" id="um-admin-verify">
                    <div className="relative">
                      <input
                        id="um-admin-verify"
                        type={showAdminPw ? "text" : "password"}
                        required
                        value={adminVerifyPw}
                        onChange={(e) => setAdminVerifyPw(e.target.value)}
                        placeholder="Enter your current password"
                        className={`${inputCls} pr-10`}
                      />
                      <button
                        type="button"
                        aria-label={showAdminPw ? "Hide" : "Show"}
                        onClick={() => setShowAdminPw((p) => !p)}
                        className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-gray-400 hover:text-gray-600 transition-colors rounded-r-lg focus-visible:outline-none"
                      >
                        {showAdminPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </FormField>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-10 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-10 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-7 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Delete User?</h3>
            <p className="text-gray-500 text-sm mt-2">
              This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={confirmDelete}
                className="flex-1 h-10 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 h-10 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagement;

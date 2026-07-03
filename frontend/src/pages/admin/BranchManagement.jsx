import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X,
  MapPin, Phone, Mail, Users, ShoppingBag, LayoutGrid,
  DollarSign, Star, RefreshCw, Search, Building2,
  ChevronLeft, ChevronRight, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import API from "../../services/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const TIMEZONES = [
  "Asia/Karachi", "Asia/Kolkata", "Asia/Dubai", "Asia/Riyadh",
  "Europe/London", "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Australia/Sydney", "Asia/Singapore",
];

const CURRENCIES = [
  { code: "PKR", label: "PKR — Pakistani Rupee" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "SAR", label: "SAR — Saudi Riyal" },
  { code: "INR", label: "INR — Indian Rupee" },
];

const EMPTY_FORM = {
  name: "", branchCode: "", email: "", phone: "",
  address: "", city: "", state: "", country: "Pakistan", postalCode: "",
  timezone: "Asia/Karachi", currency: "PKR", managerId: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => `Rs ${Math.round(n || 0).toLocaleString()}`;

const inputCls =
  "w-full h-10 border border-gray-200 rounded-lg px-3 text-sm text-gray-900 outline-none transition-all hover:border-gray-400 focus:border-black focus:ring-2 focus:ring-black/10";

const Field = ({ label, children, hint }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    active:   "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
};

const StatPill = ({ icon: Icon, label, value, color = "text-gray-700" }) => (
  <div className="flex items-center gap-1.5">
    <Icon size={13} className={`shrink-0 ${color}`} />
    <span className="text-xs text-gray-500">{label}</span>
    <span className={`text-xs font-bold ${color}`}>{value}</span>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const BranchManagement = () => {
  const [branches, setBranches]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [stats, setStats]         = useState({}); // branchId → stats
  const [managers, setManagers]   = useState([]);

  // Modal state
  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId]     = useState(null);
  const [deleting, setDeleting]     = useState(false);

  // Filters + pagination
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]       = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter)  params.set("status", statusFilter);

      const { data } = await API.get(`/branches?${params}`);
      setBranches(data.data);
      setPagination(data.pagination);

      // Load stats for each branch (fire-and-forget, non-blocking)
      data.data.forEach((b) => loadBranchStats(b._id));
    } catch {
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  const loadBranchStats = async (branchId) => {
    try {
      const { data } = await API.get(`/branches/${branchId}/stats`);
      setStats((prev) => ({ ...prev, [branchId]: data.data }));
    } catch {
      // Stats are non-critical; silently ignore failures
    }
  };

  const loadManagers = async () => {
    try {
      const { data } = await API.get("/users");
      setManagers(
        (Array.isArray(data) ? data : data.data || []).filter(
          (u) => ["manager", "admin"].includes(u.role) && u.status === "active"
        )
      );
    } catch {
      // Non-critical
    }
  };

  useEffect(() => { loadBranches(); }, [loadBranches]);
  useEffect(() => { loadManagers(); }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Create / Edit ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (branch) => {
    setForm({
      name:       branch.name || "",
      branchCode: branch.branchCode || "",
      email:      branch.email || "",
      phone:      branch.phone || "",
      address:    branch.address || "",
      city:       branch.city || "",
      state:      branch.state || "",
      country:    branch.country || "Pakistan",
      postalCode: branch.postalCode || "",
      timezone:   branch.timezone || "Asia/Karachi",
      currency:   branch.currency || "PKR",
      managerId:  branch.managerId?._id || "",
    });
    setEditingId(branch._id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Branch name is required"); return; }
    setSaving(true);
    try {
      const payload = { ...form, managerId: form.managerId || null };
      if (editingId) {
        await API.put(`/branches/${editingId}`, payload);
        toast.success("Branch updated");
      } else {
        await API.post("/branches", payload);
        toast.success("Branch created");
      }
      setShowModal(false);
      loadBranches();
    } catch (err) {
      const msg = err.response?.data?.message || "Operation failed";
      if (err.response?.data?.upgradeRequired) {
        toast.error(msg, { duration: 5000 });
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle status ─────────────────────────────────────────────────────────

  const handleToggle = async (branch) => {
    try {
      const { data } = await API.patch(`/branches/${branch._id}/status`);
      setBranches((prev) =>
        prev.map((b) => b._id === branch._id ? { ...b, status: data.data.status } : b)
      );
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Status update failed");
    }
  };

  // ── Set default ───────────────────────────────────────────────────────────

  const handleSetDefault = async (branchId) => {
    try {
      await API.patch(`/branches/${branchId}/set-default`);
      toast.success("Default branch updated");
      loadBranches();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to set default");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/branches/${deleteId}`);
      toast.success("Branch deleted");
      setDeleteId(null);
      loadBranches();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="p-6 lg:p-8 min-h-full">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branch Management</h1>
          <p className="text-sm text-gray-400 mt-1">
            {pagination.total} branch{pagination.total !== 1 ? "es" : ""} · multi-location operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadBranches}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            Add Branch
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search branches…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none hover:border-gray-400 focus:border-black transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 outline-none hover:border-gray-400 focus:border-black transition-all"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {(search || statusFilter) && (
          <button
            onClick={() => { setSearch(""); setStatusFilter(""); setPage(1); }}
            className="h-9 px-3 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Branch cards grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
              <div className="h-5 w-32 bg-gray-100 rounded mb-3" />
              <div className="h-4 w-20 bg-gray-50 rounded mb-4" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-gray-50 rounded" />
                <div className="h-3 w-2/3 bg-gray-50 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Building2 size={40} className="mb-4 text-gray-200" />
          <p className="text-sm font-medium">No branches found</p>
          <p className="text-xs mt-1">
            {search || statusFilter ? "Try adjusting your filters" : "Click \"Add Branch\" to create your first location"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((branch) => {
            const s = stats[branch._id];
            return (
              <BranchCard
                key={branch._id}
                branch={branch}
                stats={s}
                onEdit={() => openEdit(branch)}
                onDelete={() => setDeleteId(branch._id)}
                onToggle={() => handleToggle(branch)}
                onSetDefault={() => handleSetDefault(branch._id)}
              />
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600 font-medium">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl my-auto">

            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit Branch" : "Create Branch"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-7 py-6 space-y-5">

              {/* Row 1 — Name + Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Branch Name *">
                  <input
                    type="text" required
                    value={form.name} onChange={set("name")}
                    placeholder="e.g. Main Branch"
                    className={inputCls}
                  />
                </Field>
                <Field label="Branch Code" hint="Auto-generated if blank. Must be unique within restaurant.">
                  <input
                    type="text"
                    value={form.branchCode} onChange={set("branchCode")}
                    placeholder="e.g. BR001"
                    className={inputCls}
                    style={{ textTransform: "uppercase" }}
                  />
                </Field>
              </div>

              {/* Row 2 — Email + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Branch Email">
                  <input
                    type="email"
                    value={form.email} onChange={set("email")}
                    placeholder="branch@restaurant.com"
                    className={inputCls}
                  />
                </Field>
                <Field label="Branch Phone">
                  <input
                    type="tel"
                    value={form.phone} onChange={set("phone")}
                    placeholder="+92 300 0000000"
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Row 3 — Address */}
              <Field label="Street Address">
                <input
                  type="text"
                  value={form.address} onChange={set("address")}
                  placeholder="Street, building, floor"
                  className={inputCls}
                />
              </Field>

              {/* Row 4 — City + State + Country + Postal */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="City">
                  <input type="text" value={form.city} onChange={set("city")}
                    placeholder="Karachi" className={inputCls} />
                </Field>
                <Field label="State">
                  <input type="text" value={form.state} onChange={set("state")}
                    placeholder="Sindh" className={inputCls} />
                </Field>
                <Field label="Country">
                  <input type="text" value={form.country} onChange={set("country")}
                    placeholder="Pakistan" className={inputCls} />
                </Field>
                <Field label="Postal Code">
                  <input type="text" value={form.postalCode} onChange={set("postalCode")}
                    placeholder="75500" className={inputCls} />
                </Field>
              </div>

              {/* Row 5 — Timezone + Currency + Manager */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Timezone">
                  <select value={form.timezone} onChange={set("timezone")} className={inputCls}>
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </Field>
                <Field label="Currency">
                  <select value={form.currency} onChange={set("currency")} className={inputCls}>
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Branch Manager">
                  <select value={form.managerId} onChange={set("managerId")} className={inputCls}>
                    <option value="">— None —</option>
                    {managers.map((m) => (
                      <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit" disabled={saving}
                  className="flex-1 h-10 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : editingId ? "Update Branch" : "Create Branch"}
                </button>
                <button
                  type="button" onClick={() => setShowModal(false)}
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
            <h3 className="text-lg font-bold text-gray-900">Delete Branch?</h3>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              The branch will be soft-deleted. All historical data is preserved. Active orders must be resolved first.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={confirmDelete} disabled={deleting}
                className="flex-1 h-10 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
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

// ── Branch Card ───────────────────────────────────────────────────────────────
const BranchCard = ({ branch, stats, onEdit, onDelete, onToggle, onSetDefault }) => {
  const s = stats || {};

  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md flex flex-col gap-4 ${
      branch.status === "inactive" ? "border-gray-100 opacity-70" : "border-gray-100"
    }`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-gray-900 truncate">{branch.name}</h3>
            {branch.isDefault && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                <Star size={9} /> Default
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
              {branch.branchCode || "—"}
            </span>
            <StatusBadge status={branch.status} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            title="Edit branch"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            title={branch.status === "active" ? "Deactivate" : "Activate"}
          >
            {branch.status === "active"
              ? <ToggleRight size={16} className="text-green-500" />
              : <ToggleLeft  size={16} className="text-gray-400" />}
          </button>
          {!branch.isDefault && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Delete branch"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Location */}
      {(branch.address || branch.city) && (
        <div className="flex items-start gap-2 text-gray-500">
          <MapPin size={13} className="mt-0.5 shrink-0 text-gray-400" />
          <p className="text-xs leading-relaxed">
            {[branch.address, branch.city, branch.country].filter(Boolean).join(", ")}
          </p>
        </div>
      )}

      {/* Contact */}
      {(branch.phone || branch.email) && (
        <div className="flex flex-wrap gap-3">
          {branch.phone && (
            <div className="flex items-center gap-1.5 text-gray-500">
              <Phone size={12} className="text-gray-400" />
              <span className="text-xs">{branch.phone}</span>
            </div>
          )}
          {branch.email && (
            <div className="flex items-center gap-1.5 text-gray-500">
              <Mail size={12} className="text-gray-400" />
              <span className="text-xs truncate max-w-36">{branch.email}</span>
            </div>
          )}
        </div>
      )}

      {/* Manager */}
      {branch.managerId && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Users size={12} className="text-gray-400" />
          <span>Manager: <span className="font-medium text-gray-700">{branch.managerId.name}</span></span>
        </div>
      )}

      {/* Stats */}
      {stats !== undefined && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50">
          <StatPill icon={ShoppingBag} label="Active orders" value={s.activeOrders ?? "—"} color={s.activeOrders > 0 ? "text-amber-600" : "text-gray-600"} />
          <StatPill icon={Users}       label="Staff"         value={s.staffCount ?? "—"} />
          <StatPill icon={LayoutGrid}  label="Tables"        value={s.tableCount ?? "—"} />
          <StatPill icon={DollarSign}  label="Today"         value={s.dailyRevenue !== undefined ? `Rs ${Math.round(s.dailyRevenue).toLocaleString()}` : "—"} color={s.dailyRevenue > 0 ? "text-emerald-600" : "text-gray-600"} />
        </div>
      )}

      {/* Set default link */}
      {!branch.isDefault && branch.status === "active" && (
        <button
          onClick={onSetDefault}
          className="text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold text-left transition-colors"
        >
          Set as default →
        </button>
      )}

    </div>
  );
};

export default BranchManagement;

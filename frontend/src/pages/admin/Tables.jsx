import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import toast from "react-hot-toast";
import { Plus, X, Pencil, Trash2, RefreshCw } from "lucide-react";

const SECTIONS = ["Indoor", "Outdoor", "VIP", "Bar", "Lounge"];
const EMPTY_FORM = { tableNumber: "", capacity: "", section: "Indoor" };

const STATUS_STYLES = {
  Available:   { badge: "bg-green-100 text-green-700", card: "border-green-200" },
  Occupied:    { badge: "bg-red-100 text-red-700",     card: "border-red-200"   },
  Reserved:    { badge: "bg-amber-100 text-amber-700", card: "border-amber-200" },
  Maintenance: { badge: "bg-gray-100 text-gray-500",   card: "border-gray-200"  },
};

const Tables = () => {
  const [tables, setTables]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [deleteId, setDeleteId]   = useState(null);

  const fetchTables = useCallback(async () => {
    try {
      const { data } = await API.get("/tables");
      setTables(data.data || []);
    } catch {
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (t) => {
    setForm({ tableNumber: t.tableNumber, capacity: t.capacity, section: t.section });
    setEditId(t._id);
    setShowModal(true);
  };
  const closeModal = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tableNum = Number(form.tableNumber);
    const cap      = Number(form.capacity);

    if (!form.tableNumber || tableNum < 1) {
      toast.error("Enter a valid table number (≥ 1)");
      return;
    }
    if (!form.capacity || cap < 1 || cap > 20) {
      toast.error("Capacity must be between 1 and 20");
      return;
    }
    // Client-side duplicate guard — avoids a round-trip on obvious conflicts
    if (!editId && tables.some((t) => t.tableNumber === tableNum)) {
      toast.error(`Table ${tableNum} already exists`);
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await API.patch(`/tables/${editId}`, { capacity: cap, section: form.section });
        setTables((prev) =>
          prev.map((t) =>
            t._id === editId ? { ...t, capacity: cap, section: form.section } : t
          )
        );
        toast.success("Table updated");
      } else {
        const { data: res } = await API.post("/tables", {
          tableNumber: tableNum,
          capacity: cap,
          section: form.section,
        });
        // Insert new table into the sorted list immediately — no waiting for refetch
        setTables((prev) =>
          [...prev, res.data].sort((a, b) => a.tableNumber - b.tableNumber)
        );
        toast.success(`Table ${tableNum} created`);
      }
      closeModal();
      fetchTables(); // background sync
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await API.delete(`/tables/${deleteId}`);
      setTables((prev) => prev.filter((t) => t._id !== deleteId));
      toast.success("Table deleted");
      setDeleteId(null);
    } catch {
      toast.error("Delete failed");
    }
  };

  const clearTable = async (id) => {
    try {
      await API.patch(`/tables/${id}/clear`);
      toast.success("Table cleared");
      fetchTables();
    } catch {
      toast.error("Failed to clear table");
    }
  };

  // Marks a Maintenance table as clean and available again
  const markAvailable = async (id) => {
    try {
      await API.patch(`/tables/${id}/clean`);
      toast.success("Table set as available");
      fetchTables();
    } catch {
      toast.error("Failed to update table");
    }
  };

  const markCleaning = async (id) => {
    try {
      await API.patch(`/tables/${id}/needs-cleaning`);
      toast.success("Marked for cleaning");
      fetchTables();
    } catch {
      toast.error("Failed to update table");
    }
  };

  // Stats
  const counts = tables.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-4">

      {/* Header */}
      <div className="bg-white border border-gray-200 shadow-sm px-5 py-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Tables</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage restaurant seating</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTables}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
            >
              <Plus size={16} /> Add Table
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Total", value: tables.length, color: "text-black" },
          { label: "Available", value: counts.Available || 0, color: "text-green-600" },
          { label: "Occupied", value: counts.Occupied || 0, color: "text-red-600" },
          { label: "Reserved / Maintenance", value: (counts.Reserved || 0) + (counts.Maintenance || 0), color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">{label}</p>
            <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-14 text-center">
          <p className="text-5xl mb-3">🪑</p>
          <h2 className="text-lg font-bold text-gray-800">No tables yet</h2>
          <p className="text-sm text-gray-400 mt-1 mb-5">Create your first table to set up the floor plan</p>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Add First Table
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => {
            const style = STATUS_STYLES[table.status] || STATUS_STYLES.Available;
            return (
              <div
                key={table._id}
                className={`bg-white border-2 rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${style.card}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">T-{table.tableNumber}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{table.section} · {table.capacity} seats</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${style.badge}`}>
                    {table.status}
                  </span>
                </div>

                {/* Occupancy info */}
                {table.status === "Occupied" && table.occupiedBy && (
                  <p className="text-xs text-gray-400 mb-3">
                    {table.occupiedBy.numberOfGuests} guests · checked in {
                      table.occupiedBy.checkinTime
                        ? new Date(table.occupiedBy.checkinTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : ""
                    }
                  </p>
                )}
                {table.status === "Reserved" && table.reservedFor && (
                  <p className="text-xs text-gray-400 mb-3">
                    Reserved for {table.reservedFor.customerName || "guest"}
                  </p>
                )}
                {table.needsCleaning && (
                  <p className="text-[10px] font-semibold text-amber-600 mb-2">⚠ Needs cleaning</p>
                )}

                {/* Actions */}
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => openEdit(table)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  {table.status === "Occupied" && (
                    <button
                      onClick={() => clearTable(table._id)}
                      className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  {table.status === "Available" && (
                    <button
                      onClick={() => markCleaning(table._id)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Maintenance
                    </button>
                  )}
                  {table.status === "Maintenance" && (
                    <button
                      onClick={() => markAvailable(table._id)}
                      className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Set Available
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteId(table._id)}
                    className="ml-auto w-7 h-7 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editId ? "Edit Table" : "Add New Table"}</h2>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Table Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Table Number *</label>
                <input
                  type="number"
                  min="1"
                  value={form.tableNumber}
                  onChange={(e) => setForm({ ...form, tableNumber: e.target.value })}
                  placeholder="e.g. 5"
                  disabled={!!editId}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
                />
                {editId && <p className="text-[11px] text-gray-400 mt-1">Table number cannot be changed</p>}
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Seating Capacity (1–20) *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="e.g. 4"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              {/* Section */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Section</label>
                <select
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors"
                >
                  {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-10 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving ? "Saving…" : editId ? "Update" : "Create Table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Delete Table?</h3>
            <p className="text-sm text-gray-500 mt-1">Active table data will be permanently removed.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeleteId(null)} className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={confirmDelete} className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tables;

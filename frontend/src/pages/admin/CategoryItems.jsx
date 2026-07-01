import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../services/api";
import toast from "react-hot-toast";
import { X, Plus, Pencil, Trash2, ArrowLeft, ImageOff } from "lucide-react";

const EMPTY_FORM = { name: "", price: "", image: "", available: true, description: "" };

const statusColor = {
  true:  "bg-green-100 text-green-700",
  false: "bg-red-100 text-red-600",
};

const CategoryItems = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [editId, setEditId]     = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchItems = async () => {
    try {
      const { data } = await API.get("/items");
      const filtered = data.filter(
        (item) => String(item.category) === String(categoryId)
      );
      setItems(filtered);
    } catch {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [categoryId]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setForm({
      name:        item.name,
      price:       item.price,
      image:       item.image || "",
      available:   item.available !== false,
      description: item.description || "",
    });
    setEditId(item._id);
    setShowModal(true);
  };

  const closeModal = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Item name is required"); return; }
    if (!form.price || isNaN(form.price) || Number(form.price) < 0) {
      toast.error("Enter a valid price"); return;
    }
    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        price:       Number(form.price),
        image:       form.image.trim(),
        available:   form.available,
        description: form.description.trim(),
      };
      if (editId) {
        await API.put(`/items/${editId}`, payload);
        toast.success("Item updated");
      } else {
        await API.post("/items", { ...payload, category: categoryId });
        toast.success("Item added");
      }
      closeModal();
      fetchItems();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await API.delete(`/items/${deleteId}`);
      toast.success("Item deleted");
      setDeleteId(null);
      fetchItems();
    } catch {
      toast.error("Delete failed");
    }
  };

  const toggleAvailable = async (item) => {
    try {
      await API.put(`/items/${item._id}`, { available: !item.available });
      fetchItems();
    } catch {
      toast.error("Failed to update availability");
    }
  };

  const available = items.filter((i) => i.available !== false).length;
  const unavailable = items.length - available;

  return (
    <div className="min-h-screen bg-gray-50 p-4">

      {/* Header */}
      <div className="bg-white border border-gray-200 shadow-sm px-5 py-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/menu")}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900">Category Items</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage items in this category</p>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Total Items</p>
          <p className="text-3xl font-black text-black mt-1">{items.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Available</p>
          <p className="text-3xl font-black text-green-600 mt-1">{available}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Unavailable</p>
          <p className="text-3xl font-black text-red-500 mt-1">{unavailable}</p>
        </div>
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-14 text-center">
          <p className="text-4xl mb-3">🍽️</p>
          <h2 className="text-lg font-bold text-gray-800">No items yet</h2>
          <p className="text-sm text-gray-400 mt-1">Click "Add Item" to create the first item in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item._id}
              className={`bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${
                item.available === false ? "border-red-100" : "border-gray-200"
              }`}
            >
              {/* Image area */}
              <div className="h-36 bg-gray-50 flex items-center justify-center relative overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                  />
                ) : null}
                <div
                  className={`absolute inset-0 flex items-center justify-center text-gray-300 ${item.image ? "hidden" : "flex"}`}
                >
                  <ImageOff size={36} />
                </div>
                {/* Availability badge */}
                <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[String(item.available !== false)]}`}>
                  {item.available === false ? "Unavailable" : "Available"}
                </span>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
                <p className="text-xl font-black text-black mt-0.5">Rs {item.price}</p>
                {item.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => openEdit(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => toggleAvailable(item)}
                    className={`flex-1 h-8 text-xs font-semibold rounded-lg transition-colors ${
                      item.available === false
                        ? "bg-green-50 hover:bg-green-100 text-green-700"
                        : "bg-amber-50 hover:bg-amber-100 text-amber-700"
                    }`}
                  >
                    {item.available === false ? "Enable" : "Disable"}
                  </button>
                  <button
                    onClick={() => setDeleteId(item._id)}
                    className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editId ? "Edit Item" : "Add New Item"}
              </h2>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Item Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Grilled Chicken Burger"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Price (Rs) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="e.g. 450"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Image URL (optional)</label>
                <input
                  type="url"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of this item…"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors resize-none"
                />
              </div>

              {/* Available toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setForm({ ...form, available: !form.available })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    form.available ? "bg-black" : "bg-gray-200"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    form.available ? "translate-x-5" : "translate-x-0"
                  }`} />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {form.available ? "Available on menu" : "Hidden from menu"}
                </span>
              </label>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-10 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : editId ? "Update Item" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Delete Item?</h3>
            <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryItems;

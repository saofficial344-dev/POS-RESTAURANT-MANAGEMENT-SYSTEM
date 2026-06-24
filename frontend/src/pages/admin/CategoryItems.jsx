import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../../services/api";
import toast from "react-hot-toast";

const CategoryItems = () => {
  const { categoryId } = useParams();

  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", price: "" });
  const [editId, setEditId] = useState(null);

  const fetchItems = async () => {
    const { data } = await API.get("/items");

    const filtered = data.filter(
      (item) => item.category === categoryId
    );

    setItems(filtered);
  };

  useEffect(() => {
    fetchItems();
  }, [categoryId]);

  // ➕ ADD / ✏️ UPDATE
  const handleSubmit = async (e) => {
  e.preventDefault();

  // ❌ validation 1: empty fields
  if (!form.name.trim() || !form.price) {
    toast.error("⚠️ Item name and price are required!");
    return;
  }

  try {
    if (editId) {
      await API.put(`/items/${editId}`, form);
      toast.success("Item updated successfully!");
      setEditId(null);
    } else {
      await API.post("/items", {
        ...form,
        category: categoryId,
      });

      toast.success("Item added successfully!");
    }

    setForm({ name: "", price: "" });
    fetchItems();

  } catch (error) {
    console.log(error);
    toast.error("Something went wrong!");
  }
};

  // 🗑 DELETE
  const deleteItem = async (id) => {
    await API.delete(`/items/${id}`);
    fetchItems();
  };

  // ✏️ EDIT
  const handleEdit = (item) => {
    setForm({
      name: item.name,
      price: item.price,
    });
    setEditId(item._id);
  };

 return (
  <div className="min-h-screen bg-[#eef1f5] p-4">

    {/* HEADER */}
    <div className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.06)] px-5 py-4 mb-4">

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        {/* LEFT */}
        <div>

          <h1 className="text-[26px] font-black tracking-tight text-gray-900">
            Category Items
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Add, edit and manage items
            for this category
          </p>

        </div>

        {/* RIGHT */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-3"
        >

          {/* ITEM NAME */}
          <input
            className="h-[42px] w-full sm:w-[220px] px-4 border border-gray-300 bg-white text-sm font-medium outline-none hover:border-black focus:border-black shadow-sm transition-all"
            placeholder="Item name"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
          />

          {/* PRICE */}
          <input
            className="h-[42px] w-full sm:w-[140px] px-4 border border-gray-300 bg-white text-sm font-medium outline-none hover:border-black focus:border-black shadow-sm transition-all"
            placeholder="Price"
            value={form.price}
            onChange={(e) =>
              setForm({
                ...form,
                price: e.target.value,
              })
            }
          />

          {/* BUTTON */}
          <button
            className={`h-[42px] px-5 text-sm font-semibold transition-all shadow-lg active:scale-[0.98]
            ${
              editId
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : "bg-black hover:bg-gray-900 text-white"
            }`}
          >
            {editId
              ? "Update Item"
              : "Add Item"}
          </button>

        </form>

      </div>

    </div>

    {/* STATS */}
   {/* STATS */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

  {/* TOTAL ITEMS */}
  <div className="relative overflow-hidden bg-gradient-to-br from-black to-gray-800 text-white p-4 shadow-lg h-[120px]">

    <div className="absolute right-0 top-0 w-20 h-20 bg-white/5 rounded-full -mr-8 -mt-8"></div>

    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-300 font-semibold">
      Total Items
    </p>

    <h2 className="text-[26px] font-black mt-2">
      {items.length}
    </h2>

    <div className="mt-3 flex items-center justify-between">

      <span className="text-[10px] text-green-400 font-semibold">
        ACTIVE
      </span>

      <span className="text-[10px] text-gray-300">
        MENU ITEMS
      </span>

    </div>

  </div>

  {/* CATEGORY */}
  <div className="relative overflow-hidden bg-white border border-gray-200 p-4 shadow-md h-[120px]">

    <div className="absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-full -mr-6 -mt-6"></div>

    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold">
      Category
    </p>

    <h2 className="text-[26px] font-black text-black mt-2">
      Items
    </h2>

    <div className="mt-3 flex items-center justify-between">

      <span className="text-[10px] text-blue-600 font-semibold">
        MANAGEMENT
      </span>

      <span className="w-2 h-2 bg-blue-600"></span>

    </div>

  </div>

  {/* STATUS */}
  <div className="relative overflow-hidden bg-white border border-gray-200 p-4 shadow-md h-[120px]">

    <div className="absolute right-0 top-0 w-16 h-16 bg-orange-50 rounded-full -mr-6 -mt-6"></div>

    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold">
      Status
    </p>

    <h2 className="text-[26px] font-black text-black mt-2">
      Running
    </h2>

    <div className="mt-3 flex items-center justify-between">

      <span className="text-[10px] text-orange-600 font-semibold">
        LIVE DATABASE
      </span>

      <span className="w-2 h-2 bg-orange-500"></span>

    </div>

  </div>

</div>

    {/* EMPTY */}
    {items.length === 0 ? (

      <div className="bg-white border border-gray-200 shadow-sm p-10 text-center">

        <h2 className="text-xl font-bold text-gray-800">
          No Items Found
        </h2>

        <p className="text-sm text-gray-400 mt-2">
          Add your first item to start
          managing menu products
        </p>

      </div>

    ) : (

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

        {items.map((item) => (

          <div
            key={item._id}
            className="bg-white border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 max-w-[280px]"
          >

            {/* CARD HEADER */}
            <div className="border-b border-gray-200 px-4 py-3 bg-gradient-to-r from-[#fafafa] to-white">

              <div className="flex items-start justify-between">

                <div>

                  {/* <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">
                    Menu Item
                  </p> */}

                  <h2 className="text-[20px] font-black text-black mt-1 truncate max-w-[150px]">
                    {item.name}
                  </h2>

                </div>

                {/* <div className="w-9 h-9 bg-black text-white flex items-center justify-center font-black text-sm">

                  {item.name
                    ?.charAt(0)
                    ?.toUpperCase()}

                </div> */}

              </div>

            </div>

            {/* BODY */}
            <div className="p-3">

              {/* PRICE */}
              <div>

                <h3 className="text-sm font-semibold text-gray-800">
                  Item Price
                </h3>

                <p className="text-[18px] font-black text-black mt-1">
                  Rs {item.price}
                </p>

              </div>

              {/* ACTIONS */}
              <div className="mt-4 flex gap-2">

                {/* EDIT */}
                <button
                  onClick={() =>
                    handleEdit(item)
                  }
                  className="flex-1 h-9 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white text-[12px] font-semibold transition-all"
                >
                  Edit
                </button>

                {/* DELETE */}
                <button
                  onClick={() =>
                    deleteItem(item._id)
                  }
                  className="flex-1 h-9 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white text-[12px] font-semibold transition-all"
                >
                  Delete
                </button>

              </div>

            </div>

          </div>
        ))}

      </div>

    )}

  </div>
);
};

export default CategoryItems;
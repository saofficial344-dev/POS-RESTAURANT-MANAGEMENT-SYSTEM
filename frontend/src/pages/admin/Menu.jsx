import { useEffect, useState } from "react";
import API from "../../services/api";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  FolderKanban,
  ArrowRight,
} from "lucide-react";

const Menu = () => {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);

  const navigate = useNavigate();

  // FETCH CATEGORIES
  const fetchCategories = async () => {
    try {
      const { data } = await API.get("/categories");
      setCategories(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ADD / UPDATE
  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      if (editId) {
        await API.put(`/categories/${editId}`, {
          name,
        });

        setEditId(null);
      } else {
        await API.post("/categories", {
          name,
        });
      }

      setName("");
      fetchCategories();

    } catch (error) {
      console.log(error);
    }
  };

  // EDIT
  const handleEdit = (cat) => {
    setName(cat.name);
    setEditId(cat._id);
  };

  // DELETE
  const deleteCategory = async (id) => {
    const confirmDelete = window.confirm(
      "Delete this category?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/categories/${id}`);
      fetchCategories();
    } catch (error) {
      console.log(error);
    }
  };

 return (
  <div className="min-h-screen bg-[#eef1f5] p-4 mb-20">

    {/* HEADER */}
    <div className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.06)] px-5 py-4 mb-4">

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        {/* LEFT */}
        <div>

          <h1 className="text-[26px] font-black tracking-tight text-gray-900">
            Menu Categories
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Restaurant menu management &
            category overview
          </p>

        </div>

        {/* RIGHT */}
        <div className="flex flex-col sm:flex-row gap-3">

          {/* INPUT */}
          <input
            className="h-[42px] w-full sm:w-[260px] px-4 border border-gray-300 bg-white text-sm font-medium outline-none hover:border-black focus:border-black shadow-sm transition-all"
            placeholder="Enter category..."
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
          />

          {/* BUTTON */}
          <button
            onClick={handleSubmit}
            className={`h-[42px] px-5 text-sm font-semibold transition-all shadow-lg active:scale-[0.98]
            ${
              editId
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : "bg-black hover:bg-gray-900 text-white"
            }`}
          >
            {editId
              ? "Update Category"
              : "Add Category"}
          </button>

        </div>

      </div>

    </div>

    {/* STATS */}
    {/* STATS */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

  {/* TOTAL */}
  <div className="relative overflow-hidden bg-gradient-to-br from-black to-gray-800 text-white p-4 shadow-lg h-[120px]">

    <div className="absolute right-0 top-0 w-20 h-20 bg-white/5 rounded-full -mr-8 -mt-8"></div>

    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-300 font-semibold">
      Total Categories
    </p>

    <h2 className="text-[26px] font-medium mt-2">
      {categories.length}
    </h2>

    <div className="mt-3 flex items-center justify-between">

      <span className="text-[10px] text-green-400 font-semibold">
        ACTIVE
      </span>

      <span className="text-[10px] text-gray-300">
        MENU SYSTEM
      </span>

    </div>

  </div>

  {/* DASHBOARD */}
  <div className="relative overflow-hidden bg-white border border-gray-200 p-4 shadow-md h-[120px]">

    <div className="absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-full -mr-6 -mt-6"></div>

    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold">
      Dashboard
    </p>

    <h2 className="text-[26px] font-medium text-black mt-2">
      Admin
    </h2>

    <div className="mt-3 flex items-center justify-between">

      <span className="text-[10px] text-blue-600 font-semibold">
        MANAGEMENT
      </span>

      <span className="w-2 h-2 bg-blue-600"></span>

    </div>

  </div>

  {/* SYSTEM */}
  <div className="relative overflow-hidden bg-white border border-gray-200 p-4 shadow-md h-[120px]">

    <div className="absolute right-0 top-0 w-16 h-16 bg-orange-50 rounded-full -mr-6 -mt-6"></div>

    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold">
      System Status
    </p>

    <h2 className="text-[26px] font-medium text-black mt-2">
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
    {categories.length === 0 ? (

      <div className="bg-white border border-gray-200 shadow-sm p-10 text-center">

        <h2 className="text-xl font-bold text-gray-800">
          No Categories Found
        </h2>

        <p className="text-sm text-gray-400 mt-2">
          Add your first category to
          start managing menu items
        </p>

      </div>

    ) : (

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

        {categories.map((cat) => (

          <div
            key={cat._id}
            onClick={() =>
              navigate(`/admin/menu/${cat._id}`)
            }
            className="bg-white border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer max-w-[280px]"
          >

            {/* CARD HEADER */}
            <div className="border-b border-gray-200 px-4 py-3 bg-gradient-to-r from-[#fafafa] to-white">

              <div className="flex items-start justify-between">

                <div>

                  {/* <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">
                    Category
                  </p> */}

                  <h2 className="text-[20px] font-medium text-black mt-1 truncate max-w-[150px]">
                    {cat.name}
                  </h2>

                </div>


              </div>

            </div>

            {/* BODY */}
            <div className="p-3">

              <div>
 

                <p className="text-[11px] text-gray-400 mt-1">
                  Open category menu
                </p>

              </div>

              {/* ACTIONS */}
              <div className="mt-4 flex gap-2">

                {/* EDIT */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(cat);
                  }}
                  className="flex-1 h-9 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white text-[12px] font-semibold transition-all"
                >
                  Edit
                </button>

                {/* DELETE */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCategory(cat._id);
                  }}
                  className="flex-1 h-9 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white text-[12px] font-semibold transition-all"
                >
                  Delete
                </button>

              </div>

              {/* OPEN BUTTON */}
              {/* <button
                onClick={() =>
                  navigate(`/admin/menu/${cat._id}`)
                }
                className="w-full h-9 mt-2 bg-black text-white text-[12px] font-semibold hover:bg-gray-900 transition-all"
              >
                Open Category
              </button> */}

            </div>

          </div>
        ))}

      </div>

    )}

  </div>
);
};

export default Menu;
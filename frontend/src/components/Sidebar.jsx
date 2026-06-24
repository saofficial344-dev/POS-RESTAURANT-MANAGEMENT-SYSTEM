import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="w-64 min-h-screen bg-black text-white p-5 border-r border-gray-800 flex flex-col relative overflow-hidden">

      {/* BACKGROUND LAYER (black + white subtle mix) */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gray-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-white rounded-full blur-2xl"></div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col">

        {/* TOP SECTION */}
        <div>

          {/* LOGO + ROLE */}
          <div className="mb-24">

            <div className="bg-white text-black rounded-none p-4 shadow-lg text-center border border-gray-300">

              <h1 className="text-2xl font-extrabold tracking-wide">
                Bayroute
              </h1>

              <p className="text-xs font-semibold text-gray-600 mt-1 uppercase tracking-wider">
                {user?.role === "admin" ? "Admin Panel" : "Cashier Panel"}
              </p>

            </div>

          </div>

          {/* LINKS */}
          <div className="flex flex-col gap-4">

            {user?.role === "cashier" && (
              <>
                <Link
                  to="/cashier/menu"
                  className={`p-4 rounded-none flex justify-between items-center border transition-all duration-300
                  ${
                    location.pathname.includes("/cashier/menu")
                      ? "bg-white text-black border-white shadow-md"
                      : "bg-black border-gray-700 hover:bg-white hover:text-black"
                  }
                `}
                >
                  Menu <span>→</span>
                </Link>

                <Link
                  to="/cashier/bills"
                  className={`p-4 rounded-none flex justify-between items-center border transition-all duration-300
                  ${
                    location.pathname.includes("/cashier/bills")
                      ? "bg-white text-black border-white shadow-md"
                      : "bg-black border-gray-700 hover:bg-white hover:text-black"
                  }
                `}
                >
                  Bills <span>→</span>
                </Link>
              </>
            )}

            {user?.role === "admin" && (
              <>
                <Link
                  to="/admin/menu"
                  className={`p-4 rounded-none flex justify-between items-center border transition-all duration-300
                  ${
                    location.pathname.includes("/admin/menu")
                      ? "bg-white text-black border-white shadow-md"
                      : "bg-black border-gray-700 hover:bg-white hover:text-black"
                  }
                `}
                >
                  Menu <span>→</span>
                </Link>

                <Link
                  to="/admin/bills"
                  className={`p-4 rounded-none flex justify-between items-center border transition-all duration-300
                  ${
                    location.pathname.includes("/admin/bills")
                      ? "bg-white text-black border-white shadow-md"
                      : "bg-black border-gray-700 hover:bg-white hover:text-black"
                  }
                `}
                >
                  Bills <span>→</span>
                </Link>
              </>
            )}

          </div>

        </div>

      </div>
      {/* FOOTER TEXT */}
<div className="mt-auto pt-10 border-t border-gray-800 text-center text-gray-400 text-xs">

  <p className="font-semibold tracking-wide">
    ShahnaynLabs © 2026
  </p>

  <p className="mt-1 text-gray-500">
    Built for modern restaurant operations
  </p>

</div>
    </div>
  );
};

export default Sidebar;
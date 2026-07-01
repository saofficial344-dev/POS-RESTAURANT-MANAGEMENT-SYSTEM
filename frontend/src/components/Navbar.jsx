import { useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const location  = useLocation();
  const { user }  = useContext(AuthContext);

  // Hide on auth pages (workspace selector and role-specific login screens)
  if (location.pathname === "/" || location.pathname.startsWith("/login/")) {
    return null;
  }

  // Build a readable breadcrumb from the current path
  const crumb = location.pathname
    .split("/")
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-6 shrink-0">

      {/* Breadcrumb */}
      <p className="text-sm text-gray-400 capitalize tracking-wide">{crumb}</p>

      {/* User identity — logout lives in the Sidebar, not here */}
      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-800 leading-tight">{user.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold shrink-0">
            {user.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

    </div>
  );
};

export default Navbar;
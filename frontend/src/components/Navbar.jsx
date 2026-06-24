import { useNavigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { logout } = useContext(AuthContext);

  // hide on auth pages
  if (
    location.pathname === "/" ||
    location.pathname === "/register"
  ) {
    return null;
  }

  const logoutHandler = () => {

  // localStorage clear
  localStorage.clear();

  // sessionStorage clear
  sessionStorage.clear();

  // clear cookies
  document.cookie.split(";").forEach((cookie) => {
    document.cookie = cookie
      .replace(/^ +/, "")
      .replace(
        /=.*/,
        "=;expires=" + new Date(0).toUTCString() + ";path=/"
      );
  });

  logout();

  navigate("/", { replace: true });

  // hard refresh
  window.location.reload();
};

  return (
    <div className="h-16 border-b flex justify-end items-center px-6 bg-white">

      <button
        onClick={logoutHandler}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
      >
        Logout
      </button>

    </div>
  );
};

export default Navbar;
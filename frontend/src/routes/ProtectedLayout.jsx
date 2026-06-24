import { useContext } from "react";
import {
  Navigate,
  Outlet,
} from "react-router-dom";

import { AuthContext } from "../context/AuthContext";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
// import Footer from "../components/Footer";

const ProtectedLayout = ({ role }) => {
  const { user, loading } =
    useContext(AuthContext);

  // LOADING
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  // NOT LOGGED IN
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // ROLE CHECK
  if (role && user.role !== role) {
    return (
      <Navigate
        to={
          user.role === "admin"
            ? "/admin/menu"
            : "/cashier/menu"
        }
        replace
      />
    );
  }

  // MAIN LAYOUT
  return (
    <div className="min-h-screen flex">

      {/* SIDEBAR */}
      <Sidebar />

      {/* RIGHT SIDE */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* NAVBAR */}
        <Navbar />

        {/* PAGE */}
        <main className="flex-1 bg-gray-50">
          <Outlet />
        </main>

        {/* FOOTER */}
        {/* <Footer /> */}

      </div>

    </div>
  );
};

export default ProtectedLayout;
import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { getDashboardPath } from "../utils/roleConfig";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";

const ProtectedLayout = ({ role }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  // Not authenticated → workspace selector
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Wrong role → redirect to that user's own dashboard
  if (role && user.role !== role) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return (
    <div className="h-screen flex overflow-hidden">

      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 bg-gray-50 overflow-y-auto">
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default ProtectedLayout;
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";

const DashboardLayout = () => {
  return (
    <div>
      <Navbar />

      <div className="p-4 bg-gray-100 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
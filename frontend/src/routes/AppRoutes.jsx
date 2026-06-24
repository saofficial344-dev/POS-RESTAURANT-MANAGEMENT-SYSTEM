import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Register from "../pages/Register";

import DashboardLayout from "../layout/DashboardLayout";

// admin
import AdminMenu from "../pages/admin/Menu";
import AdminBills from "../pages/admin/Bills";

// cashier
import CashierMenu from "../pages/cashier/Menu";
import CashierBills from "../pages/cashier/Bills";

import { AuthProvider } from "../context/AuthContext";

const AppRoutes = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* AUTH */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* DASHBOARD WRAPPER */}
          <Route element={<DashboardLayout />}>

            {/* ADMIN */}
            <Route path="/admin/menu" element={<AdminMenu />} />
            <Route path="/admin/bills" element={<AdminBills />} />

            {/* CASHIER */}
            <Route path="/cashier/menu" element={<CashierMenu />} />
            <Route path="/cashier/bills" element={<CashierBills />} />

          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default AppRoutes;
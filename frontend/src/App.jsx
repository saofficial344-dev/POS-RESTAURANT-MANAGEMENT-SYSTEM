import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrintBill from "./pages/cashier/PrintBill";

import Login from "./pages/Login";
import Register from "./pages/Register";

import CashierMenu from "./pages/cashier/Menu";
import CashierBills from "./pages/cashier/Bills";

import AdminMenu from "./pages/admin/Menu";
import AdminBills from "./pages/admin/Bills";
import CategoryItems from "./pages/admin/CategoryItems";

import ProtectedLayout from "./routes/ProtectedLayout";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>

        <Routes>

          {/* PUBLIC ROUTES */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ADMIN ROUTES */}
          <Route element={<ProtectedLayout role="admin" />}>

            <Route
              path="/admin/menu"
              element={<AdminMenu />}
            />

            <Route
              path="/admin/menu/:categoryId"
              element={<CategoryItems />}
            />

            <Route
              path="/admin/bills"
              element={<AdminBills />}
            />

          </Route>

          {/* CASHIER ROUTES */}
          <Route element={<ProtectedLayout role="cashier" />}>

            <Route
              path="/cashier/menu"
              element={<CashierMenu />}
            />

            <Route
              path="/cashier/bills"
              element={<CashierBills />}
            />
          </Route>

          {/* PRINT BILL */}
          <Route
            path="/cashier/print/:id"
            element={<PrintBill />}
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      
          
        

      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
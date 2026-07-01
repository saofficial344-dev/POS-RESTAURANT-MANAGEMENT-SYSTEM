import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { POSProvider }  from "./context/POSContext";

import RoleSelector  from "./pages/RoleSelector";
import RoleLogin     from "./pages/RoleLogin";
import NotFound      from "./pages/NotFound";

import AdminRoutes    from "./routes/AdminRoutes";
import POSRoutes      from "./routes/POSRoutes";
import KitchenRoutes  from "./routes/KitchenRoutes";
import WaiterRoutes   from "./routes/WaiterRoutes";
import DeliveryRoutes from "./routes/DeliveryRoutes";
import ManagerRoutes  from "./routes/ManagerRoutes";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Workspace selector (new root) ── */}
          <Route path="/" element={<RoleSelector />} />

          {/* ── Unified role-specific login ── */}
          <Route path="/login/:role" element={<RoleLogin />} />

          {/* ── Admin ── */}
          <Route path="/admin/*" element={<AdminRoutes />} />

          {/* ── Cashier / POS — POSProvider scoped to this tree ── */}
          <Route
            path="/pos/*"
            element={
              <POSProvider>
                <POSRoutes />
              </POSProvider>
            }
          />

          {/* ── Kitchen — fullscreen standalone display ── */}
          <Route path="/kitchen/*" element={<KitchenRoutes />} />

          {/* ── Waiter ── */}
          <Route path="/waiter/*" element={<WaiterRoutes />} />

          {/* ── Delivery ── */}
          <Route path="/delivery/*" element={<DeliveryRoutes />} />

          {/* ── Manager ── */}
          <Route path="/manager/*" element={<ManagerRoutes />} />

          {/* ── Register removed from public — redirect anyone who lands here ── */}
          <Route path="/register" element={<Navigate to="/" replace />} />

          {/* ── 404 ── */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

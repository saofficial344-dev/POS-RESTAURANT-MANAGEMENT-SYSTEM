import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }   from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { POSProvider }    from "./context/POSContext";

import RoleSelector         from "./pages/RoleSelector";
import RoleLogin            from "./pages/RoleLogin";
import ForgotPassword       from "./pages/ForgotPassword";
import NotFound             from "./pages/NotFound";

import AdminRoutes    from "./routes/AdminRoutes";
import POSRoutes      from "./routes/POSRoutes";
import KitchenRoutes  from "./routes/KitchenRoutes";
import WaiterRoutes   from "./routes/WaiterRoutes";
import DeliveryRoutes from "./routes/DeliveryRoutes";
import ManagerRoutes  from "./routes/ManagerRoutes";
import PlatformRoutes from "./platform/routes/PlatformRoutes";

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Workspace selector (new root) ── */}
          <Route path="/" element={<RoleSelector />} />

          {/* ── Unified role-specific login ── */}
          <Route path="/login/:role" element={<RoleLogin />} />

          {/* ── Forgot password (OTP flow) ── */}
          <Route path="/forgot-password" element={<ForgotPassword />} />

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

          {/* ── Developer Platform (completely isolated) ── */}
          <Route path="/platform/*" element={<PlatformRoutes />} />

          {/* ── Old registration routes → redirect to home ── */}
          <Route path="/restaurant/register" element={<Navigate to="/" replace />} />
          <Route path="/register"            element={<Navigate to="/" replace />} />

          {/* ── 404 ── */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

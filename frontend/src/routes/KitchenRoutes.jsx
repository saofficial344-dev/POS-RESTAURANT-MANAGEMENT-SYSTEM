import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import KitchenDisplay from '../pages/kitchen/KitchenDisplay';

const KitchenRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white text-lg">
        Loading...
      </div>
    );
  }

  const isKitchen = user?.role === "kitchen";
  const loginRedirect = <Navigate to="/login/kitchen" replace />;

  return (
    <Routes>

      {/* Old /kitchen/login → unified login */}
      <Route path="login" element={<Navigate to="/login/kitchen" replace />} />

      {/* Protected kitchen display — kitchen role only */}
      <Route
        path="display"
        element={isKitchen ? <KitchenDisplay /> : loginRedirect}
      />

      <Route
        index
        element={<Navigate to={isKitchen ? "/kitchen/display" : "/login/kitchen"} replace />}
      />

      <Route
        path="*"
        element={<Navigate to={isKitchen ? "/kitchen/display" : "/login/kitchen"} replace />}
      />

    </Routes>
  );
};

export default KitchenRoutes;

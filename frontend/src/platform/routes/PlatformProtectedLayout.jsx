import { Navigate, Outlet } from 'react-router-dom';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import PlatformSidebar from '../components/PlatformSidebar';
import PlatformNavbar  from '../components/PlatformNavbar';

const PlatformProtectedLayout = () => {
  const { platformAdmin, loading } = usePlatformAuth();

  if (loading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!platformAdmin) {
    return <Navigate to="/platform/login" replace />;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-900">
      <PlatformSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <PlatformNavbar />
        <main className="flex-1 overflow-y-auto bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PlatformProtectedLayout;

import { useContext, Component } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { getDashboardPath } from "../utils/roleConfig";
import Sidebar      from "../components/Sidebar";
import Navbar       from "../components/Navbar";
import TrialBanner  from "../components/TrialBanner";

// ── Error Boundary: catches any render crash in page content ─────────────────
class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[PageErrorBoundary] Render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-10 bg-gray-50">
          <div className="bg-white border border-red-200 rounded-2xl shadow-md p-8 text-center max-w-md w-full">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-1">This page encountered an unexpected error.</p>
            <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2 mb-5 font-mono text-left break-words">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-5 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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

  // Wrong role → redirect to that user's own dashboard.
  if (role && user.role !== role) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  // Must change password — block all protected routes until done.
  if (user.mustChangePassword && user.role === 'admin') {
    return <Navigate to="/admin/change-password" replace />;
  }

  return (
    <div className="h-screen flex overflow-hidden">

      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <TrialBanner />
        <main className="flex-1 bg-gray-50 overflow-y-auto flex flex-col">
          <PageErrorBoundary>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>

    </div>
  );
};

export default ProtectedLayout;
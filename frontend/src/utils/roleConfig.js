/**
 * Single source of truth for role-specific metadata.
 * Every component that needs role info (RoleSelector, RoleLogin,
 * ProtectedLayout, Sidebar, dashboards) imports from here.
 */
export const ROLE_CONFIG = {
  admin: {
    label: "Admin Portal",
    icon: "👑",
    description: "Full system access & management",
    dashboardPath: "/admin/menu",
    loginPath: "/login/admin",
    accentColor: "#6366f1",
    sidebarLabel: "Admin Panel",
  },
  cashier: {
    label: "Cashier",
    icon: "💰",
    description: "POS, billing & payments",
    dashboardPath: "/pos/menu",
    loginPath: "/login/cashier",
    accentColor: "#10b981",
    sidebarLabel: "Cashier Panel",
  },
  kitchen: {
    label: "Kitchen",
    icon: "👨‍🍳",
    description: "Order management & preparation",
    dashboardPath: "/kitchen/display",
    loginPath: "/login/kitchen",
    accentColor: "#f59e0b",
    sidebarLabel: "Kitchen Panel",
  },
  waiter: {
    label: "Waiter",
    icon: "🍽️",
    description: "Table service & orders",
    dashboardPath: "/waiter/dashboard",
    loginPath: "/login/waiter",
    accentColor: "#3b82f6",
    sidebarLabel: "Waiter Panel",
  },
  delivery: {
    label: "Delivery",
    icon: "🚚",
    description: "Deliveries & route tracking",
    dashboardPath: "/delivery/dashboard",
    loginPath: "/login/delivery",
    accentColor: "#f97316",
    sidebarLabel: "Delivery Panel",
  },
  manager: {
    label: "Manager",
    icon: "👔",
    description: "Operations oversight & reports",
    dashboardPath: "/manager/dashboard",
    loginPath: "/login/manager",
    accentColor: "#8b5cf6",
    sidebarLabel: "Manager Panel",
  },
};

export const WORKSPACE_ORDER = [
  "admin",
  "cashier",
  "kitchen",
  "waiter",
  "delivery",
  "manager",
];

export const getDashboardPath = (role) =>
  ROLE_CONFIG[role]?.dashboardPath ?? "/";

export const getLoginPath = (role) =>
  ROLE_CONFIG[role]?.loginPath ?? "/";

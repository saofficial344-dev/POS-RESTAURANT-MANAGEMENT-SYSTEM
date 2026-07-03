import Permission from '../models/Permission.js';

export const initializeDefaultPermissions = async (req, res) => {
  try {
    const restaurantId = req.restaurantId || null;
    const existingPermissions = await Permission.countDocuments({ restaurantId });
    if (existingPermissions > 0) {
      return res.status(400).json({ success: false, message: 'Permissions already initialized' });
    }

    const defaultPerms = {
      SuperAdmin: {
        roleName: 'SuperAdmin',
        description: 'Full system access',
        permissions: {
          employees: { view: true, create: true, edit: true, delete: true, changeRole: true, resetPassword: true },
          menu: { view: true, create: true, edit: true, delete: true },
          categories: { view: true, create: true, edit: true, delete: true },
          orders: { view: true, create: true, edit: true, viewStatus: true, updateStatus: true },
          bills: { view: true, create: true, edit: true, delete: true, print: true },
          payment: { view: true, process: true, refund: true },
          tables: { view: true, manage: true, assign: true },
          reports: { view: true, sales: true, inventory: true, employees: true, export: true },
          settings: { view: true, manage: true, taxes: true, branches: true },
          dashboard: { view: true, analytics: true },
          pos: { access: true, processPayment: true },
          kitchen: { viewOrders: true, updateStatus: true },
        },
      },
      Admin: {
        roleName: 'Admin',
        description: 'Admin access - manage restaurant operations',
        permissions: {
          employees: { view: true, create: true, edit: true, delete: false, changeRole: true, resetPassword: true },
          menu: { view: true, create: true, edit: true, delete: true },
          categories: { view: true, create: true, edit: true, delete: true },
          orders: { view: true, create: true, edit: true, viewStatus: true, updateStatus: true },
          bills: { view: true, create: true, edit: true, delete: false, print: true },
          payment: { view: true, process: true, refund: false },
          tables: { view: true, manage: true, assign: true },
          reports: { view: true, sales: true, inventory: true, employees: true, export: true },
          settings: { view: true, manage: false, taxes: true, branches: false },
          dashboard: { view: true, analytics: true },
          pos: { access: true, processPayment: true },
          kitchen: { viewOrders: true, updateStatus: true },
        },
      },
      Manager: {
        roleName: 'Manager',
        description: 'Manager access - reports and analytics',
        permissions: {
          employees: { view: true, create: false, edit: false, delete: false, changeRole: false, resetPassword: false },
          menu: { view: true, create: false, edit: false, delete: false },
          categories: { view: true, create: false, edit: false, delete: false },
          orders: { view: true, create: false, edit: false, viewStatus: true, updateStatus: false },
          bills: { view: true, create: false, edit: false, delete: false, print: true },
          payment: { view: true, process: false, refund: false },
          tables: { view: true, manage: false, assign: false },
          reports: { view: true, sales: true, inventory: true, employees: true, export: true },
          settings: { view: false, manage: false, taxes: false, branches: false },
          dashboard: { view: true, analytics: true },
          pos: { access: false, processPayment: false },
          kitchen: { viewOrders: false, updateStatus: false },
        },
      },
      Cashier: {
        roleName: 'Cashier',
        description: 'Cashier access - POS and billing only',
        permissions: {
          employees: { view: false, create: false, edit: false, delete: false, changeRole: false, resetPassword: false },
          menu: { view: true, create: false, edit: false, delete: false },
          categories: { view: true, create: false, edit: false, delete: false },
          orders: { view: true, create: true, edit: false, viewStatus: true, updateStatus: false },
          bills: { view: true, create: true, edit: false, delete: false, print: true },
          payment: { view: true, process: true, refund: false },
          tables: { view: true, manage: false, assign: false },
          reports: { view: false, sales: false, inventory: false, employees: false, export: false },
          settings: { view: false, manage: false, taxes: false, branches: false },
          dashboard: { view: true, analytics: false },
          pos: { access: true, processPayment: true },
          kitchen: { viewOrders: false, updateStatus: false },
        },
      },
      Waiter: {
        roleName: 'Waiter',
        description: 'Waiter access - take orders and manage tables',
        permissions: {
          employees: { view: false, create: false, edit: false, delete: false, changeRole: false, resetPassword: false },
          menu: { view: true, create: false, edit: false, delete: false },
          categories: { view: true, create: false, edit: false, delete: false },
          orders: { view: true, create: true, edit: false, viewStatus: true, updateStatus: false },
          bills: { view: false, create: false, edit: false, delete: false, print: false },
          payment: { view: false, process: false, refund: false },
          tables: { view: true, manage: true, assign: true },
          reports: { view: false, sales: false, inventory: false, employees: false, export: false },
          settings: { view: false, manage: false, taxes: false, branches: false },
          dashboard: { view: false, analytics: false },
          pos: { access: false, processPayment: false },
          kitchen: { viewOrders: false, updateStatus: false },
        },
      },
      Kitchen: {
        roleName: 'Kitchen',
        description: 'Kitchen access - view and manage orders',
        permissions: {
          employees: { view: false, create: false, edit: false, delete: false, changeRole: false, resetPassword: false },
          menu: { view: true, create: false, edit: false, delete: false },
          categories: { view: true, create: false, edit: false, delete: false },
          orders: { view: true, create: false, edit: false, viewStatus: true, updateStatus: true },
          bills: { view: false, create: false, edit: false, delete: false, print: false },
          payment: { view: false, process: false, refund: false },
          tables: { view: false, manage: false, assign: false },
          reports: { view: false, sales: false, inventory: false, employees: false, export: false },
          settings: { view: false, manage: false, taxes: false, branches: false },
          dashboard: { view: false, analytics: false },
          pos: { access: false, processPayment: false },
          kitchen: { viewOrders: true, updateStatus: true },
        },
      },
    };

    const permissions = Object.values(defaultPerms).map(p => ({ ...p, restaurantId }));
    await Permission.insertMany(permissions);

    res.status(201).json({
      success: true,
      message: 'Default permissions initialized successfully',
      count: permissions.length,
      data: permissions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllPermissions = async (req, res) => {
  try {
    const restaurantId = req.restaurantId || null;
    const permissions = await Permission.find({ restaurantId }).sort({ roleName: 1 });

    res.status(200).json({ success: true, count: permissions.length, data: permissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPermissionByRole = async (req, res) => {
  try {
    const restaurantId = req.restaurantId || null;
    const permission = await Permission.findOne({ restaurantId, roleName: req.params.roleName });

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    res.status(200).json({ success: true, data: permission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;

    if (!permissions) {
      return res.status(400).json({ success: false, message: 'Please provide permissions object' });
    }

    const restaurantId = req.restaurantId || null;
    let permission = await Permission.findOne({ restaurantId, roleName: req.params.roleName });

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    permission.permissions = permissions;
    permission = await permission.save();

    res.status(200).json({ success: true, message: 'Permissions updated successfully', data: permission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkPermission = async (req, res) => {
  try {
    const { roleName, permission } = req.params;
    const restaurantId = req.restaurantId || null;
    const role = await Permission.findOne({ restaurantId, roleName });

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const [module, action] = permission.split('.');

    if (!module || !action) {
      return res.status(400).json({ success: false, message: 'Invalid permission format. Use "module.action"' });
    }

    const hasPermission = role.permissions[module] && role.permissions[module][action] === true;

    res.status(200).json({
      success: true,
      hasPermission,
      message: hasPermission ? 'User has permission' : 'User does not have permission',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPermissionModules = async (req, res) => {
  try {
    const modules = [
      { name: 'employees', label: 'Employee Management', actions: ['view', 'create', 'edit', 'delete', 'changeRole', 'resetPassword'] },
      { name: 'menu', label: 'Menu Management', actions: ['view', 'create', 'edit', 'delete'] },
      { name: 'categories', label: 'Categories', actions: ['view', 'create', 'edit', 'delete'] },
      { name: 'orders', label: 'Orders', actions: ['view', 'create', 'edit', 'viewStatus', 'updateStatus'] },
      { name: 'bills', label: 'Bills', actions: ['view', 'create', 'edit', 'delete', 'print'] },
      { name: 'payment', label: 'Payment', actions: ['view', 'process', 'refund'] },
      { name: 'tables', label: 'Table Management', actions: ['view', 'manage', 'assign'] },
      { name: 'reports', label: 'Reports', actions: ['view', 'sales', 'inventory', 'employees', 'export'] },
      { name: 'settings', label: 'Settings', actions: ['view', 'manage', 'taxes', 'branches'] },
      { name: 'dashboard', label: 'Dashboard', actions: ['view', 'analytics'] },
      { name: 'pos', label: 'POS', actions: ['access', 'processPayment'] },
      { name: 'kitchen', label: 'Kitchen', actions: ['viewOrders', 'updateStatus'] },
    ];

    res.status(200).json({ success: true, count: modules.length, data: modules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const grantPermission = async (req, res) => {
  try {
    const { roleName, module, action } = req.params;
    const restaurantId = req.restaurantId || null;
    let permission = await Permission.findOne({ restaurantId, roleName });

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (!permission.permissions[module]) {
      return res.status(400).json({ success: false, message: `Module ${module} does not exist` });
    }

    permission.permissions[module][action] = true;
    permission = await permission.save();

    res.status(200).json({ success: true, message: `Permission ${module}.${action} granted to ${roleName}`, data: permission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const revokePermission = async (req, res) => {
  try {
    const { roleName, module, action } = req.params;
    const restaurantId = req.restaurantId || null;
    let permission = await Permission.findOne({ restaurantId, roleName });

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (!permission.permissions[module]) {
      return res.status(400).json({ success: false, message: `Module ${module} does not exist` });
    }

    permission.permissions[module][action] = false;
    permission = await permission.save();

    res.status(200).json({ success: true, message: `Permission ${module}.${action} revoked from ${roleName}`, data: permission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
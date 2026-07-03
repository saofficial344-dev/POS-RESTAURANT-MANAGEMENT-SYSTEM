// Helpers that build on the restaurantId/branchId already set by protect().

// Roles that can see ALL branches within their restaurant.
const MULTI_BRANCH_ROLES = new Set(['admin']);

// Hard-require that this request has a restaurant context.
export const requireTenant = (req, res, next) => {
  if (!req.restaurantId) {
    return res.status(403).json({ message: 'Restaurant context required' });
  }
  return next();
};

// Restaurant-only filter — admin cross-branch queries.
export const tenantScope = (req, res, next) => {
  req.tenantFilter = req.restaurantId ? { restaurantId: req.restaurantId } : {};
  return next();
};

// Full scope: restaurant + branch for staff roles; restaurant-only for admin.
// Use this on data routes (orders, tables, bills, etc.) to auto-enforce branch isolation.
export const fullScope = (req, res, next) => {
  const { restaurantId, branchId } = req;
  const role = req.user?.role;

  if (!restaurantId) {
    req.scopeFilter = {};
  } else if (MULTI_BRANCH_ROLES.has(role)) {
    // Admin sees all branches of their restaurant
    req.scopeFilter = { restaurantId };
  } else if (branchId) {
    // Staff roles see only their assigned branch
    req.scopeFilter = { restaurantId, branchId };
  } else {
    // Staff with no branchId assigned — still scope by restaurant, branch isolation
    // enforced at branch assignment level (HR flow)
    req.scopeFilter = { restaurantId };
  }

  next();
};

// Guard: verify the requesting user may access a specific branch document.
// Non-admin roles can only touch their own branchId.
export const requireBranchAccess = (getBranchId) => (req, res, next) => {
  const role = req.user?.role;
  if (MULTI_BRANCH_ROLES.has(role)) return next(); // admin always allowed

  const targetBranchId = typeof getBranchId === 'function'
    ? getBranchId(req)
    : req.params.branchId || req.params.id;

  if (!targetBranchId) return next();

  if (!req.branchId || req.branchId.toString() !== targetBranchId.toString()) {
    return res.status(403).json({ message: 'Access denied: branch mismatch' });
  }

  return next();
};

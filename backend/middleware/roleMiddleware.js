export const adminOnly = (req, res, next) => {
  if (req.user?.role === "admin") return next();
  res.status(403).json({ message: "Admin access only" });
};

export const cashierOnly = (req, res, next) => {
  if (req.user?.role === "cashier") return next();
  res.status(403).json({ message: "Cashier access only" });
};

export const kitchenOnly = (req, res, next) => {
  if (req.user?.role === "kitchen") return next();
  res.status(403).json({ message: "Kitchen access only" });
};

export const waiterOnly = (req, res, next) => {
  if (req.user?.role === "waiter") return next();
  res.status(403).json({ message: "Waiter access only" });
};

export const deliveryOnly = (req, res, next) => {
  if (req.user?.role === "delivery") return next();
  res.status(403).json({ message: "Delivery access only" });
};

export const managerOnly = (req, res, next) => {
  if (req.user?.role === "manager") return next();
  res.status(403).json({ message: "Manager access only" });
};

// Use when a route is accessible by multiple roles
export const allowRoles = (...roles) =>
  (req, res, next) => {
    if (roles.includes(req.user?.role)) return next();
    res.status(403).json({ message: "Access denied" });
  };
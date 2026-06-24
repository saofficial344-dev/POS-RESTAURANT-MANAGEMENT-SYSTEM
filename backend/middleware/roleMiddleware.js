export const adminOnly = (req, res, next) => {
  if (req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Admin access only" });
  }
};

export const cashierOnly = (req, res, next) => {
  if (req.user.role === "cashier") {
    next();
  } else {
    res.status(403).json({ message: "Cashier access only" });
  }
};
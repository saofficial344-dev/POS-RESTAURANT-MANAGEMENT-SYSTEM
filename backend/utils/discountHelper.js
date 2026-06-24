export const validateDiscount = (discountType, discountValue, totalAmount) => {
  if (!discountType || discountValue == null || Number(discountValue) === 0) {
    return { valid: true, error: null };
  }

  const value = Number(discountValue);

  if (isNaN(value) || value < 0) {
    return { valid: false, error: "Discount value must be a positive number" };
  }

  if (discountType === "percentage" && value > 100) {
    return { valid: false, error: "Percentage discount cannot exceed 100%" };
  }

  if (discountType === "fixed" && value > totalAmount) {
    return { valid: false, error: "Fixed discount cannot exceed total amount" };
  }

  return { valid: true, error: null };
};

export const calculateDiscountAmount = (discountType, discountValue, totalAmount) => {
  if (!discountType || !discountValue) return 0;

  const value = Number(discountValue);

  if (discountType === "percentage") {
    return (totalAmount * value) / 100;
  }

  if (discountType === "fixed") {
    return value;
  }

  return 0;
};

export const calculateGrandTotal = (totalAmount, discountAmount) => {
  return Math.max(0, totalAmount - discountAmount);
};

export const formatBill = (bill) => {
  return `
  Table: ${bill.tableNo}
  -------------------------
  ${bill.items
    .map(
      (i) => `${i.name} x${i.quantity} = ${i.price * i.quantity}`
    )
    .join("\n")}
  -------------------------
  Total: ${bill.totalAmount}
  `;
};
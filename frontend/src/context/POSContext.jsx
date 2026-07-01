import React, { createContext, useContext, useState, useCallback } from 'react';

const POSContext = createContext();

export const POSProvider = ({ children }) => {
  const [currentOrder, setCurrentOrder] = useState({
    orderType: null,
    tableNumber: null,
    numberOfGuests: 1,
    items: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    customerName: '',
    customerPhone: '',
    notes: '',
  });

  const [cart, setCart] = useState([]);

  const addToCart = useCallback((item, quantity = 1, instructions = '') => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((i) => i.itemId === item._id);

      if (existingItem) {
        return prevCart.map((i) =>
          i.itemId === item._id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }

      return [
        ...prevCart,
        {
          itemId: item._id,
          itemName: item.name,
          price: item.price,
          quantity,
          specialInstructions: instructions,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((itemId) => {
    setCart((prevCart) => prevCart.filter((i) => i.itemId !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((i) =>
        i.itemId === itemId ? { ...i, quantity } : i
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const calculateTotal = useCallback(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = (subtotal * 5) / 100;
    const total = subtotal + tax - currentOrder.discount;

    setCurrentOrder((prev) => ({
      ...prev,
      items: cart,
      subtotal,
      tax,
      total,
    }));

    return { subtotal, tax, total };
  }, [cart, currentOrder.discount]);

  const resetOrder = useCallback(() => {
    setCurrentOrder({
      orderType: null,
      tableNumber: null,
      numberOfGuests: 1,
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      customerName: '',
      customerPhone: '',
      notes: '',
    });
    setCart([]);
  }, []);

  const value = {
    currentOrder,
    setCurrentOrder,
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    calculateTotal,
    resetOrder,
  };

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within POSProvider');
  }
  return context;
};

export default POSContext;
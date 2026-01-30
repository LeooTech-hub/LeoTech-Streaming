import React, { createContext, useState, useContext } from 'react';

// 1. Crear el contexto
export const CartContext = createContext();

// 2. Crear el componente proveedor (Provider)
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Función de ejemplo para agregar al carrito
  const addToCart = (product) => {
    setCart((prevCart) => [...prevCart, product]);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart }}>
      {children}
    </CartContext.Provider>
  );
};

// 3. Hook personalizado para usar el contexto más fácil (opcional)
export const useCart = () => useContext(CartContext);
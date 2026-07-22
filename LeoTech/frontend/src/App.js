import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; 
import Navbar from './components/Navbar';
import Pago from './components/Pago'; // ✅ Importación correcta del componente

// Importamos tus páginas
import Catalogo from './pages/Catalogo';
import Admin from './pages/Admin';
import LoginPage from './pages/LoginPage';
import DetalleProducto from './pages/DetalleProducto';
import Signup from './pages/Signup';
import Carrito from './pages/Carrito'; 
import { CartContext } from './context/CartContext'; 

// --- COMPONENTE DE SEGURIDAD ---
const RutaProtegida = ({ children }) => {
  const rolUsuario = localStorage.getItem('rol'); 
  if (rolUsuario !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  // 🛒 ESTADO DEL CARRITO (Global - Gestión manual en App.js)
  const [carrito, setCarrito] = useState(() => {
    const guardado = localStorage.getItem('carritoLeoTech');
    return guardado ? JSON.parse(guardado) : [];
  });

  // Efecto para guardar en localStorage cada vez que el carrito cambie
  useEffect(() => {
    localStorage.setItem('carritoLeoTech', JSON.stringify(carrito));
  }, [carrito]);

  // 1. Función para agregar productos
  const agregarAlCarrito = (producto, cantidad = 1) => {
    const cantNum = Number(cantidad) || 1;
    const existe = carrito.find(item => item.id === producto.id);
    
    if (existe) {
      const nuevoCarrito = carrito.map(item => {
        if (item.id === producto.id) {
          const prevCant = Number(item.cantidadElegida || item.cantidad || 1);
          const acumulado = prevCant + cantNum;
          return { ...item, cantidadElegida: acumulado, cantidad: acumulado };
        }
        return item;
      });
      setCarrito(nuevoCarrito);
    } else {
      const nuevoItem = { ...producto, cantidad: cantNum, cantidadElegida: cantNum };
      setCarrito([...carrito, nuevoItem]);
    }
  };

  // 2. Función para eliminar productos
  const eliminarDelCarrito = (id) => {
    const nuevoCarrito = carrito.filter(item => item.id !== id);
    setCarrito(nuevoCarrito);
  };

  // 3. Función para actualizar cantidad directamente
  const actualizarCantidad = (id, nuevaCantidad) => {
    const cantNum = Math.max(1, Number(nuevaCantidad) || 1);
    const nuevoCarrito = carrito.map(item => 
      item.id === id ? { ...item, cantidadElegida: cantNum, cantidad: cantNum } : item
    );
    setCarrito(nuevoCarrito);
  };

  return (
    <CartContext.Provider value={{ 
      addToCart: agregarAlCarrito, 
      cart: carrito, 
      removeFromCart: eliminarDelCarrito, 
      updateQuantity: actualizarCantidad, 
      clearCart: () => setCarrito([]) 
    }}>
      <div className="App">
        {/* Pasamos la cantidad de productos al Navbar para el numerito rojo */}
        <Navbar cantidadCarrito={carrito.length} />

        <Routes>
          <Route path="/" element={<Catalogo categoria="Todas" />} />
          <Route path="/cargadores" element={<Catalogo categoria="Cargadores" />} />
          <Route path="/cargadores/:nombreCategoria" element={<Catalogo />} />
          <Route path="/accesorios" element={<Catalogo categoria="Accesorios" />} />
          <Route path="/cases" element={<Catalogo categoria="Cases" />} />
          <Route path="/coleccion/:nombreCategoria" element={<Catalogo />} />

          {/* Pasamos la función agregarAlCarrito al Detalle */}
          <Route 
            path="/producto/:id" 
            element={<DetalleProducto agregarAlCarrito={agregarAlCarrito} />} 
          />

          {/* RUTA DEL CARRITO */}
          <Route 
            path="/carrito" 
            element={
              <Carrito 
                carrito={carrito} 
                eliminarDelCarrito={eliminarDelCarrito}
                actualizarCantidad={actualizarCantidad}
              />
            } 
          />

          {/* ✅ RUTA DE PAGO AGREGADA AQUI */}
          <Route path="/pago" element={<Pago />} />

          <Route 
            path="/admin" 
            element={
              <RutaProtegida>
                <Admin />
              </RutaProtegida>
            } 
          />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<Signup />} />
          <Route path="*" element={<Catalogo categoria="Todas" />} />
        </Routes>
      </div>
    </CartContext.Provider>
  );
}

export default App;
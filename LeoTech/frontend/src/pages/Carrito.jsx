import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // ✅ Importamos useNavigate
import './Carrito.css';

// Ahora recibimos las funciones y datos desde App.js
const Carrito = ({ carrito, eliminarDelCarrito, actualizarCantidad }) => {
  
  const navigate = useNavigate(); // ✅ Iniciamos el hook de navegación
  const [subtotal, setSubtotal] = useState(0);

  // Calcular totales cada vez que cambia el carrito "real"
  useEffect(() => {
    // Usamos reduce sobre el array 'carrito' que viene de App.js
    const newSubtotal = carrito.reduce((acc, item) => {
      return acc + (Number(item.precio) * Number(item.cantidadElegida || item.cantidad || 1));
    }, 0);
    
    setSubtotal(newSubtotal);
  }, [carrito]);

  // Manejador intermedio para validar el input antes de llamar a App.js
  const handleChangeInput = (id, valor) => {
    const cantidad = parseInt(valor);
    if (!isNaN(cantidad) && cantidad >= 1) {
      actualizarCantidad(id, cantidad);
    }
  };

  // Si el carrito está vacío, mostramos un mensaje amigable
  if (carrito.length === 0) {
    return (
      <div className="carrito-page-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h2>Tu carrito está vacío</h2>
        <p>Parece que aún no has agregado productos.</p>
        <Link to="/" className="checkout-btn" style={{ display: 'inline-block', width: 'auto', marginTop: '20px', textDecoration: 'none' }}>
          IR A LA TIENDA
        </Link>
      </div>
    );
  }

  return (
    <div className="carrito-page-container">
      
      <div className="carrito-content">
        {/* SECCIÓN 1: TABLA DE PRODUCTOS */}
        <div className="carrito-items-section">
          <table className="cart-table">
            <tbody>
              {carrito.map((item) => (
                <tr key={item.id} className="cart-item-row">
                  {/* Botón eliminar (X) llama a la función de App.js */}
                  <td className="col-remove">
                    <button 
                      onClick={() => eliminarDelCarrito(item.id)} 
                      className="remove-btn"
                      title="Eliminar producto"
                    >
                      ×
                    </button>
                  </td>
                  
                  {/* Imagen (usamos item.img o item.imagen según tu DB) */}
                  <td className="col-img">
                    <img 
                      src={item.imagen_url || item.img || item.imagen || "https://via.placeholder.com/150"} 
                      alt={item.nombre} 
                      className="product-thumb" 
                    />
                  </td>
                  
                  {/* Nombre */}
                  <td className="col-name">
                    <span className="product-name">{item.nombre}</span>
                  </td>
                  
                  {/* Precio Unitario */}
                  <td className="col-price">
                    S/{Number(item.precio).toFixed(2)}
                  </td>
                  
                  {/* Input Cantidad (conectado a App.js) */}
                  <td className="col-qty">
                    <input 
                      type="number"
                      min="1"
                      value={item.cantidadElegida || item.cantidad || 1} 
                      onChange={(e) => handleChangeInput(item.id, e.target.value)}
                      className="qty-input"
                    />
                  </td>
                  
                  {/* Subtotal del Item */}
                  <td className="col-subtotal">
                    S/{(Number(item.precio) * Number(item.cantidadElegida || item.cantidad || 1)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SECCIÓN 2: BOLETA DE TOTALES */}
        <div className="carrito-totals-section">
          <h3 className="totals-header">TOTALES DEL CARRITO</h3>
          <hr className="divider" />
          
          <div className="totals-row">
            <span className="label">SUBTOTAL</span>
            <span className="value">S/{subtotal.toFixed(2)}</span>
          </div>

          <div className="totals-row shipping-row">
            <span className="label">ENVÍO</span>
            <div className="shipping-details">
              <span className="shipping-title">ENVIÓ A DOMICILIO</span>
              <p className="shipping-note">Las opciones de envío se actualizarán durante el pago.</p>
            </div>
          </div>
          
          <hr className="divider" />

          <div className="totals-row total-final">
            <span className="label">TOTAL</span>
            <span className="value">S/{subtotal.toFixed(2)}</span>
          </div>

          {/* ✅ BOTÓN CORREGIDO: Ahora redirige a /pago */}
          <button 
            className="checkout-btn"
            onClick={() => navigate('/pago')}
          >
            FINALIZAR COMPRA
          </button>
        </div>
      </div>

      {/* Enlace inferior */}
      <div className="continue-shopping">
        <Link to="/" className="continue-link">SEGUIR COMPRANDO</Link>
      </div>

    </div>
  );
};

export default Carrito;
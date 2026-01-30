import React, { useContext } from 'react';
import { CartContext } from '../context/CartContext'; 
import { useNavigate } from 'react-router-dom';

const Pago = () => {
  const { cart } = useContext(CartContext); 
  const navigate = useNavigate();

  // Calculamos el total asegurándonos de que los precios sean números
  const total = cart.reduce((acc, item) => {
    return acc + (Number(item.precio) * Number(item.cantidad || item.cantidadElegida || 1));
  }, 0);

  // TU NÚMERO DE YAPE
  const miNumeroYape = "906329361"; 
  const nombreYape = "Leonardo Rodriguez";

  const handleConfirmarPedido = () => {
    let mensaje = `👋 Hola, acabo de yapear S/ ${total.toFixed(2)} por el siguiente pedido:\n\n`;
    
    cart.forEach(prod => {
      mensaje += `▪️ ${prod.nombre} (x${prod.cantidad || prod.cantidadElegida || 1})\n`;
    });

    mensaje += `\n💰 *Total: S/ ${total.toFixed(2)}*`;
    mensaje += `\n📍 *Envío adjunto mi comprobante de pago.*`;

    const url = `https://wa.me/51${miNumeroYape}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  // Si no hay carrito, mostramos botón para volver
  if (!cart || cart.length === 0) {
    return (
        <div className="container mt-5 text-center">
            <h3>No hay productos para pagar</h3>
            <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>Volver a la tienda</button>
        </div>
    );
  }

  return (
    <div className="container mt-5 mb-5">
      <h2 className="text-center mb-4 text-primary fw-bold">FINALIZAR PAGO</h2>
      
      <div className="row">
        {/* COLUMNA IZQUIERDA: Resumen */}
        <div className="col-md-6 mb-4">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-bold">Resumen del Pedido</div>
            <ul className="list-group list-group-flush">
              {cart.map((item, index) => (
                <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>
                    {item.nombre} 
                    <small className="text-muted ms-2">
                        x{item.cantidad || item.cantidadElegida || 1}
                    </small>
                  </span>
                  <span>S/ {(Number(item.precio) * Number(item.cantidad || item.cantidadElegida || 1)).toFixed(2)}</span>
                </li>
              ))}
              <li className="list-group-item d-flex justify-content-between bg-light fw-bold">
                <span>TOTAL A PAGAR</span>
                <span className="text-danger fs-5">S/ {total.toFixed(2)}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* COLUMNA DERECHA: Yape */}
        <div className="col-md-6">
          <div className="card text-center shadow border-0" style={{ backgroundColor: '#742284', color: 'white' }}>
            <div className="card-body py-5">
              <h3 className="fw-bold mb-3">¡Paga con Yape!</h3>
              <p>Escanea el código QR o yapea al número:</p>
              
              <h2 className="fw-bold bg-white text-dark d-inline-block px-3 py-1 rounded">
                {miNumeroYape}
              </h2>
              <p className="mt-2">{nombreYape}</p>

              {/* ✅ AQUÍ ESTÁ TU CÓDIGO QR REAL */}
              <div className="bg-white p-3 d-inline-block rounded my-3">
                <img 
                    src="/imagenes/qr-yape.jpeg" 
                    alt="QR Yape" 
                    width="200" 
                    style={{ borderRadius: '8px' }}
                />
              </div>

              <div className="alert alert-light text-dark mt-3 small text-start">
                <strong>Instrucciones:</strong>
                <ol className="mb-0 ps-3">
                  <li>Abre Yape en tu celular.</li>
                  <li>Escanea el QR o ingresa el número.</li>
                  <li>Realiza el pago por <strong>S/ {total.toFixed(2)}</strong>.</li>
                  <li>Dale clic al botón de abajo para enviar el pedido.</li>
                </ol>
              </div>

              <button 
                onClick={handleConfirmarPedido}
                className="btn btn-light w-100 fw-bold text-uppercase mt-2 py-3"
                style={{ color: '#742284' }}
              >
                <i className="bi bi-whatsapp me-2"></i> Enviar Pedido y Comprobante
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pago;
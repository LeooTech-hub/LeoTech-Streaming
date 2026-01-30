import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

// 🧠 CEREBRO DE CONEXIÓN
const isLocal = window.location.hostname.includes("localhost") || window.location.hostname.includes("192.168");
const API_URL = isLocal 
  ? "http://192.168.1.5:8081" 
  : "https://leotech-streaming.onrender.com"; 

// CAMBIO 1: Recibimos la función 'agregarAlCarrito' como propiedad (prop)
function DetalleProducto({ agregarAlCarrito }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 🔢 NUEVO ESTADO: CONTROL DE CANTIDAD
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    axios.get(`${API_URL}/productos`)
      .then(res => {
        const encontrado = res.data.find(p => p.id === parseInt(id));
        setProducto(encontrado);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;
  if (!producto) return <div className="text-center mt-5"><h3>Producto no encontrado 😢</h3><Link to="/">Volver</Link></div>;

  const getImagen = (img) => {
    if (!img) return 'https://via.placeholder.com/300?text=Sin+Foto';
    const primera = img.split(',')[0].trim();
    return primera.startsWith('http') ? primera : `/imagenes/${primera}`;
  };

  // 🔢 LÓGICA PARA CAMBIAR CANTIDAD
  const handleCantidadChange = (e) => {
    let val = parseInt(e.target.value);
    if(isNaN(val) || val < 1) val = 1; // Mínimo 1
    if(val > producto.stock) val = producto.stock; // Máximo lo que tengas en stock
    setCantidad(val);
  };

  const handleComprarAhora = () => {
    const numeroWhatsApp = "51906320361";
    
    // 💰 CALCULAMOS EL TOTAL AUTOMÁTICAMENTE
    const totalPagar = (parseFloat(producto.precio) * cantidad).toFixed(2);

    // USAMOS CÓDIGOS UNICODE PARA EMOJIS (A prueba de errores)
    const mensaje = "Hola LeoTech! \uD83D\uDC4B\n\n" +
                    "Estoy interesado en comprar:\n" +
                    "\uD83D\uDCE6 *" + producto.nombre + "*\n" +
                    "🔢 Cantidad: *" + cantidad + " unidades*\n" +
                    "\uD83D\uDCB0 Precio Unitario: *S/ " + producto.precio + "*\n" +
                    "-----------------------------------\n" +
                    "\uD83D\uDCB5 *TOTAL A PAGAR: S/ " + totalPagar + "*\n" +
                    "-----------------------------------\n\n" +
                    "¿Me confirman stock y métodos de pago? \uD83D\uDE80";

    window.open(`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  return (
    <div className="container mt-5 mb-5">
      <button onClick={() => navigate(-1)} className="btn btn-outline-secondary mb-4 rounded-pill">
        <i className="bi bi-arrow-left me-2"></i>Seguir comprando
      </button>

      <div className="card shadow-lg border-0" style={{borderRadius: '20px', overflow: 'hidden'}}>
        <div className="row g-0">
          
          <div className="col-md-6 bg-white d-flex align-items-center justify-content-center p-5">
            <img 
              src={getImagen(producto.imagen_url)} 
              alt={producto.nombre} 
              className="img-fluid"
              style={{maxHeight: '400px', objectFit: 'contain'}}
            />
          </div>

          <div className="col-md-6 p-5 bg-light">
            <div className="mb-2">
                <span className="badge bg-primary me-2">{producto.categoria}</span>
                {producto.oferta === 1 && <span className="badge bg-danger">OFERTA 🔥</span>}
            </div>
            
            <h1 className="fw-bold text-dark mb-3">{producto.nombre}</h1>
            
            <h2 className="text-success fw-bold mb-4" style={{fontSize: '2.5rem'}}>
              S/ {parseFloat(producto.precio).toFixed(2)}
            </h2>

            <div className="mb-4">
                <h5 className="fw-bold text-muted border-bottom pb-2">Descripción</h5>
                <p className="text-secondary" style={{fontSize: '1.1rem', lineHeight: '1.6'}}>
                    {producto.descripcion || "Producto de excelente calidad garantizada."}
                </p>
                <div className="text-muted small">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>Stock: {producto.stock} unid.
                </div>
            </div>

            {/* --- ZONA DE COMPRA --- */}
            <div className="d-flex align-items-center gap-3 mb-3">
                {/* 1. CAJITA DE CANTIDAD */}
                <div style={{width: '80px'}}>
                    <label className="small fw-bold text-muted mb-1">Cant.</label>
                    <input 
                        type="number" 
                        className="form-control text-center fw-bold" 
                        value={cantidad} 
                        onChange={handleCantidadChange}
                        min="1" 
                        max={producto.stock}
                        style={{height: '50px', fontSize: '1.2rem', borderRadius: '10px'}}
                    />
                </div>

                {/* 2. BOTÓN WHATSAPP */}
                <div className="flex-grow-1 d-grid gap-2">
                    <button 
                        onClick={handleComprarAhora}
                        className="btn btn-dark rounded-pill fw-bold shadow-sm"
                        style={{height: '50px', fontSize: '1.1rem'}}
                    >
                        COMPRARLO YA !
                    </button>
                </div>
            </div>

            {/* CAMBIO 2: BOTÓN DEL CARRITO CONECTADO */}
            <div className="d-grid">
                <button 
                    className="btn btn-outline-danger rounded-pill fw-bold py-2"
                    onClick={() => {
                        // Verificamos que la función exista antes de usarla
                        if (agregarAlCarrito) {
                            agregarAlCarrito(producto, cantidad);
                            alert(`✅ ¡Agregaste ${cantidad} ${producto.nombre} al carrito!`);
                        } else {
                            console.error("Error: Función agregarAlCarrito no recibida desde App.js");
                        }
                    }}
                    style={{borderWidth: '2px'}}
                >
                    <i className="bi bi-cart-plus me-2"></i>
                    AÑADIR AL CARRITO
                </button>
            </div>
            {/* ------------------------------------------- */}

          </div>
        </div>
      </div>
    </div>
  );
}

export default DetalleProducto;
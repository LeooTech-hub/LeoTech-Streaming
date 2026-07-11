import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';

function ProductCard({ producto }) {
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext); 

  // --- Lógica de Imagen ---
  const nombreArchivo = producto.imagen_url || producto.imagen || producto.foto;
  let rutaFinalImagen = "https://placehold.co/300x300?text=Sin+Foto";

  if (nombreArchivo) {
      if (nombreArchivo.startsWith("http")) {
          rutaFinalImagen = nombreArchivo;
      } else {
          rutaFinalImagen = `/imagenes/${nombreArchivo}`;
      }
  }

  const handleComprar = (e) => {
    e.stopPropagation();
    if (addToCart) {
        addToCart(producto);
        navigate('/carrito');
    }
  };

  const handleAgregar = (e) => {
    e.stopPropagation();
    if (addToCart) {
        addToCart(producto);
        alert("✅ Agregado al carrito"); 
    }
  };

  return (
    <div 
      className="card h-100 shadow-sm border-0" 
      onClick={() => navigate(`/producto/${producto.id}`)} 
      style={{cursor: 'pointer', transition: 'transform 0.2s'}}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
        {/* IMAGEN */}
        <div style={{ height: '220px', position: 'relative' }} className="d-flex align-items-center justify-content-center bg-white rounded-top border-bottom">
            <img 
                src={rutaFinalImagen} 
                className="p-3" 
                alt={producto.nombre} 
                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                onError={(e) => { e.target.src = "https://placehold.co/300x300?text=Error+Img"; }}
            />
            {/* ELIMINADO: Aquí estaba la etiqueta de Stock.
               Se ha borrado el <span> para limpiar la interfaz.
            */}
        </div>

        {/* CUERPO */}
        <div className="card-body d-flex flex-column">
            {/* Título */}
            <h5 className="card-title text-dark fw-bold" style={{ fontSize: '1.1rem' }}>
                {producto.nombre}
            </h5>
            
            {/* Categoría */}
            <h6 className="card-subtitle mb-2 text-primary small">
                {producto.categoria}
            </h6>

            {/* Descripción */}
            <p className="card-text text-muted small" style={{ minHeight: '40px' }}>
                {producto.descripcion ? producto.descripcion : <i>Sin descripción</i>}
            </p>

            <div className="mt-auto mb-3">
                <span className="h4 fw-bold text-primary">
                    {/* Aseguramos que sea número antes de usar toFixed */}
                    S/ {Number(producto.precio).toFixed(2)}
                </span>
            </div>

            {/* BOTONES */}
            <div className="d-grid gap-2">
                <button className="btn btn-dark fw-bold rounded-pill" onClick={handleComprar}>
                    Comprar ahora
                </button>
                <button className="btn btn-outline-success fw-bold rounded-pill" onClick={handleAgregar}>
                    <i className="bi bi-cart-plus-fill me-1"></i> + Carrito
                </button>
            </div>
        </div>
    </div>
  );
}

export default ProductCard;
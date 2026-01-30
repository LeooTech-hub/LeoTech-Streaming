import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom'; 
import ProductCard from '../components/ProductCard'; 

function Catalogo({ categoria }) { 
  const { nombreCategoria } = useParams(); 
  
  // Determinamos qué categoría mostrar
  const categoriaActual = categoria || nombreCategoria || "Todas";

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar productos
  useEffect(() => {
    setLoading(true);
    axios.get('https://leotech-streaming.onrender.com/productos')
      .then(res => {
        
        // --- LÓGICA DE FILTRADO MEJORADA (Igual que en Admin) ---
        const productosFiltrados = res.data.filter(p => {
            // 1. Primero verificamos si es visible
            const esVisible = p.visible === 1 || p.visible === true; 
            if (!esVisible) return false;

            // 2. Si es "Todas", pasa directo
            if (categoriaActual === "Todas") return true;

            // 3. Definimos tus categorías "oficiales" de la base de datos
            const categoriasPrincipales = ['Cases', 'Auriculares', 'Cargadores', 'Accesorios', 'Streaming'];

            // CASO A: Es una categoría principal (Ej: Click en "Cargadores")
            if (categoriasPrincipales.includes(categoriaActual)) {
                return p.categoria && p.categoria === categoriaActual;
            }

            // CASO B: Es un modelo (Ej: Click en "iPhone 13")
            // Aquí buscamos si el NOMBRE del producto incluye el texto (ej: "Case Silicona iPhone 13")
            return p.nombre && p.nombre.toLowerCase().includes(categoriaActual.toLowerCase());
        });
        // ------------------------------------------------

        setProductos(productosFiltrados);
        setLoading(false);
      })
      .catch(err => {
        console.log(err);
        setLoading(false);
      });
  }, [categoriaActual]); 

  return (
    <div className="container my-4">
      <h2 className="text-center mb-4 fw-bold text-uppercase" style={{color: '#4e54c8'}}>
        {categoriaActual}
      </h2>

      {loading && (
         <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Cargando...</span></div>
         </div>
      )}

      {!loading && (
          <div className="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-4">
            {productos.map((prod) => (
              <div className="col" key={prod.id}>
                <ProductCard producto={prod} />
              </div>
            ))}
          </div>
      )}

      {!loading && productos.length === 0 && (
        <div className="text-center mt-5">
            <p className="text-muted">No hay productos disponibles para: <strong>{categoriaActual}</strong></p>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => window.location.href='/'}>Ver todos los productos</button>
        </div>
      )}
    </div>
  );
}

export default Catalogo; 
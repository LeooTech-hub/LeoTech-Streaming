import React, { useState } from 'react';
import VistaProductos from './VistaProductos';
import VistaStreaming from './VistaStreaming';

function Admin() {
  const [pestanaActiva, setPestanaActiva] = useState('productos');

  // 🧠 CEREBRO DE CONEXIÓN
  const isLocal = window.location.hostname.includes("localhost") || window.location.hostname.includes("192.168");
  const URL_API = isLocal ? "http://localhost:8081" : "https://leotech-streaming.onrender.com"; 

  return (
    <div className="container mt-4 mb-5" id="form-top">
      <h2 className="text-center fw-bold mb-4" style={{color:'#343a40'}}>PANEL ADMIN</h2>
      
      <div className="d-flex justify-content-center gap-3 mb-5">
        <button 
            className={`btn rounded-pill px-4 fw-bold ${pestanaActiva==='productos'?'btn-dark':'btn-light shadow-sm'}`} 
            onClick={()=>setPestanaActiva('productos')}>
            PRODUCTOS Y GASTOS
        </button>
        <button 
            className={`btn rounded-pill px-4 fw-bold ${pestanaActiva==='clientes'?'btn-dark':'btn-light shadow-sm'}`} 
            onClick={()=>setPestanaActiva('clientes')}>
            STREAMING
        </button>
      </div>

      {/* Renderizado Condicional de Componentes */}
      {pestanaActiva === 'productos' ? (
          <VistaProductos api={URL_API} />
      ) : (
          <VistaStreaming api={URL_API} />
      )}

    </div>
  );
}

export default Admin;
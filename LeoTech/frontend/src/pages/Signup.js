import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../api';

function Signup() {
  const [values, setValues] = useState({
    nombre: '',
    correo: '',
    password: ''
  });

  // Nuevo estado para manejar mensajes profesionales
  const [mensaje, setMensaje] = useState(null); // null, { tipo: 'success', texto: '' } o { tipo: 'error', texto: '' }
  const [cargando, setCargando] = useState(false); // Para deshabilitar el botón mientras carga
  
  const navigate = useNavigate();

  const handleInput = (event) => {
    setValues(prev => ({ ...prev, [event.target.name]: event.target.value }));
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    
    if(!values.nombre || !values.correo || !values.password) {
        setMensaje({ tipo: 'error', texto: "Por favor llena todos los campos" });
        return;
    }

    setCargando(true); // Activamos modo carga

    axios.post(`${API_URL}/registro`, values)
      .then(res => {
        // ✅ ÉXITO: Mostramos mensaje verde y esperamos 2 segundos
        setMensaje({ tipo: 'success', texto: "✅ ¡Cuenta creada! Revisa tu correo." });
        
        setTimeout(() => {
          navigate('/login');
        }, 2500); // Redirección automática suave
      })
      .catch(err => {
        console.log(err);
        // ❌ ERROR: Mostramos mensaje rojo
        setMensaje({ tipo: 'error', texto: "❌ Error: El correo ya existe o falla el servidor." });
        setCargando(false);
      });
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="bg-white p-4 rounded shadow-sm" style={{width: '350px'}}>
        
        <div className="text-center mb-4">
           <h2 className="fw-bold" style={{color: '#4e54c8'}}>LeoTech</h2>
           <small className="text-muted fw-bold">Crear Nueva Cuenta</small>
        </div>

        {/* --- AQUÍ ESTÁ EL CAMBIO PROFESIONAL --- */}
        {/* Renderizado condicional del mensaje de alerta */}
        {mensaje && (
          <div 
            className={`alert ${mensaje.tipo === 'success' ? 'alert-success' : 'alert-danger'} text-center p-2 shadow-sm`} 
            style={{ fontSize: '14px', borderRadius: '10px', animation: 'fadeIn 0.5s' }}
            role="alert"
          >
            {mensaje.texto}
            {mensaje.tipo === 'success' && <div className="spinner-border spinner-border-sm ms-2 text-success" role="status"/>}
          </div>
        )}
        {/* --------------------------------------- */}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="nombre" className="form-label fw-bold small text-secondary">Nombre Completo</label>
            <input 
              type="text" 
              placeholder="Ej: Leonardo R..." 
              name='nombre'
              className="form-control bg-light border-0" 
              style={{height: '45px'}}
              onChange={handleInput} 
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="email" className="form-label fw-bold small text-secondary">Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="nuevo@leotech.com" 
              name='correo'
              className="form-control bg-light border-0" 
              style={{height: '45px'}}
              onChange={handleInput} 
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="password" className="form-label fw-bold small text-secondary">Contraseña</label>
            <input 
              type="password" 
              placeholder="Crea una contraseña..." 
              name='password'
              className="form-control bg-light border-0" 
              style={{height: '45px'}}
              onChange={handleInput} 
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn w-100 fw-bold text-white shadow-sm" 
            style={{backgroundColor: '#5664d2', borderRadius: '25px', padding: '10px'}}
            disabled={cargando} // Evita doble click
          >
            {cargando ? 'REGISTRANDO...' : 'REGISTRARME'}
          </button>
          
          <div className="text-center mt-3">
             <span className="small text-muted">¿Ya tienes cuenta? </span>
             <Link to="/login" className="text-decoration-none small fw-bold" style={{color: '#4e54c8'}}>Inicia Sesión</Link>
          </div>
          
          <div className="text-center mt-2">
             <Link to="/" className="text-decoration-none small text-muted">← Volver a la tienda</Link>
          </div>
        </form>
      </div>
      
      {/* Estilo simple para la animación de entrada */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default Signup;
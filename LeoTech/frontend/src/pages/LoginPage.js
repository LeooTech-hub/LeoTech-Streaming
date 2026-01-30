import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
// import API_URL from '../api'; // Lo definiremos aquí mismo para mayor seguridad y consistencia

// ==============================================================
// 🧠 CEREBRO DE CONEXIÓN (Lógica Inteligente)
// ==============================================================
const isLocal = window.location.hostname.includes("localhost") || window.location.hostname.includes("192.168");

const API_URL = isLocal 
  ? "http://192.168.1.5:8081" // <--- TU IP LOCAL
  : "https://leotech-streaming.onrender.com"; // <--- TU URL DE RENDER
// ==============================================================

function LoginPage() {
  const [values, setValues] = useState({ correo: '', password: '' });
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');

  const handleInput = (event) => {
    setValues(prev => ({ ...prev, [event.target.name]: event.target.value }));
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    
    // CORRECCIÓN: Usamos comillas invertidas `` y agregamos la barra / que faltaba antes de 'login'
    axios.post(`${API_URL}/login`, values)
      .then(res => {
        if(res.data.status === "Success") {
          
          // 1. GUARDAMOS USUARIO Y ROL
          localStorage.setItem('usuario', res.data.user);
          localStorage.setItem('rol', res.data.rol); 
          
          setNombreUsuario(res.data.user);
          setShowWelcome(true);

          // 2. REDIRECCIÓN INTELIGENTE
          setTimeout(() => {
            if(res.data.rol === 'admin') {
                navigate('/admin'); // Si es admin, al panel
            } else {
                navigate('/');      // Si es cliente, a la tienda
            }
            window.location.reload();
          }, 2500);

        } else {
          alert("❌ Correo o contraseña incorrectos");
        }
      })
      .catch(err => {
          console.log(err);
          alert("Error de conexión con el servidor");
      });
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');
          @keyframes zoomInComic { 0% { transform: scale(0) rotate(-10deg); opacity: 0; } 60% { transform: scale(1.2) rotate(5deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
          .welcome-container { text-align: center; animation: zoomInComic 0.8s ease-out forwards; }
          .welcome-title { font-family: 'Bangers', 'Impact', sans-serif; font-size: 4rem; color: #004E92; -webkit-text-stroke: 2px #E23636; text-shadow: 4px 4px 0 #000000; margin-bottom: 0; line-height: 1; }
          .welcome-name { font-family: 'Bangers', 'Impact', sans-serif; font-size: 5rem; color: #E23636; -webkit-text-stroke: 2.5px #004E92; text-shadow: 5px 5px 0 #000000, 8px 8px 0 rgba(0,0,0,0.2); text-transform: uppercase; display: block; margin-top: 10px; }
        `}
      </style>
      {showWelcome ? (
        <div className="welcome-container"><h1 className="welcome-title">¡BIENVENIDO!</h1><h1 className="welcome-name">{nombreUsuario}</h1><div className="mt-3 spinner-border text-danger" role="status" style={{width: '3rem', height: '3rem'}}><span className="visually-hidden">Cargando...</span></div></div>
      ) : (
        <div className="bg-white p-4 rounded shadow-sm" style={{width: '350px'}}>
          <div className="text-center mb-4"><h2 className="fw-bold" style={{color: '#4e54c8'}}>LeoTech</h2><small className="text-muted">Ingresa a tu cuenta</small></div>
          <form onSubmit={handleSubmit}>
            <div className="mb-3"><label className="form-label fw-bold small text-secondary">Correo</label><input type="email" name='correo' className="form-control bg-light border-0" style={{height: '45px'}} onChange={handleInput} required /></div>
            <div className="mb-4"><label className="form-label fw-bold small text-secondary">Contraseña</label><input type="password" name='password' className="form-control bg-light border-0" style={{height: '45px'}} onChange={handleInput} required /></div>
            <button type="submit" className="btn w-100 fw-bold text-white shadow-sm" style={{backgroundColor: '#5664d2', borderRadius: '25px', padding: '10px'}}>INGRESAR</button>
            <div className="text-center mt-3"><span className="small text-muted">¿No tienes cuenta? </span><Link to="/registro" className="text-decoration-none fw-bold" style={{color: '#4e54c8'}}>Regístrate aquí</Link></div>
            <div className="text-center mt-2"><Link to="/" className="text-decoration-none small text-muted">← Volver a la tienda</Link></div>
          </form>
        </div>
      )}
    </div>
  );
}
export default LoginPage;
import React, { useState } from 'react';
import './RegistroAdmin.css'; // <--- Importamos los estilos nuevos

const RegistroAdmin = () => {
  const [form, setForm] = useState({
    nombre: '',
    usuario: '',
    email: '',
    password: '',
    confirmPassword: '',
    codigoAdmin: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogout = () => {
    // Aquí puedes poner tu lógica de cerrar sesión
    const confirm = window.confirm("¿Seguro que deseas cerrar sesión?");
    if (confirm) {
        console.log("Cerrando sesión...");
        // window.location.href = '/login'; // Ejemplo de redirección
    }
  };

  return (
    <div className="registro-container">
      <div className="card-registro">
        
        {/* Encabezado */}
        <div className="card-header-registro">
          <h2>Registro de Administrador</h2>
        </div>

        {/* Formulario */}
        <div className="card-body-registro">
          <form>
            <div className="form-group">
              <label>Nombre Completo</label>
              <input
                type="text"
                name="nombre"
                className="form-control-custom"
                placeholder="Ej. Juan Pérez"
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Nombre de Usuario</label>
              <input
                type="text"
                name="usuario"
                className="form-control-custom"
                placeholder="Ej. juanperez"
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Correo Electrónico</label>
              <input
                type="email"
                name="email"
                className="form-control-custom"
                placeholder="correo@ejemplo.com"
                onChange={handleChange}
              />
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Contraseña</label>
                <input
                  type="password"
                  name="password"
                  className="form-control-custom"
                  placeholder="******"
                  onChange={handleChange}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Confirmar</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-control-custom"
                  placeholder="******"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ color: '#dc3545' }}>Código de Acceso Especial</label>
              <input
                type="text"
                name="codigoAdmin"
                className="form-control-custom input-code"
                placeholder="X-X-X-X"
                onChange={handleChange}
              />
            </div>

            {/* Botones de Acción */}
            <div className="btn-group-custom">
              <button type="button" className="btn-custom btn-primary-custom">
                REGISTRAR
              </button>
              <button type="button" className="btn-custom btn-secondary-custom">
                CANCELAR
              </button>
            </div>
            
            {/* Botón Cerrar Sesión (Solicitado) */}
            <button 
                type="button" 
                className="btn-custom btn-danger-custom"
                onClick={handleLogout}
            >
                CERRAR SESIÓN
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default RegistroAdmin;
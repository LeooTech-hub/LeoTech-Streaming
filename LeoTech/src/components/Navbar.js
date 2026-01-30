import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar({ cantidadCarrito }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estado para controlar el menú de usuario
  const [showUserMenu, setShowUserMenu] = useState(false);

  const usuario = localStorage.getItem('usuario');
  const rol = localStorage.getItem('rol');

  // LISTA DE MODELOS PARA EL MENÚ
  const MODELOS_IPHONE = [
    "iPhone 11", "iPhone 12", "iPhone 12 Pro", 
    "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max",
    "iPhone 14", "iPhone 14 Pro", "iPhone 14 Pro Max",
    "iPhone 15", "iPhone 15 Pro", "iPhone 15 Pro Max",
    "iPhone 16", "iPhone 16 Pro", "iPhone 16 Pro Max",
    "iPhone 17", "iPhone 17 Pro", "iPhone 17 Pro Max"
  ];

  // Función para cerrar sesión limpia
  const handleLogout = () => {
      localStorage.clear();
      setShowUserMenu(false);
      navigate('/login');
      window.location.reload();
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active-link' : '';
  };

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');

          /* === LOGO LEOTECH: ESTILO DARK COMIC CON ANIMACIÓN === */
          .logo-leotech {
            font-family: 'Bangers', cursive;
            font-size: 2.9rem; 
            line-height: 1;
            letter-spacing: 1.5px;
            color: #B71C1C; 
            -webkit-text-stroke: 1px #000000;
            paint-order: stroke fill;
            text-shadow: 3px 3px 0px #01153E; 
            text-decoration: none;
            display: inline-block;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.3s;
            margin-left: 50px;
          }

          .logo-leotech:hover {
            transform: scale(1.1) rotate(-3deg); 
            color: #D32F2F; 
            cursor: pointer;
          }

          /* === NAVBAR === */
          .navbar-custom {
              background-color: #1a1a1a;
              min-height: 80px; 
              border-bottom: 3px solid #B71C1C; 
          }

          /* === ENLACES === */
          .nav-custom-link {
            color: white !important;
            font-weight: 500;
            font-size: 1rem;
            margin: 0 10px;
            position: relative;
            text-decoration: none;
            padding-bottom: 5px;
            transition: color 0.3s;
          }

          .nav-custom-link::after {
            content: '';
            position: absolute;
            width: 0;
            height: 2px;
            bottom: 0;
            left: 0;
            background-color: #536DFE;
            transition: width 0.3s ease-in-out;
          }

          .nav-custom-link:hover::after,
          .active-link::after {
            width: 100%;
          }
          
          .nav-custom-link:hover {
            color: #FFCDD2 !important;
          }

          /* Estilo extra para el Dropdown en fondo oscuro */
          .dropdown-menu {
              border-radius: 10px;
              border: none;
              box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          }
          .dropdown-item:hover {
              background-color: #e9ecef;
              color: #B71C1C;
          }

          .hover-icon:hover {
            transform: scale(1.1);
            color: #B71C1C !important;
          }
          
          /* Animación suave para el menú de usuario */
          .user-menu-enter { animation: fadeIn 0.2s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        `}
      </style>

      {/* Overlay invisible para cerrar el menú al hacer click fuera */}
      {showUserMenu && (
        <div 
          onClick={() => setShowUserMenu(false)} 
          style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex: 999}}
        ></div>
      )}

      <nav className="navbar navbar-expand-lg navbar-dark px-4 shadow-sm navbar-custom">
        <div className="container-fluid">
          
          <Link className="navbar-brand logo-leotech" to="/">
            LEOTECH
          </Link>

          <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse justify-content-center" id="navbarNav">
            <ul className="navbar-nav align-items-center">
              <li className="nav-item">
                <Link className={`nav-link nav-custom-link ${isActive('/')}`} to="/">INICIO</Link>
              </li>

              {/* 🟢 SECCIÓN MODIFICADA: CARGADORES AHORA ES DROPDOWN (Igual que Cases) */}
              <li className="nav-item dropdown">
                <button 
                  className={`nav-link nav-custom-link dropdown-toggle bg-transparent border-0 ${isActive('/cargadores')}`} 
                  id="cargadoresDropdown" 
                  type="button"
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"
                >
                  CARGADORES
                </button>
                <ul className="dropdown-menu" aria-labelledby="cargadoresDropdown">
                  <li>
                    <Link className="dropdown-item fw-bold" to="/cargadores">
                      Ver todos
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <Link className="dropdown-item" to="/cargadores/iphone">iPhone</Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/cargadores/samsung">Samsung</Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/cargadores/xiaomi">Xiaomi</Link>
                  </li>
                </ul>
              </li>
              {/* 🟢 FIN DE SECCIÓN MODIFICADA */}
              
              <li className="nav-item dropdown">
                <button 
                  className={`nav-link nav-custom-link dropdown-toggle bg-transparent border-0 ${isActive('/cases')}`} 
                  id="casesDropdown" 
                  type="button"
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"
                >
                  CASES
                </button>
                <ul className="dropdown-menu" aria-labelledby="casesDropdown" style={{maxHeight: '400px', overflowY: 'auto'}}>
                  <li>
                    <Link className="dropdown-item fw-bold" to="/cases">
                      Ver todos los Cases
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  {MODELOS_IPHONE.map((modelo) => (
                    <li key={modelo}>
                      <Link className="dropdown-item" to={`/coleccion/${modelo}`}>
                        {modelo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>

              <li className="nav-item">
                <Link className={`nav-link nav-custom-link ${isActive('/accesorios')}`} to="/accesorios">ACCESORIOS</Link>
              </li>
            </ul>
          </div>

          <div className="d-flex align-items-center gap-4">
              <Link 
                to="/carrito" 
                className="position-relative hover-icon" 
                style={{cursor: 'pointer', transition: 'all 0.2s', textDecoration: 'none'}}
              >
                  <i className="bi bi-cart3 text-white fs-4"></i>
                  {cantidadCarrito > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-dark">
                      {cantidadCarrito}
                    </span>
                  )}
              </Link>

              {/* Menú de usuario */}
              <div className="position-relative">
                  <div 
                    onClick={() => setShowUserMenu(!showUserMenu)} 
                    className="hover-icon d-flex align-items-center gap-2" 
                    style={{cursor: 'pointer', transition: 'all 0.2s', zIndex: 1001, position: 'relative'}}
                  >
                      <i className={`bi bi-person-circle fs-3 ${usuario ? 'text-success' : 'text-white'}`}></i>
                  </div>

                  {showUserMenu && (
                    <div className="dropdown-menu show user-menu-enter position-absolute end-0 mt-2 p-2 shadow-lg" 
                         style={{minWidth: '220px', right: 0, zIndex: 1002, border: '1px solid #dee2e6'}}>
                        
                        {usuario ? (
                          <>
                            <div className="dropdown-header text-center border-bottom pb-2 mb-2">
                                <div className="fw-bold text-dark text-truncate" style={{maxWidth: '180px', margin:'0 auto'}}>Hola, {usuario}</div>
                                <small className="text-muted" style={{fontSize: '0.75rem'}}>{rol === 'admin' ? 'Administrador' : 'Cliente'}</small>
                            </div>

                            {rol === 'admin' && (
                              <Link to="/admin" className="dropdown-item rounded mb-1" onClick={() => setShowUserMenu(false)}>
                                <i className="bi bi-speedometer2 me-2 text-primary"></i>Panel Admin
                              </Link>
                            )}

                            <Link to="/" className="dropdown-item rounded mb-1" onClick={() => setShowUserMenu(false)}>
                              <i className="bi bi-bag-heart me-2 text-success"></i>Mis Pedidos
                            </Link>

                            <button onClick={handleLogout} className="dropdown-item rounded text-danger fw-bold">
                              <i className="bi bi-box-arrow-right me-2"></i>Cerrar Sesión
                            </button>
                          </>
                        ) : (
                          <>
                             <div className="dropdown-header text-center">Bienvenido</div>
                             <Link to="/login" className="dropdown-item rounded fw-bold text-primary mb-1" onClick={() => setShowUserMenu(false)}>
                               Iniciar Sesión
                             </Link>
                             <Link to="/registro" className="dropdown-item rounded" onClick={() => setShowUserMenu(false)}>
                               Registrarse
                             </Link>
                          </>
                        )}
                    </div>
                  )}
              </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default Navbar;
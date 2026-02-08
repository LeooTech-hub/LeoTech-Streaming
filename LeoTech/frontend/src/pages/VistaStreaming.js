import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';

function VistaStreaming({ api }) {
  // --- DATOS ---
  const [dataClientes, setDataClientes] = useState([]);
  const [dataInventario, setDataInventario] = useState([]);

  // --- ESTADO NOTIFICACIONES ---
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  // --- FILTROS ---
  const [filtroCliente, setFiltroCliente] = useState('Todos');
  const [filtroStock, setFiltroStock] = useState('Todos');
  
  const LISTA_PLATAFORMAS = ['Netflix', 'Hbo Max', 'Disney+', 'Prime Video', 'Spotify', 'Crunchyroll', 'Vix', 'Paramount'];

  // --- ESTADOS EDICIÓN ---
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [clienteEditarId, setClienteEditarId] = useState(null);
  const [editandoStock, setEditandoStock] = useState(false);
  const [stockEditarId, setStockEditarId] = useState(null);

  // --- FORMULARIOS ---
  const [formCliente, setFormCliente] = useState({ 
    nombre: '', celular: '', servicio: '', perfil: '', pin: '', 
    correo: '', contrasena: '', 
    fecha_inicio: dayjs().format('YYYY-MM-DD'), 
    fecha_fin: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    monto: '' 
  });

  const [formStock, setFormStock] = useState({ 
    correo: '', contrasena: '', servicio: '', costo: '', 
    fecha_entrada: dayjs().format('YYYY-MM-DD'), fecha_vencimiento: dayjs().add(30, 'day').format('YYYY-MM-DD')
  });

  // --- CARGAR DATOS ---
  const cargarDatos = useCallback(() => {
    const ts = Date.now(); 
    axios.get(`${api}/clientes?t=${ts}`).then(res => setDataClientes(res.data)).catch(err => console.error(err));
    axios.get(`${api}/inventario?t=${ts}`).then(res => setDataInventario(res.data)).catch(err => console.error(err));
  }, [api]); 

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // --- CÁLCULOS ---
  const totalIngresosClientes = dataClientes.reduce((acc, cliente) => acc + Number(cliente.monto || 0), 0);
  const inversionRealStock = dataInventario.reduce((acc, cuenta) => acc + Number(cuenta.costo || 0), 0);
  const gananciaNetaClientes = totalIngresosClientes - inversionRealStock;

  const reportePlataformas = dataClientes.reduce((acc, curr) => {
    const plat = curr.servicio || 'Otros';
    if (!acc[plat]) acc[plat] = { cantidad: 0, dinero: 0 };
    acc[plat].cantidad += 1;
    acc[plat].dinero += Number(curr.monto || 0);
    return acc;
  }, {});

  const conteoStock = dataInventario.reduce((acc, curr) => {
    acc[curr.servicio] = (acc[curr.servicio] || 0) + 1;
    return acc;
  }, {});

  // --- LÓGICA DE NOTIFICACIONES ---
  const clientesPorVencer = useMemo(() => {
    const hoy = dayjs();
    return dataClientes.filter(c => {
        if (!c.fecha_finalizacion && !c.fecha_fin) return false;
        const fechaFin = dayjs(c.fecha_finalizacion || c.fecha_fin);
        const diasRestantes = fechaFin.diff(hoy, 'day');
        return diasRestantes <= 3;
    }).sort((a, b) => dayjs(a.fecha_finalizacion || a.fecha_fin) - dayjs(b.fecha_finalizacion || b.fecha_fin));
  }, [dataClientes]);

  // FILTRADO
  const clientesFiltrados = dataClientes.filter(c => filtroCliente === 'Todos' ? true : c.servicio === filtroCliente);
  const stockFiltrado = dataInventario.filter(i => filtroStock === 'Todos' ? true : i.servicio === filtroStock);

  // AGRUPACIÓN
  const clientesAgrupados = useMemo(() => {
    const grupos = {};
    clientesFiltrados.forEach(c => {
      const servicio = c.servicio || 'Otros';
      const correo = c.correo || 'Sin Correo Asignado';
      if (!grupos[servicio]) grupos[servicio] = {};
      if (!grupos[servicio][correo]) grupos[servicio][correo] = [];
      grupos[servicio][correo].push(c);
    });
    return grupos;
  }, [clientesFiltrados]);

  // COLORES MARCA
  const getBrandColor = (servicio) => {
    const s = servicio.toLowerCase();
    if(s.includes('Detflix')) return '#E50914';
    if(s.includes('Disney')) return '#113CCF';
    if(s.includes('Hbo max') || s.includes('hbo')) return '#991EEB';
    if(s.includes('Prime Video')) return '#00A8E1';
    if(s.includes('Spotify')) return '#1DB954';
    if(s.includes('Crunchyroll')) return '#F47521';
    return '#343a40';
  };

  // --- HANDLERS ---
  const handleWheel = (e) => e.target.blur();
  const handleEliminar = (id, tipo) => { 
    if (!window.confirm("¿Eliminar?")) return; 
    let ruta = tipo === 'cliente' ? `/delete/${id}` : `/inventario/${id}`; 
    axios.delete(`${api}${ruta}`).then(() => cargarDatos()); 
  };

  // CLIENTES HANDLERS
  const handleFechaInicioChange = (e) => { 
      const f = e.target.value; 
      setFormCliente({ ...formCliente, fecha_inicio: f, fecha_fin: dayjs(f).add(30, 'day').format('YYYY-MM-DD') }); 
  };
  
  const limpiarFormCliente = () => { 
      setFormCliente({ nombre: '', celular: '', servicio: 'Netflix', perfil: '', pin: '', correo: '', contrasena: '', fecha_inicio: dayjs().format('YYYY-MM-DD'), fecha_fin: dayjs().add(30, 'day').format('YYYY-MM-DD'), monto: '' }); 
      setEditandoCliente(false); setClienteEditarId(null); 
  };

  const prepararPayloadCliente = (form) => {
      return {
          nombre: form.nombre, nombre_cliente: form.nombre,
          celular: form.celular, numero_celular: form.celular,
          pin: form.pin || '', pin_perfil: form.pin || '',
          fecha_fin: form.fecha_fin, fecha_finalizacion: form.fecha_fin,
          servicio: form.servicio, perfil: form.perfil,
          correo: form.correo, contrasena: form.contrasena,
          fecha_inicio: form.fecha_inicio, monto: form.monto === '' ? 0 : form.monto
      };
  };
  
  const guardarCliente = (e) => { 
      e.preventDefault(); 
      const payload = prepararPayloadCliente(formCliente);
      axios.post(`${api}/clientes`, payload).then((res) => { 
          if (res.data && (res.data.code || res.data.sqlMessage)) return alert("❌ ERROR BD:\n" + (res.data.sqlMessage));
          alert("✅ Cliente Registrado Correctamente"); cargarDatos(); limpiarFormCliente(); 
      }).catch(err => { console.error(err); alert("Error de conexión."); }); 
  };
  
  const actualizarCliente = (e) => { 
      e.preventDefault(); 
      const payload = prepararPayloadCliente(formCliente);
      axios.put(`${api}/update/${clienteEditarId}`, payload).then((res) => { 
          if (res.data && (res.data.code || res.data.sqlMessage)) return alert("❌ ERROR BD:\n" + (res.data.sqlMessage));
          alert("✅ Cliente Actualizado"); cargarDatos(); limpiarFormCliente(); 
      }); 
  };

  const handleEditarCliente = (c) => { 
      setFormCliente({ 
          nombre: c.nombre_cliente || c.nombre || '', celular: c.numero_celular || c.celular || '', 
          servicio: c.servicio || 'Netflix', perfil: c.perfil || '', pin: c.pin_perfil || c.pin || '', 
          correo: c.correo || '', contrasena: c.contrasena || '', 
          fecha_inicio: c.fecha_inicio ? c.fecha_inicio.split('T')[0] : '', 
          fecha_fin: (c.fecha_finalizacion || c.fecha_fin) ? (c.fecha_finalizacion || c.fecha_fin).split('T')[0] : '', 
          monto: c.monto || ''
      }); 
      setEditandoCliente(true); setClienteEditarId(c.id); window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  // STOCK HANDLERS
  const handleFechaStockChange = (e) => { const ne = e.target.value; setFormStock({ ...formStock, fecha_entrada: ne, fecha_vencimiento: dayjs(ne).add(30, 'day').format('YYYY-MM-DD') }); };
  const limpiarFormStock = () => { setFormStock({ correo: '', contrasena: '', servicio: 'Netflix', costo: '', fecha_entrada: dayjs().format('YYYY-MM-DD'), fecha_vencimiento: dayjs().add(30, 'day').format('YYYY-MM-DD') }); setEditandoStock(false); setStockEditarId(null); };
  const guardarCuenta = (e) => { e.preventDefault(); axios.post(`${api}/inventario`, formStock).then(() => { alert("✅ Cuenta Agregada"); cargarDatos(); limpiarFormStock(); }); };
  const actualizarCuenta = (e) => { e.preventDefault(); axios.put(`${api}/inventario/${stockEditarId}`, formStock).then(() => { alert("✅ Stock Actualizado"); cargarDatos(); limpiarFormStock(); }); };
  const handleEditarStock = (i) => { setFormStock({ correo: i.correo, contrasena: i.contrasena, servicio: i.servicio, costo: i.costo, fecha_entrada: i.fecha_entrada ? i.fecha_entrada.split('T')[0] : '', fecha_vencimiento: i.fecha_vencimiento ? i.fecha_vencimiento.split('T')[0] : '' }); setEditandoStock(true); setStockEditarId(i.id); };


  return (
    <div className="row position-relative">
        
        {/* 🔥 BOTÓN FLOTANTE NOTIFICACIONES */}
        <div className="position-absolute top-0 end-0 mt-n4 me-2" style={{zIndex: 1000}}>
            <button 
                className="btn btn-light shadow position-relative rounded-circle border" 
                onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}
                style={{width: '50px', height: '50px'}}
            >
                <i className={`bi ${mostrarNotificaciones ? 'bi-x-lg' : 'bi-bell-fill text-warning'}`} style={{fontSize: '1.2rem'}}></i>
                {clientesPorVencer.length > 0 && !mostrarNotificaciones && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                        {clientesPorVencer.length}
                        <span className="visually-hidden">vencimientos</span>
                    </span>
                )}
            </button>
        </div>

        {/* 📬 CENTRO DE NOTIFICACIONES */}
        {mostrarNotificaciones && (
            <div className="col-12 mb-4 animate__animated animate__fadeInDown">
                <div className="card shadow border-0" style={{backgroundColor: '#fff8e1', borderLeft: '5px solid #ffc107'}}>
                    <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
                        <h5 className="mb-0 fw-bold text-dark">
                            <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                            Vencimientos Próximos ({clientesPorVencer.length})
                        </h5>
                        <button className="btn btn-sm btn-outline-secondary rounded-pill" onClick={()=>setMostrarNotificaciones(false)}>Cerrar</button>
                    </div>
                    <div className="card-body p-0">
                        {clientesPorVencer.length === 0 ? (
                            <div className="p-4 text-center text-muted">🎉 ¡Todo al día! No hay vencimientos cercanos.</div>
                        ) : (
                            <div className="list-group list-group-flush">
                                {clientesPorVencer.map(c => {
                                    const fechaFin = dayjs(c.fecha_finalizacion || c.fecha_fin);
                                    const diasRestantes = fechaFin.diff(dayjs(), 'day');
                                    let estado = { color: 'bg-warning', texto: 'Pronto' };
                                    if (diasRestantes < 0) estado = { color: 'bg-danger', texto: 'VENCIDO' };
                                    if (diasRestantes === 0) estado = { color: 'bg-danger', texto: 'HOY' };
                                    
                                    // 🛡️ BLINDAJE AQUÍ: Si no hay celular, pone vacío '' para que no explote
                                    const celular = c.numero_celular || c.celular || '';
                                    
                                    const mensajeWsp = `Hola ${c.nombre_cliente || c.nombre}, te saluda LeoTech. Tu cuenta de ${c.servicio} vence el ${fechaFin.format('DD/MM')}. ¿Desearías renovar? 🚀`;
                                    
                                    // Solo crea el link si hay celular, sino pone '#'
                                    const linkWsp = celular ? `https://wa.me/51${celular.replace(/\s/g, '')}?text=${encodeURIComponent(mensajeWsp)}` : '#';

                                    return (
                                        <div key={c.id} className="list-group-item d-flex flex-wrap align-items-center justify-content-between py-3" style={{backgroundColor: diasRestantes < 0 ? '#fff5f5' : 'transparent'}}>
                                            <div className="d-flex align-items-center gap-3">
                                                <div className={`badge ${estado.color} rounded-pill p-2`} style={{minWidth:'70px'}}>{estado.texto}</div>
                                                <div>
                                                    <div className="fw-bold fs-6">{c.nombre_cliente || c.nombre}</div>
                                                    <div className="small text-muted">{c.servicio} • Perfil: {c.perfil}</div>
                                                    <div className="small fw-bold text-danger">Vence: {fechaFin.format('DD/MM/YYYY')}</div>
                                                </div>
                                            </div>
                                            <div className="mt-2 mt-md-0">
                                                {celular ? (
                                                    <a href={linkWsp} target="_blank" rel="noreferrer" className="btn btn-success btn-sm rounded-pill fw-bold px-3 shadow-sm">
                                                        <i className="bi bi-whatsapp me-2"></i>Cobrar
                                                    </a>
                                                ) : (
                                                    <span className="badge bg-secondary">Sin número</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* DASHBOARD SUPERIOR */}
        <div className="col-12 mb-5 pt-3">
          <div className="row g-3">
              <div className="col-md-4"><div className="card text-white bg-success shadow-sm border-0" style={{borderRadius: '15px'}}><div className="card-body"><div className="d-flex justify-content-between align-items-center"><div><h6 className="card-title mb-0 opacity-75">Ventas Totales</h6><h3 className="fw-bold my-2">S/ {totalIngresosClientes.toFixed(2)}</h3><small className="opacity-75">{dataClientes.length} clientes activos</small></div><i className="bi bi-cash-coin fs-1 opacity-50"></i></div></div></div></div>
              <div className="col-md-4"><div className="card text-white bg-primary shadow-sm border-0" style={{borderRadius: '15px'}}><div className="card-body"><div className="d-flex justify-content-between align-items-center"><div><h6 className="card-title mb-0 opacity-75">Ganancia Real</h6><h3 className="fw-bold my-2">S/ {gananciaNetaClientes.toFixed(2)}</h3><small className="opacity-75">Inversión Stock: S/ {inversionRealStock.toFixed(2)}</small></div><i className="bi bi-graph-up-arrow fs-1 opacity-50"></i></div></div></div></div>
              <div className="col-md-4"><div className="card bg-white text-dark shadow-sm border-0" style={{borderRadius: '15px'}}><div className="card-body"><h6 className="card-title fw-bold text-muted mb-2 small text-uppercase">Ventas por Plataforma</h6><div style={{maxHeight: '80px', overflowY: 'auto'}}><ul className="list-unstyled small mb-0">{Object.entries(reportePlataformas).map(([nombre, datos]) => (<li key={nombre} className="d-flex justify-content-between mb-1 border-bottom pb-1"><span><strong>{nombre}</strong> <span className="text-muted">({datos.cantidad})</span></span><span className="text-success fw-bold">S/ {datos.dinero}</span></li>))}</ul></div></div></div></div>
          </div>
        </div>
        
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="col-md-5 mb-4">
          <div className="card p-4 shadow-sm border-0 bg-white" style={{borderRadius: '10px'}}>
            <h5 className="fw-bold mb-3" style={{color: '#5664d2'}}>{editandoCliente ? '✏️ EDITAR CLIENTE' : '+ NUEVO CLIENTE (30 DÍAS)'}</h5>
            <form onSubmit={editandoCliente ? actualizarCliente : guardarCliente}>
              <h6 className="text-muted border-bottom pb-2 mb-3 small fw-bold">Datos del Cliente</h6>
              <div className="mb-3"><label className="form-label small text-muted">Nombre Cliente</label><input className="form-control" value={formCliente.nombre} onChange={e=>setFormCliente({...formCliente, nombre:e.target.value})} style={{height:'45px', backgroundColor:'#f8f9fa'}}/></div>
              <div className="mb-3"><label className="form-label small text-muted">Celular (WhatsApp)</label><input className="form-control" value={formCliente.celular} onChange={e=>setFormCliente({...formCliente, celular:e.target.value})} placeholder="51..." style={{height:'45px', backgroundColor:'#f8f9fa'}}/></div>
              
              <h6 className="text-muted border-bottom pb-2 mt-4 mb-3 small fw-bold">Datos Suscripción</h6>
              <div className="row mb-2">
                <div className="col-6">
                    <label className="form-label small text-muted">Plataforma</label>
                    <select className="form-select" value={formCliente.servicio} onChange={e=>setFormCliente({...formCliente, servicio:e.target.value})} style={{height:'45px', backgroundColor:'#f8f9fa'}}>
                        {LISTA_PLATAFORMAS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div className="col-6"><label className="form-label small text-muted">Monto S/</label><input className="form-control" value={formCliente.monto} onChange={e=>setFormCliente({...formCliente, monto:e.target.value})} style={{height:'45px', backgroundColor:'#f8f9fa'}}/></div>
              </div>
              <div className="row mb-3"><div className="col-6"><label className="small fw-bold text-success">Fecha Inicio</label><input type="date" className="form-control" value={formCliente.fecha_inicio} onChange={handleFechaInicioChange} style={{borderColor: '#28a745'}}/></div><div className="col-6"><label className="small fw-bold text-danger">Vencimiento</label><input type="date" className="form-control bg-light" value={formCliente.fecha_fin} readOnly style={{borderColor: '#dc3545'}}/></div></div>
              
              <h6 className="text-muted border-bottom pb-2 mt-4 mb-3 small fw-bold">Cuenta Asignada</h6>
              <div className="row mb-2"><div className="col-6"><input className="form-control form-control-sm" placeholder="Correo" value={formCliente.correo} onChange={e=>setFormCliente({...formCliente, correo:e.target.value})}/></div><div className="col-6"><input className="form-control form-control-sm" placeholder="Contraseña" value={formCliente.contrasena} onChange={e=>setFormCliente({...formCliente, contrasena:e.target.value})}/></div></div>
              <div className="row mb-2"><div className="col-8"><input className="form-control form-control-sm" placeholder="Nombre Perfil" value={formCliente.perfil} onChange={e=>setFormCliente({...formCliente, perfil:e.target.value})}/></div><div className="col-4"><input className="form-control form-control-sm" placeholder="PIN" value={formCliente.pin} onChange={e=>setFormCliente({...formCliente, pin:e.target.value})}/></div></div>
              
              <button className={`btn w-100 fw-bold mt-3 py-2`} style={{backgroundColor: editandoCliente ? '#ffc107' : '#00C853', color:'white', borderRadius:'8px'}}>{editandoCliente ? 'GUARDAR CAMBIOS' : 'REGISTRAR VENTA'}</button>{editandoCliente && <button type="button" className="btn btn-secondary w-100 mt-2" onClick={limpiarFormCliente}>Cancelar</button>}
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: CLIENTES AGRUPADOS */}
        <div className="col-md-7 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0 fw-bold text-dark"><i className="bi bi-people-fill me-2"></i>Gestión de Cuentas</h5>
              <div className="dropdown">
                <button className="btn btn-dark dropdown-toggle rounded-pill fw-bold shadow-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false" style={{fontSize:'0.85rem'}}>
                  <i className="bi bi-funnel-fill me-2"></i>{filtroCliente === 'Todos' ? 'Todas las Apps' : filtroCliente}
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow">
                  <li><button className={`dropdown-item ${filtroCliente==='Todos'?'active':''}`} onClick={() => setFiltroCliente('Todos')}>Todos</button></li>
                  <li><hr className="dropdown-divider"/></li>
                  {LISTA_PLATAFORMAS.map(plat => (
                    <li key={plat}><button className={`dropdown-item ${filtroCliente===plat?'active':''}`} onClick={() => setFiltroCliente(plat)}>{plat}</button></li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{maxHeight:'800px', overflowY:'auto', paddingRight:'5px'}}>
              {Object.keys(clientesAgrupados).length === 0 && (
                <div className="alert alert-secondary text-center">No hay clientes activos en esta categoría.</div>
              )}
              {Object.keys(clientesAgrupados).map(servicio => {
                const cuentasDeEsteServicio = clientesAgrupados[servicio];
                const colorMarca = getBrandColor(servicio);
                return (
                  <div key={servicio} className="mb-4">
                    <div className="d-flex align-items-center mb-2">
                        <span className="badge rounded-pill me-2" style={{backgroundColor: colorMarca, fontSize:'0.9rem'}}>{servicio}</span>
                        <div style={{height:'1px', backgroundColor: colorMarca, flexGrow:1, opacity:0.3}}></div>
                    </div>
                    {Object.keys(cuentasDeEsteServicio).map(correo => {
                      const clientesEnCuenta = cuentasDeEsteServicio[correo];
                      
                      const stockEncontrado = dataInventario.find(i => i.correo.trim().toLowerCase() === correo.trim().toLowerCase());
                      const passwordCuenta = stockEncontrado ? stockEncontrado.contrasena : (clientesEnCuenta[0].contrasena || '???');

                      return (
                        <div key={correo} className="card shadow-sm border-0 mb-3" style={{overflow:'hidden', borderRadius:'12px'}}>
                          <div className="card-header bg-light border-0 d-flex justify-content-between align-items-center py-2">
                             <div className="d-flex align-items-center gap-2" style={{overflow:'hidden'}}>
                                <i className="bi bi-envelope-at-fill text-muted"></i>
                                <div className="fw-bold text-dark text-truncate" style={{maxWidth:'200px'}} title={correo}>{correo}</div>
                                <div className="badge bg-secondary bg-opacity-10 text-dark border ms-2">Pass: {passwordCuenta}</div>
                             </div>
                             <span className="badge bg-primary rounded-pill">{clientesEnCuenta.length} Perfiles</span>
                          </div>
                          <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle text-nowrap">
                                <tbody>
                                  {clientesEnCuenta.map(c => {
                                     const diasRestantes = dayjs(c.fecha_finalizacion || c.fecha_fin).diff(dayjs(), 'day');
                                     return (
                                       <tr key={c.id}>
                                         <td className="ps-3" style={{width:'30%'}}><div className="fw-bold text-dark small">{c.nombre_cliente || c.nombre}</div><div className="text-success small" style={{fontSize:'0.7rem'}}><i className="bi bi-whatsapp me-1"></i>{c.numero_celular || c.celular}</div></td>
                                         <td><div className="badge bg-light text-dark border"><i className="bi bi-person-circle me-1"></i>{c.perfil} <span className="text-muted border-start ps-1 ms-1">{c.pin_perfil || c.pin}</span></div></td>
                                         <td className="text-center"><span className={`badge rounded-pill ${diasRestantes < 3 ? 'bg-danger' : 'bg-success'}`} style={{fontSize:'0.75rem'}}>{(c.fecha_finalizacion || c.fecha_fin) ? dayjs(c.fecha_finalizacion || c.fecha_fin).add(10,'hour').format('DD/MM') : '-'}</span></td>
                                         <td className="text-end pe-3">
                                            <button onClick={() => handleEditarCliente(c)} className="btn btn-sm btn-link p-0 me-2 text-decoration-none" title="Editar">✏️</button>
                                            <button onClick={() => handleEliminar(c.id, 'cliente')} className="btn btn-sm btn-link p-0 text-decoration-none" title="Eliminar">❌</button>
                                         </td>
                                       </tr>
                                     );
                                  })}
                                </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
        </div>
        
        {/* SECCIÓN INFERIOR: STOCK DE CUENTAS (INVENTARIO) */}
        <div className="col-12 mt-4 mb-4"><div className="d-flex align-items-center"><div className="flex-grow-1" style={{height:'2px', backgroundColor:'#ffc107'}}></div><h4 className="mx-4 fw-bold mb-0" style={{color: '#ffc107', letterSpacing:'1px'}}><i className="bi bi-key-fill me-2"></i>GESTIÓN DE STOCK (VACÍAS)</h4><div className="flex-grow-1" style={{height:'2px', backgroundColor:'#ffc107'}}></div></div></div>
        
        {/* FORMULARIO STOCK */}
        <div className="col-md-5 mb-4">
            <div className="card p-4 shadow-sm border-0 bg-white" style={{borderRadius: '10px'}}>
                <h5 className="fw-bold mb-3" style={{color: '#ffc107'}}>{editandoStock ? '✏️ EDITAR STOCK' : '+ NUEVA CUENTA (STOCK)'}</h5>
                <form onSubmit={editandoStock ? actualizarCuenta : guardarCuenta}>
                    <div className="mb-2"><label className="small text-muted">Correo</label><input className="form-control" value={formStock.correo} onChange={e=>setFormStock({...formStock, correo:e.target.value})} style={{height:'45px', backgroundColor:'#f8f9fa'}}/></div>
                    <div className="mb-2"><label className="small text-muted">Contraseña</label><input className="form-control" value={formStock.contrasena} onChange={e=>setFormStock({...formStock, contrasena:e.target.value})} style={{height:'45px', backgroundColor:'#f8f9fa'}}/></div>
                    <div className="mb-2">
                        <label className="small text-muted">Servicio</label>
                        <select className="form-select" value={formStock.servicio} onChange={e=>setFormStock({...formStock, servicio:e.target.value})} style={{height:'45px', backgroundColor:'#f8f9fa'}}>
                            {LISTA_PLATAFORMAS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="mb-2"><label className="small text-muted fw-bold">Costo (S/)</label><input type="number" onWheel={handleWheel} className="form-control" value={formStock.costo} onChange={e=>setFormStock({...formStock, costo:e.target.value})} placeholder="Ej: 30" style={{height:'45px', backgroundColor:'#f8f9fa'}}/></div>
                    <div className="row mb-3"><div className="col-6"><label className="small fw-bold text-success">Entrada</label><input type="date" className="form-control" value={formStock.fecha_entrada} onChange={handleFechaStockChange} style={{borderColor: '#28a745'}}/></div><div className="col-6"><label className="small fw-bold text-danger">Vence</label><input type="date" className="form-control bg-light" value={formStock.fecha_vencimiento} readOnly style={{borderColor: '#dc3545'}}/></div></div>
                    <button className={`btn w-100 fw-bold mt-3 py-2`} style={{backgroundColor: editandoStock ? '#0d6efd' : '#ffc107', color: editandoStock?'white':'black', borderRadius:'8px'}}>{editandoStock ? 'ACTUALIZAR STOCK' : 'GUARDAR EN STOCK'}</button>{editandoStock && <button type="button" className="btn btn-secondary w-100 mt-2" onClick={limpiarFormStock}>Cancelar</button>}
                </form>
            </div>
        </div>

        {/* LISTA STOCK CON FILTRO NUEVO */}
        <div className="col-md-7">
          <div className="card shadow-sm border-0" style={{borderRadius: '10px', overflow: 'hidden'}}>
            
            {/* CABECERA CON FILTRO INTELIGENTE */}
            <div className="p-3 bg-white border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                <h5 className="mb-0 text-dark">Stock Disponible ({stockFiltrado.length})</h5>
                
                <div className="dropdown">
                  <button className="btn btn-warning dropdown-toggle rounded-pill fw-bold shadow-sm text-dark" type="button" data-bs-toggle="dropdown" aria-expanded="false" style={{fontSize:'0.85rem'}}>
                    <i className="bi bi-funnel-fill me-2"></i>{filtroStock === 'Todos' ? 'Filtrar Stock' : filtroStock}
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end shadow">
                    <li><button className={`dropdown-item ${filtroStock==='Todos'?'active':''}`} onClick={() => setFiltroStock('Todos')}>Todos ({dataInventario.length})</button></li>
                    <li><hr className="dropdown-divider"/></li>
                    {LISTA_PLATAFORMAS.map(plat => (
                      <li key={plat}>
                        <button className={`dropdown-item d-flex justify-content-between ${filtroStock===plat?'active':''}`} onClick={() => setFiltroStock(plat)}>
                          {plat} <span className="badge bg-secondary ms-2">{conteoStock[plat] || 0}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
            </div>

            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead className="text-white" style={{backgroundColor: '#ffc107', color:'black'}}><tr><th className="py-3 ps-3 text-dark">CUENTA</th><th className="py-3 text-dark">SERVICIO/PASS</th><th className="py-3 text-center text-dark">COSTO</th><th className="py-3 text-center text-dark">VENCE</th><th className="py-3 text-center text-dark">ACCIÓN</th></tr></thead>
                <tbody>
                  {stockFiltrado.map(i => (
                    <tr key={i.id} className="border-bottom">
                      <td className="fw-bold ps-3">{i.correo}</td>
                      <td><div>{i.servicio}</div><div className="text-muted small">{i.contrasena}</div></td>
                      <td className="text-center fw-bold text-secondary">S/ {i.costo || '0'}</td>
                      <td className="text-center"><span className="badge rounded-pill" style={{backgroundColor: dayjs(i.fecha_vencimiento).add(10, 'hour').diff(dayjs(), 'day') < 5 ? '#dc3545' : '#198754'}}>{i.fecha_vencimiento ? dayjs(i.fecha_vencimiento).add(10, 'hour').format('DD/MM') : '-'}</span></td>
                      <td className="text-center"><div className="d-flex justify-content-center gap-2"><button onClick={() => handleEditarStock(i)} className="btn btn-sm fw-bold shadow-sm" style={{backgroundColor:'white', color:'#0d6efd', border:'1px solid #dee2e6', borderRadius:'20px', padding:'5px 15px'}}>editar</button><button onClick={() => handleEliminar(i.id, 'inventario')} className="btn btn-sm fw-bold shadow-sm" style={{backgroundColor:'white', color:'#dc3545', border:'1px solid #dee2e6', borderRadius:'20px', padding:'5px 15px'}}>eliminar</button></div></td>
                    </tr>
                  ))}
                  {stockFiltrado.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No tienes stock de {filtroStock} 😔</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </div>
  );
}

export default VistaStreaming;
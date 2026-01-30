import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';

function VistaProductos({ api }) {
  // --- DATOS ---
  const [dataProductos, setDataProductos] = useState([]);
  const [dataVentas, setDataVentas] = useState([]);
  const [dataGastos, setDataGastos] = useState([]);

  // --- FILTROS ---
  const [filtroProducto, setFiltroProducto] = useState('Todos');

  // --- MODELOS ---
  const MODELOS_IPHONE = [
    "iPhone 11", "iPhone 12", "iPhone 12 Pro", 
    "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max",
    "iPhone 14", "iPhone 14 Pro", "iPhone 14 Pro Max",
    "iPhone 15", "iPhone 15 Pro", "iPhone 15 Pro Max",
    "iPhone 16", "iPhone 16 Pro", "iPhone 16 Pro Max",
    "iPhone 17", "iPhone 17 Pro", "iPhone 17 Pro Max"
  ];

  // --- ESTADOS EDICIÓN ---
  const [editandoProducto, setEditandoProducto] = useState(false);
  const [productoEditarId, setProductoEditarId] = useState(null);
  const [editandoVenta, setEditandoVenta] = useState(false);
  const [ventaEditarId, setVentaEditarId] = useState(null);

  // --- FORMULARIOS ---
  const [formProducto, setFormProducto] = useState({ 
    nombre: '', precio: '', costo: '', categoria: 'Cases', 
    imagen_url: '', descripcion: '', stock: '', 
    oferta: false, visible: true 
  });
  
  const [formVenta, setFormVenta] = useState({
    productoId: '', nombreProducto: '', precioVenta: '', costoUnitario: 0, 
    cantidad: 1, fecha: dayjs().format('YYYY-MM-DD'), comentarios: '' 
  });

  const [formGasto, setFormGasto] = useState({
    descripcion: '', monto: '', fecha: dayjs().format('YYYY-MM-DD')
  });

  // --- CARGAR DATOS ---
  const cargarDatos = useCallback(() => {
    const ts = Date.now(); 
    axios.get(`${api}/productos?t=${ts}`).then(res => setDataProductos(res.data)).catch(err => console.error(err));
    axios.get(`${api}/ventas?t=${ts}`).then(res => setDataVentas(res.data)).catch(err => console.error(err));
    axios.get(`${api}/gastos?t=${ts}`).then(res => setDataGastos(res.data)).catch(err => console.error("Sin tabla gastos")); 
  }, [api]); 

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // --- CÁLCULOS ---
  const costoInventarioFisico = dataProductos.reduce((acc, p) => acc + (Number(p.costo || 0) * Number(p.stock || 0)), 0);
  const costoLoVendido = dataVentas.reduce((acc, v) => {
      const totalVenta = Number(v.precio_venta) * Number(v.cantidad);
      return acc + (totalVenta - Number(v.ganancia));
  }, 0);
  const totalGastadoProductos = costoInventarioFisico + costoLoVendido;

  const totalGastosMesOperativo = dataGastos.reduce((acc, g) => {
      const esMesActual = dayjs(g.fecha).format('YYYY-MM') === dayjs().format('YYYY-MM');
      return esMesActual ? acc + Number(g.monto) : acc;
  }, 0);

  const hoy = dayjs();
  let ventasSemana = 0;
  let ventasMes = 0;
  let gananciaMes = 0;

  dataVentas.forEach(v => {
      const fechaVenta = dayjs(v.fecha_venta);
      const total = Number(v.precio_venta) * Number(v.cantidad);
      if (fechaVenta.format('YYYY-MM') === hoy.format('YYYY-MM')) {
          ventasMes += total;
          gananciaMes += Number(v.ganancia);
      }
      if (hoy.diff(fechaVenta, 'day') <= 7 && hoy.diff(fechaVenta, 'day') >= 0) {
          ventasSemana += total;
      }
  });

  const productosFiltrados = dataProductos.filter(p => {
    if (filtroProducto === 'Todos') return true;
    const categoriasPrincipales = ['Cases', 'Auriculares', 'Cargadores', 'Accesorios', 'Streaming'];
    if (categoriasPrincipales.includes(filtroProducto)) {
        return p.categoria === filtroProducto;
    }
    return p.nombre.toLowerCase().includes(filtroProducto.toLowerCase());
  });

  // --- HANDLERS (Logica) ---
  const handleWheel = (e) => e.target.blur();
  const getPrimeraImagen = (imgs) => { if (!imgs) return ''; return imgs.split(',')[0].trim(); };

  // VENTA
  const handleSeleccionarProductoVenta = (e) => {
      const idProd = parseInt(e.target.value);
      const prodEncontrado = dataProductos.find(p => p.id === idProd);
      if (prodEncontrado) {
          setFormVenta({
              ...formVenta, productoId: idProd, nombreProducto: prodEncontrado.nombre,
              precioVenta: prodEncontrado.precio, costoUnitario: prodEncontrado.costo || 0 
          });
      } else {
          setFormVenta({ ...formVenta, productoId: '', nombreProducto: '', precioVenta: '', costoUnitario: 0 });
      }
  };

  const registrarOActualizarVenta = async (e) => {
      e.preventDefault();
      const gananciaTotalVenta = (parseFloat(formVenta.precioVenta) - parseFloat(formVenta.costoUnitario)) * parseInt(formVenta.cantidad);
      const ventaPayload = { ...formVenta, ganancia: gananciaTotalVenta };

      if (editandoVenta) {
          if (!window.confirm("¿Guardar cambios?")) return;
          try {
              await axios.put(`${api}/ventas/${ventaEditarId}`, ventaPayload);
              alert("✅ Venta actualizada"); cancelarEdicionVenta(); cargarDatos();
          } catch (error) { alert("Error al actualizar"); }
      } else {
          const producto = dataProductos.find(p => p.id === parseInt(formVenta.productoId));
          if (!producto || producto.stock < formVenta.cantidad) return alert("❌ Stock insuficiente.");
          if (!window.confirm(`¿Vender ${formVenta.cantidad}x ${producto.nombre}?`)) return;
          try {
              const nuevoStock = parseInt(producto.stock) - parseInt(formVenta.cantidad);
              await axios.put(`${api}/productos/actualizar/${producto.id}`, { ...producto, stock: nuevoStock });
              await axios.post(`${api}/ventas`, { ...ventaPayload, productoId: producto.id, nombreProducto: producto.nombre });
              alert("✅ ¡Venta Registrada!");
              setFormVenta({ productoId: '', nombreProducto: '', precioVenta: '', costoUnitario: 0, cantidad: 1, fecha: dayjs().format('YYYY-MM-DD'), comentarios: '' });
              cargarDatos();
          } catch (error) { alert("Error al procesar venta."); }
      }
  };

  const handleEditarVenta = (v) => { 
      const prod = dataProductos.find(p => p.id === v.producto_id);
      setFormVenta({ 
          productoId: v.producto_id, nombreProducto: v.nombre_producto, precioVenta: v.precio_venta, 
          cantidad: v.cantidad, fecha: dayjs(v.fecha_venta).format('YYYY-MM-DD'), 
          costoUnitario: prod ? prod.costo : 0, comentarios: v.comentarios || '' 
      });
      setEditandoVenta(true); setVentaEditarId(v.id); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelarEdicionVenta = () => { setEditandoVenta(false); setVentaEditarId(null); setFormVenta({ productoId: '', nombreProducto: '', precioVenta: '', costoUnitario: 0, cantidad: 1, fecha: dayjs().format('YYYY-MM-DD'), comentarios: '' }); };
  const handleEliminarVenta = (id) => { if(window.confirm("¿Eliminar?")) axios.delete(`${api}/ventas/${id}`).then(() => cargarDatos()); };

  // PRODUCTOS
  const limpiarFormProducto = () => { setFormProducto({ nombre: '', precio: '', costo: '', categoria: 'Cases', imagen_url: '', descripcion: '', stock: '10', oferta: false, visible: true }); setEditandoProducto(false); setProductoEditarId(null); };
  
  const guardarProducto = (e) => { 
    e.preventDefault(); 
    const payload = { ...formProducto, stock: parseInt(formProducto.stock) || 0, precio: parseFloat(formProducto.precio) || 0, costo: parseFloat(formProducto.costo) || 0 };
    axios.post(`${api}/productos/registrar`, payload).then(() => { alert("✅ Producto Creado"); cargarDatos(); limpiarFormProducto(); }).catch(err => { console.error(err); alert("Error al guardar."); }); 
  };
  
  const actualizarProducto = (e) => { 
    e.preventDefault(); 
    const payload = { ...formProducto, stock: parseInt(formProducto.stock) || 0, precio: parseFloat(formProducto.precio) || 0, costo: parseFloat(formProducto.costo) || 0 };
    axios.put(`${api}/productos/actualizar/${productoEditarId}`, payload).then(() => { alert("✅ Producto Actualizado"); cargarDatos(); limpiarFormProducto(); }).catch(err => { console.error(err); alert("Error al actualizar."); });
  };
  
  const handleEditarProducto = (p) => { setFormProducto({ nombre: p.nombre, precio: p.precio, costo: p.costo || '', categoria: p.categoria, imagen_url: p.imagen_url, descripcion: p.descripcion, stock: p.stock, oferta: p.oferta === 1, visible: p.visible === 1 }); setEditandoProducto(true); setProductoEditarId(p.id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleEliminarProducto = (id) => { if (!window.confirm("¿Eliminar producto?")) return; axios.delete(`${api}/productos/eliminar/${id}`).then(() => cargarDatos()); };

  // GASTOS
  const guardarGasto = (e) => {
    e.preventDefault();
    if (!formGasto.descripcion || !formGasto.monto) return alert("Llena los campos");
    axios.post(`${api}/gastos`, formGasto).then(() => { alert("✅ Gasto registrado"); setFormGasto({ descripcion: '', monto: '', fecha: dayjs().format('YYYY-MM-DD') }); cargarDatos(); }).catch(err => alert("Error al guardar gasto."));
  };
  const handleEliminarGasto = (id) => { if(window.confirm("¿Borrar gasto?")) axios.delete(`${api}/gastos/${id}`).then(() => cargarDatos()); };


  return (
    <div className="row">
        {/* DASHBOARD */}
        <div className="col-12 mb-5">
          <div className="row g-3">
              <div className="col-md-3"><div className="card shadow-sm border-0 h-100" style={{borderLeft: '5px solid #0dcaf0'}}><div className="card-body"><div className="d-flex justify-content-between align-items-start"><div><span className="text-muted small fw-bold text-uppercase">Ventas Semana</span><h3 className="fw-bold my-2 text-dark">S/ {ventasSemana.toFixed(2)}</h3><small className="text-info"><i className="bi bi-calendar-week me-1"></i> Últimos 7 días</small></div><div className="bg-light rounded-circle p-3 text-info"><i className="bi bi-graph-up-arrow fs-4"></i></div></div></div></div></div>
              <div className="col-md-3"><div className="card shadow-sm border-0 h-100" style={{borderLeft: '5px solid #4e54c8'}}><div className="card-body"><div className="d-flex justify-content-between align-items-start"><div><span className="text-muted small fw-bold text-uppercase">Ventas Mes</span><h3 className="fw-bold my-2" style={{color: '#4e54c8'}}>S/ {ventasMes.toFixed(2)}</h3><small className="text-muted"><i className="bi bi-calendar-month me-1"></i> (Solo Productos)</small></div><div className="bg-light rounded-circle p-3" style={{color: '#4e54c8'}}><i className="bi bi-wallet2 fs-4"></i></div></div></div></div></div>
              <div className="col-md-3"><div className="card shadow-sm border-0 h-100" style={{borderLeft: '5px solid #dc3545'}}><div className="card-body"><div className="d-flex justify-content-between align-items-start"><div><span className="text-muted small fw-bold text-uppercase">Total Gastado</span><h3 className="fw-bold my-2 text-danger">S/ {totalGastadoProductos.toFixed(2)}</h3><small className="text-danger opacity-75" style={{fontSize: '0.75rem'}}>Inventario + Costo Ventas</small></div><div className="bg-light rounded-circle p-3 text-danger"><i className="bi bi-cart-x fs-4"></i></div></div></div></div></div>
              <div className="col-md-3"><div className="card shadow-sm border-0 h-100 bg-success text-white"><div className="card-body"><div className="d-flex justify-content-between align-items-start"><div><span className="small fw-bold text-uppercase opacity-75">Ganancia Neta (Mes)</span><h3 className="fw-bold my-2">S/ {gananciaMes.toFixed(2)}</h3><small className="opacity-75"><i className="bi bi-check-circle me-1"></i> Margen limpio</small></div><div className="bg-white bg-opacity-25 rounded-circle p-3 text-white"><i className="bi bi-cash-stack fs-4"></i></div></div></div></div></div>
          </div>
        </div>

        <div className="col-md-4 mb-4">
            {/* FORMULARIO VENTA */}
            <div className={`card p-4 shadow-sm border-0 bg-white mb-4`} style={{borderRadius:'15px', borderLeft: editandoVenta ? '5px solid #ffc107' : '5px solid #198754'}}>
                <h5 className={`fw-bold mb-3 ${editandoVenta ? 'text-warning' : 'text-success'}`}><i className={`bi ${editandoVenta ? 'bi-pencil-square' : 'bi-cart-check-fill'} me-2`}></i>{editandoVenta ? 'EDITAR VENTA' : 'REGISTRAR VENTA'}</h5>
                <form onSubmit={registrarOActualizarVenta}>
                    <div className="mb-2">
                      <label className="small text-muted fw-bold">Producto</label>
                      {editandoVenta ? (
                        <input className="form-control bg-light" value={formVenta.nombreProducto} readOnly />
                      ) : (
                        <select className="form-select" value={formVenta.productoId} onChange={handleSeleccionarProductoVenta} required style={{height:'45px'}}>
                          <option value="">Selecciona...</option>
                          {["Cases", "Auriculares", "Cargadores", "Accesorios", "Streaming"].map(cat => {
                            const productosCat = dataProductos.filter(p => p.categoria === cat);
                            if(productosCat.length === 0) return null;
                            return (
                              <optgroup key={cat} label={cat} style={{fontWeight:'bold', color:'#198754'}}>
                                {productosCat.map(p => (
                                  <option key={p.id} value={p.id} style={{color:'black', fontWeight:'normal'}}>
                                    {p.nombre} (Stock: {p.stock})
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                          {dataProductos.filter(p => !["Cases", "Auriculares", "Cargadores", "Accesorios", "Streaming"].includes(p.categoria)).length > 0 && (
                            <optgroup label="Otros">
                              {dataProductos.filter(p => !["Cases", "Auriculares", "Cargadores", "Accesorios", "Streaming"].includes(p.categoria)).map(p => (
                                <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      )}
                    </div>

                    <div className="row mb-2">
                      <div className="col-6"><label className="small text-muted fw-bold">Precio Unit.</label><input type="number" onWheel={handleWheel} className="form-control" value={formVenta.precioVenta} onChange={e=>setFormVenta({...formVenta, precioVenta:e.target.value})} required placeholder="S/" /></div>
                      <div className="col-6"><label className="small text-muted fw-bold">Cantidad</label><input type="number" onWheel={handleWheel} className="form-control" value={formVenta.cantidad} onChange={e=>setFormVenta({...formVenta, cantidad:e.target.value})} min="1" required /></div>
                    </div>
                    
                    <div className="mb-2"><label className="small text-muted fw-bold">Fecha</label><input type="date" className="form-control" value={formVenta.fecha} onChange={e=>setFormVenta({...formVenta, fecha:e.target.value})} /></div>
                    <div className="mb-3"><label className="small text-muted fw-bold">Comentarios <span className="text-muted fw-normal" style={{fontSize:'0.7rem'}}>(Opcional)</span></label><textarea className="form-control" rows="2" placeholder="Ej: Cliente pidió descuento..." value={formVenta.comentarios} onChange={e => setFormVenta({...formVenta, comentarios: e.target.value})}></textarea></div>
                    <div className="d-flex gap-2"><button className={`btn w-100 fw-bold rounded-pill ${editandoVenta ? 'btn-warning text-dark' : 'btn-success text-white'}`}>{editandoVenta ? 'ACTUALIZAR' : 'VENDER Y GUARDAR'}</button>{editandoVenta && (<button type="button" className="btn btn-secondary rounded-pill" onClick={cancelarEdicionVenta}>Cancelar</button>)}</div>
                </form>
            </div>

            {/* FORMULARIO PRODUCTO */}
            <div className="card p-4 shadow-sm border-0 bg-white mb-4" style={{borderRadius:'15px', opacity: editandoProducto ? 1 : 0.9}}>
                <h5 className="fw-bold mb-4" style={{color: '#4E54C8'}}><i className="bi bi-plus-lg me-2"></i>{editandoProducto ? 'EDITAR PRODUCTO' : 'AGREGAR STOCK / NUEVO'}</h5>
                <form onSubmit={editandoProducto ? actualizarProducto : guardarProducto}>
                    <div className="mb-3"><label className="small text-muted fw-bold">Nombre</label><input className="form-control" value={formProducto.nombre} onChange={e=>setFormProducto({...formProducto, nombre:e.target.value})} required style={{height:'45px'}}/></div>
                    <div className="row mb-3"><div className="col-6"><label className="small text-muted fw-bold">Precio Venta</label><input className="form-control" type="number" onWheel={handleWheel} value={formProducto.precio} onChange={e=>setFormProducto({...formProducto, precio:e.target.value})} required style={{height:'45px'}}/></div><div className="col-6"><label className="small text-muted fw-bold text-success">Costo (Tuyo)</label><input className="form-control" type="number" onWheel={handleWheel} value={formProducto.costo} onChange={e=>setFormProducto({...formProducto, costo:e.target.value})} placeholder="S/" style={{height:'45px', borderColor:'#198754'}}/></div></div>
                    <div className="mb-3"><label className="small text-muted fw-bold">Stock Actual</label><input className="form-control" type="number" onWheel={handleWheel} value={formProducto.stock} onChange={e=>setFormProducto({...formProducto, stock:e.target.value})} style={{height:'45px'}}/></div>
                    <div className="mb-3"><label className="small text-muted fw-bold">Categoría</label><select className="form-select" value={formProducto.categoria} onChange={e=>setFormProducto({...formProducto, categoria:e.target.value})} style={{height:'45px'}}><option>Cases</option><option>Auriculares</option><option>Cargadores</option><option>Streaming</option><option>Accesorios</option></select></div>
                    <div className="mb-3"><label className="small text-muted fw-bold">Imagen URL</label><input className="form-control" value={formProducto.imagen_url} onChange={e=>setFormProducto({...formProducto, imagen_url:e.target.value})} placeholder="url1.jpg, url2.jpg" style={{height:'45px'}}/></div>
                    <div className="mb-3"><label className="small text-muted fw-bold">Descripción</label><textarea className="form-control" rows="2" value={formProducto.descripcion} onChange={e=>setFormProducto({...formProducto, descripcion:e.target.value})}></textarea></div>
                    <div className="form-check form-switch mb-2"><input className="form-check-input" type="checkbox" checked={formProducto.oferta} onChange={e=>setFormProducto({...formProducto, oferta:e.target.checked})} /><label className="form-check-label text-danger fw-bold">¡OFERTA!</label></div>
                    <div className="form-check form-switch mb-4"><input className="form-check-input" type="checkbox" checked={formProducto.visible} onChange={e=>setFormProducto({...formProducto, visible:e.target.checked})} /><label className="form-check-label fw-bold" style={{color: formProducto.visible ? '#0d6efd' : '#6c757d'}}>{formProducto.visible ? <><i className="bi bi-eye-fill me-1"></i> Visible en Web</> : <><i className="bi bi-eye-slash-fill me-1"></i> Oculto al Público</>}</label></div>
                    <button className={`btn w-100 fw-bold text-white py-2`} style={{backgroundColor: editandoProducto ? '#ffc107' : '#5664d2', borderRadius:'25px'}}>{editandoProducto ? 'ACTUALIZAR' : 'GUARDAR'}</button>
                    {editandoProducto && <button type="button" className="btn btn-light w-100 mt-2 rounded-pill" onClick={limpiarFormProducto}>Cancelar</button>}
                </form>
            </div>

            {/* GASTOS */}
            <div className="card p-4 shadow-sm border-0 bg-white" style={{borderRadius:'15px', borderLeft: '5px solid #dc3545'}}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0 text-danger"><i className="bi bi-graph-down-arrow me-2"></i>GASTOS</h5>
                  <div className="badge bg-danger bg-opacity-10 text-danger p-2 px-3 rounded-pill">Mes: S/ {totalGastosMesOperativo.toFixed(2)}</div>
                </div>
                <form onSubmit={guardarGasto} className="mb-3">
                  <div className="row g-2">
                      <div className="col-12"><input className="form-control form-control-sm" placeholder="Descripción (Luz, Agua, etc.)" value={formGasto.descripcion} onChange={e=>setFormGasto({...formGasto, descripcion:e.target.value})} /></div>
                      <div className="col-6"><input type="number" onWheel={handleWheel} step="0.01" className="form-control form-control-sm" placeholder="Monto S/" value={formGasto.monto} onChange={e=>setFormGasto({...formGasto, monto:e.target.value})} /></div>
                      <div className="col-6"><input type="date" className="form-control form-control-sm" value={formGasto.fecha} onChange={e=>setFormGasto({...formGasto, fecha:e.target.value})} /></div>
                      <div className="col-12"><button className="btn btn-danger btn-sm w-100 fw-bold rounded-pill">REGISTRAR GASTO</button></div>
                  </div>
                </form>
                <div style={{maxHeight: '150px', overflowY: 'auto'}}>
                    <ul className="list-group list-group-flush small">
                      {dataGastos.map(g => (
                        <li key={g.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                          <div><div className="fw-bold">{g.descripcion}</div><div className="text-muted" style={{fontSize:'0.7rem'}}>{dayjs(g.fecha).format('DD/MM/YYYY')}</div></div>
                          <div className="d-flex align-items-center gap-2"><span className="text-danger fw-bold">-S/{g.monto}</span><button onClick={()=>handleEliminarGasto(g.id)} className="btn btn-sm text-muted p-0"><i className="bi bi-x-circle-fill"></i></button></div>
                        </li>
                      ))}
                      {dataGastos.length === 0 && <li className="text-muted text-center small">Sin gastos registrados.</li>}
                    </ul>
                </div>
            </div>
        </div>

        {/* TABLA DERECHA */}
        <div className="col-md-8">
            <div className="card shadow-sm border-0 mb-4" style={{borderRadius:'15px', backgroundColor:'#fff3cd'}}>
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-2"><h6 className="fw-bold mb-0 text-dark"><i className="bi bi-cloud-check me-2"></i>Historial de Ventas (Nube)</h6><span className="badge bg-warning text-dark">{dataVentas.length} ventas</span></div>
                    <div style={{maxHeight:'200px', overflowY:'auto'}}>
                        <table className="table table-sm table-borderless mb-0 small align-middle">
                            <thead><tr><th>Producto</th><th>Cant.</th><th>Total</th><th>Ganancia</th><th>Fecha</th><th className="text-end">Acción</th></tr></thead>
                            <tbody>{dataVentas.map(v => (<tr key={v.id} style={{borderBottom:'1px solid #faeacc'}}><td>{v.nombre_producto}</td><td>{v.cantidad}</td><td className="fw-bold">S/ {(v.precio_venta * v.cantidad).toFixed(2)}</td><td className="text-success fw-bold">+S/ {v.ganancia}</td><td className="text-muted">{dayjs(v.fecha_venta).format('DD/MM')}</td><td className="text-end"><button onClick={() => handleEditarVenta(v)} className="btn btn-sm p-0 me-2 text-primary" title="Editar"><i className="bi bi-pencil-fill"></i></button><button onClick={() => handleEliminarVenta(v.id)} className="btn btn-sm p-0 text-danger" title="Eliminar"><i className="bi bi-trash-fill"></i></button></td></tr>))}{dataVentas.length === 0 && <tr><td colSpan="6" className="text-center text-muted">Aún no hay ventas registradas.</td></tr>}</tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm border-0" style={{borderRadius:'15px', overflow:'hidden'}}>
                <div className="p-3 bg-white border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <h5 className="mb-0 text-dark">Inventario ({productosFiltrados.length})</h5>
                  <div className="d-flex gap-1 flex-wrap align-items-center">
                    <button onClick={() => setFiltroProducto('Todos')} className={`btn btn-sm rounded-pill fw-bold ${filtroProducto === 'Todos' ? 'btn-primary' : 'btn-light text-muted'}`} style={{fontSize: '0.75rem', border: '1px solid #eee'}}>Todos</button>
                    <div className="btn-group">
                       <button className={`btn btn-sm rounded-pill fw-bold dropdown-toggle ${filtroProducto.includes('Cases') || filtroProducto.includes('iPhone') ? 'btn-primary' : 'btn-light text-muted'}`} type="button" data-bs-toggle="dropdown" aria-expanded="false" style={{fontSize: '0.75rem', border: '1px solid #eee'}}>
                        {filtroProducto.includes('iPhone') ? filtroProducto : 'Cases'}
                       </button>
                       <ul className="dropdown-menu shadow" style={{maxHeight:'300px', overflowY:'auto'}}>
                         <li><button className="dropdown-item fw-bold" onClick={()=>setFiltroProducto('Cases')}>Ver Todos los Cases</button></li>
                         <li><hr className="dropdown-divider"/></li>
                         {MODELOS_IPHONE.map(modelo => (
                           <li key={modelo}><button className="dropdown-item small" onClick={()=>setFiltroProducto(modelo)}>{modelo}</button></li>
                         ))}
                       </ul>
                    </div>
                    <button onClick={() => setFiltroProducto('Auriculares')} className={`btn btn-sm rounded-pill fw-bold ${filtroProducto === 'Auriculares' ? 'btn-primary' : 'btn-light text-muted'}`} style={{fontSize: '0.75rem', border: '1px solid #eee'}}>Auriculares</button>
                    <button onClick={() => setFiltroProducto('Cargadores')} className={`btn btn-sm rounded-pill fw-bold ${filtroProducto === 'Cargadores' ? 'btn-primary' : 'btn-light text-muted'}`} style={{fontSize: '0.75rem', border: '1px solid #eee'}}>Cargadores</button>
                    <button onClick={() => setFiltroProducto('Accesorios')} className={`btn btn-sm rounded-pill fw-bold ${filtroProducto === 'Accesorios' ? 'btn-primary' : 'btn-light text-muted'}`} style={{fontSize: '0.75rem', border: '1px solid #eee'}}>Accesorios</button>
                  </div>
                </div>

                <div className="table-responsive">
                    <table className="table mb-0 align-middle">
                        <thead className="text-white" style={{backgroundColor: '#4E54C8'}}><tr><th className="py-3 ps-4">FOTO</th><th className="py-3">PRODUCTO / COSTO</th><th className="py-3">STOCK</th><th className="py-3 text-end pe-4">ACCIÓN</th></tr></thead>
                        <tbody>
                            {productosFiltrados.map(p => {
                                const primeraImagen = getPrimeraImagen(p.imagen_url);
                                const ganancia = (Number(p.precio) - Number(p.costo || 0));
                                return (
                                <tr key={p.id} className="border-bottom">
                                    <td className="ps-4"><img src={primeraImagen && primeraImagen.startsWith('http') ? primeraImagen : `/imagenes/${primeraImagen}`} width="50" height="50" style={{objectFit:'contain', borderRadius:'5px'}} onError={(e)=>e.target.src='https://placehold.co/50x50?text=No+Img'} alt="producto"/></td>
                                    <td>
                                      <div className="fw-bold text-dark">{p.nombre} {p.visible === 0 && <span className="badge bg-secondary ms-2 small"><i className="bi bi-eye-slash-fill"></i> OCULTO</span>}</div>
                                      <div className="d-flex gap-2 align-items-center"><span className="fw-bold text-primary">S/ {p.precio}</span>{p.costo && (<small className="text-muted" style={{fontSize: '0.75rem'}}>(Costo: S/{p.costo} | Gana: <span className="text-success fw-bold">S/{ganancia.toFixed(2)}</span>)</small>)}</div>
                                      <div className="mt-1"><span className="badge bg-light text-dark border">{p.categoria}</span>{p.oferta === 1 && <span className="badge bg-danger ms-1">Oferta</span>}</div>
                                    </td>
                                    <td><span className={`fw-bold ${p.stock < 5 ? 'text-danger' : 'text-dark'}`}>{p.stock}</span>{p.stock < 5 && <div style={{fontSize:'0.6rem'}} className="text-danger fw-bold">¡POCO!</div>}</td>
                                    <td className="text-end pe-4"><div className="d-flex justify-content-end gap-2"><button onClick={() => handleEditarProducto(p)} className="btn text-white px-3 fw-bold btn-sm" style={{backgroundColor: '#5664d2', borderRadius: '20px'}}>editar</button><button onClick={() => handleEliminarProducto(p.id)} className="btn text-white px-3 fw-bold btn-sm" style={{backgroundColor: '#dc3545', borderRadius: '20px'}}>eliminar</button></div></td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
}

export default VistaProductos;
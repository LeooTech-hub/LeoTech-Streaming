
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { NO_CACHE_HEADERS, normalizeEliminado } from '../api';

// --- HELPERS EXTERNOS Y CONSTANTES ---
const EMPTY_ARRAY = [];

const getFechaVencimientoStr = (c) => {
  if (!c) return '';
  return c.fecha_finalizacion || c.fecha_fin || c.vencimiento || c.fechaVencimiento || '';
};

const compararVencimiento = (a, b) => {
  const fA = getFechaVencimientoStr(a);
  const fB = getFechaVencimientoStr(b);

  if (!fA && !fB) return 0;
  if (!fA) return 1;
  if (!fB) return -1;

  return dayjs(fA).valueOf() - dayjs(fB).valueOf();
};

function VistaStreaming({ api }) {
  // --- DATOS ---
  const [dataClientes, setDataClientes] = useState([]);
  const [dataEliminados, setDataEliminados] = useState([]);
  const [dataInventario, setDataInventario] = useState([]);

  // --- ESTADO NOTIFICACIONES Y PAPELERA ---
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [mostrarPapelera, setMostrarPapelera] = useState(false);
  const [filtroPapelera, setFiltroPapelera] = useState('');
  const [toast, setToast] = useState({ mostrar: false, mensaje: '', tipo: 'success' });

  // --- FILTROS ---
  const [filtroCliente, setFiltroCliente] = useState('Todos');
  const [filtroStock, setFiltroStock] = useState('Todos');
  
  const LISTA_PLATAFORMAS = ['Netflix', 'Hbo Max', 'Disney+', 'Prime Video', 'Spotify', 'Crunchyroll', 'Vix', 'Paramount'];

  // --- ESTADOS EDICIÓN ---
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [clienteEditarId, setClienteEditarId] = useState(null);
  const [editandoStock, setEditandoStock] = useState(false);
  const [stockEditarId, setStockEditarId] = useState(null);

  // --- ESTADO RENOVACIÓN PERFIL ---
  const [perfilRenovar, setPerfilRenovar] = useState(null);
  const [formRenovar, setFormRenovar] = useState({
    id: null,
    nombre_cliente: '',
    servicio: 'Netflix',
    perfil: '',
    pin: '',
    monto: '',
    fecha_finalizacion: ''
  });
  const [cargandoRenovacion, setCargandoRenovacion] = useState(false);

  // --- ESTADO RENOVACIÓN DE STOCK ---
  const [stockRenovar, setStockRenovar] = useState(null);
  const [formRenovarStock, setFormRenovarStock] = useState({
    id: null,
    correo: '',
    servicio: 'Netflix',
    contrasena: '',
    monto: '',
    fechaInicio: dayjs().format('YYYY-MM-DD'),
    nuevaFechaVence: '',
    actualizarCostoBase: false
  });
  const [cargandoRenovacionStock, setCargandoRenovacionStock] = useState(false);

  // --- FORMULARIOS ---
  const [formCliente, setFormCliente] = useState({ 
    nombre: '', celular: '', servicio: 'Netflix', perfil: '', pin: '', 
    correo: '', contrasena: '', 
    fecha_inicio: dayjs().format('YYYY-MM-DD'), 
    fecha_fin: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    monto: '' 
  });

  const [formStock, setFormStock] = useState({ 
    correo: '', contrasena: '', servicio: 'Netflix', costo: '', 
    fecha_entrada: dayjs().format('YYYY-MM-DD'), fecha_vencimiento: dayjs().add(30, 'day').format('YYYY-MM-DD')
  });

  // --- CARGAR DATOS ---
  const cargarDatos = useCallback(() => {
    const ts = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`; 
    const headers = NO_CACHE_HEADERS;

    axios.get(`${api}/clientes?t=${ts}`, { headers }).then(res => {
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
      const normalized = normalizeEliminado(list);
      console.log(`[VistaStreaming] Clientes activos recibidos desde la API: ${normalized.length}`);
      setDataClientes(normalized);
    }).catch(err => {
      console.error("Error al cargar clientes:", err);
      setDataClientes([]);
    });

    // axios.get(`${api}/clientes/eliminados?t=${ts}`, { headers }).then(res => {
    //   const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
    //   const normalized = normalizeEliminado(list);
    //   console.log(`[VistaStreaming API Audit] Elementos de la papelera recibidos desde la API: ${normalized.length}`, normalized);
    //   setDataEliminados(normalized);
    // }).catch(err => {
    //   console.error("Error al cargar eliminados:", err);
    //   setDataEliminados([]);
    // });

    axios.get(`${api}/inventario?t=${ts}`, { headers }).then(res => {
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
      setDataInventario(list);
    }).catch(err => {
      console.error("Error al cargar inventario:", err);
      setDataInventario([]);
    });
  }, [api]); 

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // --- CÁLCULOS SEGUROS MEMOIZADOS Y FILTRO FLEXIBLE PAPELERA ---
  // Evaluamos tanto valores numéricos como booleanos provenientes de TiDB:
  // (p.eliminado == 1 || p.eliminado === true)
  const enPapelera = useMemo(() => {
    const directos = Array.isArray(dataEliminados) ? dataEliminados : [];
    const desdeClientes = Array.isArray(dataClientes) ? dataClientes.filter(p => p.eliminado === 1 || p.eliminado === true || p.eliminado === '1' || p.eliminado === 'true' || Number(p.eliminado) === 1) : [];

    const mapaPapelera = new Map();
    [...directos, ...desdeClientes].forEach(p => {
      if (p && p.id != null) {
        mapaPapelera.set(p.id, {
          ...p,
          eliminado: 1
        });
      }
    });

    const resultado = Array.from(mapaPapelera.values());
    console.log(`[VistaStreaming Screen Audit] Total de elementos de la papelera leídos en pantalla: ${resultado.length}`);
    return resultado;
  }, [dataEliminados, dataClientes]);

  const safeClientes = useMemo(() => {
    if (!Array.isArray(dataClientes)) return EMPTY_ARRAY;
    return dataClientes.filter(c => !(c.eliminado === 1 || c.eliminado === true || c.eliminado === '1' || c.eliminado === 'true' || Number(c.eliminado) === 1));
  }, [dataClientes]);

  const safeInventario = useMemo(() => (Array.isArray(dataInventario) ? dataInventario : EMPTY_ARRAY), [dataInventario]);
  const safeEliminados = enPapelera;

  const totalIngresosClientes = safeClientes.reduce((acc, cliente) => acc + Number(cliente.monto || 0), 0);
  const inversionRealStock = safeInventario.reduce((acc, cuenta) => acc + Number(cuenta.costo || 0), 0);
  const gananciaNetaClientes = totalIngresosClientes - inversionRealStock;

  const reportePlataformas = safeClientes.reduce((acc, curr) => {
    const plat = curr.servicio || 'Otros';
    if (!acc[plat]) acc[plat] = { cantidad: 0, dinero: 0 };
    acc[plat].cantidad += 1;
    acc[plat].dinero += Number(curr.monto || 0);
    return acc;
  }, {});

  const conteoStock = safeInventario.reduce((acc, curr) => {
    acc[curr.servicio] = (acc[curr.servicio] || 0) + 1;
    return acc;
  }, {});

  // --- LÓGICA DE NOTIFICACIONES ---
  const clientesPorVencer = useMemo(() => {
    const hoy = dayjs();
    return safeClientes.filter(c => {
        const fechaStr = getFechaVencimientoStr(c);
        if (!fechaStr) return false;
        const fechaFin = dayjs(fechaStr);
        const diasRestantes = fechaFin.diff(hoy, 'day');
        return diasRestantes <= 3;
    }).sort(compararVencimiento);
  }, [safeClientes]);

  // FILTRADO MEMOIZADO
  const clientesFiltrados = useMemo(() => {
    return safeClientes.filter(c => filtroCliente === 'Todos' ? true : c.servicio === filtroCliente);
  }, [safeClientes, filtroCliente]);

  const stockFiltrado = useMemo(() => {
    return safeInventario.filter(i => filtroStock === 'Todos' ? true : i.servicio === filtroStock);
  }, [safeInventario, filtroStock]);

  // AGRUPACIÓN Y ORDENAMIENTO DEUDORES/VENCIDOS PRIMERO
  const clientesAgrupados = useMemo(() => {
    const grupos = {};
    const clientesOrdenados = [...clientesFiltrados].sort(compararVencimiento);

    clientesOrdenados.forEach(c => {
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
    const s = (servicio || '').toLowerCase();
    if(s.includes('netflix')) return '#E50914';
    if(s.includes('disney')) return '#113CCF';
    if(s.includes('hbo max') || s.includes('hbo')) return '#991EEB';
    if(s.includes('prime video')) return '#00A8E1';
    if(s.includes('spotify')) return '#1DB954';
    if(s.includes('crunchyroll')) return '#F47521';
    return '#343a40';
  };

  // --- TOAST HELPER ---
  const mostrarToast = (mensaje, tipo = 'success') => {
    setToast({ mostrar: true, mensaje, tipo });
    setTimeout(() => setToast({ mostrar: false, mensaje: '', tipo: 'success' }), 4000);
  };

  // --- HANDLERS ELIMINAR / RESTAURAR ---
  const handleWheel = (e) => e.target.blur();

  const handleEliminar = (target, tipo) => { 
    if (tipo === 'cliente') {
      const clienteObj = typeof target === 'object' ? target : safeClientes.find(c => c.id === target);
      const id = typeof target === 'object' ? target.id : target;
      const nombreCliente = clienteObj ? (clienteObj.nombre_cliente || clienteObj.nombre || '>>> LIBRE <<<') : 'Perfil';

      if (!id) {
        mostrarToast("ID de perfil no encontrado", "danger");
        return;
      }

      if (!window.confirm(`¿Mover el perfil de "${nombreCliente}" a la Papelera?`)) return; 

      // Actualización optimista del estado React
      const perfilEliminado = clienteObj ? { ...clienteObj, eliminado: 1, fecha_eliminacion: new Date().toISOString() } : null;
      setDataClientes(prev => (Array.isArray(prev) ? prev.filter(c => c.id !== id) : []));
      if (perfilEliminado) {
        setDataEliminados(prev => (Array.isArray(prev) ? [perfilEliminado, ...prev] : [perfilEliminado]));
      }

      axios.delete(`${api}/delete/${id}`).then(res => {
        if (res.data && res.data.success === false) {
          throw new Error(res.data.error || "Error al mover a la papelera");
        }
        mostrarToast(`Perfil de "${nombreCliente}" movido a la Papelera 🗑️`, 'warning');
        cargarDatos();
      }).catch(err => {
        console.error("Error al mover a la papelera:", err);
        mostrarToast("Error al mover perfil a la papelera", "danger");
        cargarDatos();
      });
    } else {
      const id = typeof target === 'object' ? target.id : target;
      if (!id) return;
      if (!window.confirm("¿Eliminar esta cuenta del stock?")) return; 

      setDataInventario(prev => (Array.isArray(prev) ? prev.filter(i => i.id !== id) : []));

      axios.delete(`${api}/inventario/${id}`).then(res => {
        if (res.data && res.data.success === false) {
          throw new Error(res.data.error || "Error al eliminar del stock");
        }
        mostrarToast("Cuenta eliminada del stock", "warning");
        cargarDatos();
      }).catch(err => {
        console.error("Error al eliminar stock:", err);
        mostrarToast("Error al eliminar cuenta del stock", "danger");
        cargarDatos();
      }); 
    }
  };

  const handleRestaurar = (id, nombre) => {
    if (!id) {
      mostrarToast("ID de perfil no encontrado", "danger");
      return;
    }

    // Actualización optimista del estado React
    const perfilRestaurado = safeEliminados.find(item => item.id === id);
    setDataEliminados(prev => (Array.isArray(prev) ? prev.filter(item => item.id !== id) : []));
    if (perfilRestaurado) {
      setDataClientes(prev => (Array.isArray(prev) ? [...prev, { ...perfilRestaurado, eliminado: 0, fecha_eliminacion: null }] : [{ ...perfilRestaurado, eliminado: 0, fecha_eliminacion: null }]));
    }

    axios.put(`${api}/clientes/restaurar/${id}`).then(res => {
      if (res.data && res.data.success === false) {
        throw new Error(res.data.error || "Error al restaurar perfil");
      }
      mostrarToast(`Perfil "${nombre || 'Libre'}" restaurado con éxito 🎉`, 'success');
      cargarDatos();
    }).catch(err => {
      console.error("Error al restaurar perfil:", err);
      mostrarToast("Error al restaurar perfil", "danger");
      cargarDatos();
    });
  };

  const handleEliminarDefinitivo = (id, nombre) => {
    if (!id) {
      mostrarToast("ID de perfil no encontrado", "danger");
      return;
    }

    if (!window.confirm(`⚠️ ¿Estás seguro de ELIMINAR DEFINITIVAMENTE el perfil de "${nombre}"?\nEsta acción no se puede deshacer.`)) return;

    // Actualización optimista del estado React
    setDataEliminados(prev => (Array.isArray(prev) ? prev.filter(item => item.id !== id) : []));

    axios.delete(`${api}/clientes/destruir/${id}`).then(res => {
      if (res.data && res.data.success === false) {
        throw new Error(res.data.error || "Error al eliminar definitivamente");
      }
      mostrarToast(`Perfil "${nombre}" eliminado permanentemente`, 'danger');
      cargarDatos();
    }).catch(err => {
      console.error("Error al eliminar definitivamente:", err);
      mostrarToast("Error al eliminar definitivamente", "danger");
      cargarDatos();
    });
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

  // REQUERIMIENTO 2: BOTÓN PERFIL LIBRE AUTOMÁTICO
  const handleGenerarPerfilLibre = () => {
    setFormCliente(prev => ({
      ...prev,
      nombre: '>>> LIBRE <<<',
      celular: '',
      perfil: prev.perfil || 'Perfil 1',
      pin: '',
      monto: '0',
      fecha_inicio: dayjs().format('YYYY-MM-DD'),
      fecha_fin: dayjs().add(30, 'day').format('YYYY-MM-DD')
    }));
  };

  const handleGenerarPerfilLibreCuenta = (servicio, correo, contrasena, clientesExistentes = []) => {
    const perfilesPosibles = ['Perfil 1', 'Perfil 2', 'Perfil 3', 'Perfil 4', 'Perfil 5'];
    const ocupados = clientesExistentes.map(c => (c.perfil || '').trim().toLowerCase());
    let perfilLibre = perfilesPosibles.find(p => !ocupados.includes(p.toLowerCase()));
    if (!perfilLibre) {
      perfilLibre = `Perfil ${clientesExistentes.length + 1}`;
    }

    setFormCliente({
      nombre: '>>> LIBRE <<<',
      celular: '',
      servicio: servicio || 'Netflix',
      perfil: perfilLibre,
      pin: '',
      correo: correo || '',
      contrasena: contrasena || '',
      fecha_inicio: dayjs().format('YYYY-MM-DD'),
      fecha_fin: dayjs().add(30, 'day').format('YYYY-MM-DD'),
      monto: '0'
    });
    setEditandoCliente(false);
    setClienteEditarId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prepararPayloadCliente = (form) => {
      const nombreFinal = form.nombre ? form.nombre.trim() : '>>> LIBRE <<<';
      return {
          nombre: nombreFinal, nombre_cliente: nombreFinal,
          celular: form.celular || '', numero_celular: form.celular || '',
          pin: form.pin || '', 
          pin_perfil: form.pin || '',
          fecha_fin: form.fecha_fin, fecha_finalizacion: form.fecha_fin,
          servicio: form.servicio, perfil: form.perfil || 'Perfil 1',
          correo: form.correo, contrasena: form.contrasena,
          fecha_inicio: form.fecha_inicio, monto: form.monto === '' ? 0 : form.monto
      };
  };
  
  const guardarCliente = (e) => { 
      e.preventDefault(); 
      const payload = prepararPayloadCliente(formCliente);
      axios.post(`${api}/clientes`, payload).then((res) => { 
          if (res.data && (res.data.code || res.data.sqlMessage)) return alert("❌ ERROR BD:\n" + (res.data.sqlMessage));
          alert("✅ Cliente / Perfil Libre Registrado Correctamente"); cargarDatos(); limpiarFormCliente(); 
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
          fecha_fin: getFechaVencimientoStr(c) ? getFechaVencimientoStr(c).split('T')[0] : '', 
          monto: c.monto || ''
      }); 
      setEditandoCliente(true); setClienteEditarId(c.id); window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  // --- HANDLERS RENOVACIÓN DE PERFIL ---
  const handleAbrirModalRenovar = (c) => {
    const hoy = dayjs();
    const fechaFinActualStr = getFechaVencimientoStr(c);
    let baseDate = hoy;
    
    if (fechaFinActualStr) {
      const fin = dayjs(fechaFinActualStr);
      if (fin.isAfter(hoy)) {
        baseDate = fin;
      }
    }
    
    const nuevaFechaVencimiento = baseDate.add(30, 'day').format('YYYY-MM-DD');

    setFormRenovar({
      id: c.id,
      nombre_cliente: c.nombre_cliente || c.nombre || '',
      servicio: c.servicio || 'Netflix',
      perfil: c.perfil || 'Perfil 1',
      pin: c.pin_perfil || c.pin || '',
      monto: c.monto || 15,
      fecha_finalizacion: nuevaFechaVencimiento
    });
    setPerfilRenovar(c);
  };

  const handleConfirmarRenovacion = (e) => {
    e.preventDefault();
    if (!formRenovar || !formRenovar.id) return;

    const payload = {
      id: formRenovar.id,
      monto: Number(formRenovar.monto || 0),
      cliente_nombre: formRenovar.nombre_cliente,
      plataforma: formRenovar.servicio
    };

    const primaryUrl = api
      ? (api.endsWith('/') ? `${api}api/renovar` : `${api}/api/renovar`)
      : '/api/renovar';
    const fallbackUrl = primaryUrl === '/api/renovar' ? null : '/api/renovar';

    console.log('[AUDIT CLIENTE] URL de destino para renovación:', primaryUrl);
    console.log('[AUDIT CLIENTE] Payload de renovación enviado:', payload);
    setCargandoRenovacion(true);

    const makeRequest = (url, isFallback = false) => {
      axios.post(url, payload)
        .then(res => {
          console.log(`[AUDIT CLIENTE] Respuesta recibida de ${url}:`, res.status, res.data);
          if (res.status === 200 && res.data && res.data.success !== false) {
            mostrarToast(`🎉 Perfil de "${formRenovar.nombre_cliente}" renovado por S/ ${Number(formRenovar.monto || 0).toFixed(2)} hasta ${dayjs(formRenovar.fecha_finalizacion).format('DD/MM/YYYY')}!`, 'success');
            setPerfilRenovar(null);
            cargarDatos();
          } else {
            mostrarToast(`❌ Error: ${res.data?.message || res.data?.error || 'Error al renovar perfil'}`, 'danger');
          }
        })
        .catch(err => {
          console.error(`[AUDIT CLIENTE] Error al renovar perfil en ${url}:`, err);
          if (err.response && err.response.status === 404 && fallbackUrl && !isFallback) {
            console.warn(`[AUDIT CLIENTE] Endpoint ${primaryUrl} retornó 404. Reintentando en fallback ${fallbackUrl}...`);
            makeRequest(fallbackUrl, true);
            return;
          }
          mostrarToast(`❌ Error al procesar la renovación en el servidor (${err.response?.status || 'Error de red'}).`, 'danger');
        })
        .finally(() => {
          setCargandoRenovacion(false);
        });
    };

    makeRequest(primaryUrl);
  };



  // STOCK HANDLERS
  const handleFechaStockChange = (e) => { const ne = e.target.value; setFormStock({ ...formStock, fecha_entrada: ne, fecha_vencimiento: dayjs(ne).add(30, 'day').format('YYYY-MM-DD') }); };
  const limpiarFormStock = () => { setFormStock({ correo: '', contrasena: '', servicio: 'Netflix', costo: '', fecha_entrada: dayjs().format('YYYY-MM-DD'), fecha_vencimiento: dayjs().add(30, 'day').format('YYYY-MM-DD') }); setEditandoStock(false); setStockEditarId(null); };
  const guardarCuenta = (e) => { e.preventDefault(); axios.post(`${api}/inventario`, formStock).then(() => { alert("✅ Cuenta Agregada"); cargarDatos(); limpiarFormStock(); }); };
  const actualizarCuenta = (e) => { e.preventDefault(); axios.put(`${api}/inventario/${stockEditarId}`, formStock).then(() => { alert("✅ Stock Actualizado"); cargarDatos(); limpiarFormStock(); }); };
  const handleEditarStock = (i) => { setFormStock({ correo: i.correo, contrasena: i.contrasena, servicio: i.servicio, costo: i.costo, fecha_entrada: i.fecha_entrada ? i.fecha_entrada.split('T')[0] : '', fecha_vencimiento: i.fecha_vencimiento ? i.fecha_vencimiento.split('T')[0] : '' }); setEditandoStock(true); setStockEditarId(i.id); };

  // --- HANDLERS MODAL RENOVACIÓN DE STOCK ---
  const handleFechaInicioRenovarStockChange = (e) => {
    const nuevaFechaInicio = e.target.value;
    if (!nuevaFechaInicio) {
      setFormRenovarStock(prev => ({ ...prev, fechaInicio: '' }));
      return;
    }
    const nuevaFechaVenceCalculada = dayjs(nuevaFechaInicio).add(30, 'day').format('YYYY-MM-DD');
    setFormRenovarStock(prev => ({
      ...prev,
      fechaInicio: nuevaFechaInicio,
      nuevaFechaVence: nuevaFechaVenceCalculada
    }));
  };

  const handleAbrirModalRenovarStock = (cuenta) => {
    if (!cuenta || cuenta.id === undefined || cuenta.id === null) return;
    const targetId = cuenta.id;

    const hoy = dayjs();
    let baseDate = hoy;
    if (cuenta.fecha_vencimiento || cuenta.vence) {
      const fechaBaseStr = cuenta.fecha_vencimiento || cuenta.vence;
      const fv = dayjs(fechaBaseStr);
      if (fv.isValid() && fv.isAfter(hoy)) {
        baseDate = fv;
      }
    }
    const venceCalculado = baseDate.add(30, 'day').format('YYYY-MM-DD');

    const costoBase = (cuenta.costo !== undefined && cuenta.costo !== null && cuenta.costo !== '') 
      ? parseFloat(cuenta.costo) 
      : 0;

    setFormRenovarStock({
      id: targetId,
      correo: cuenta.correo || '',
      servicio: cuenta.servicio || 'Netflix',
      contrasena: cuenta.contrasena || '',
      monto: costoBase,
      fechaInicio: hoy.format('YYYY-MM-DD'),
      nuevaFechaVence: venceCalculado,
      actualizarCostoBase: true
    });
    setStockRenovar(cuenta);
  };

  const handleConfirmarRenovacionStock = (e) => {
    e.preventDefault();
    if (!formRenovarStock || formRenovarStock.id === undefined || formRenovarStock.id === null) return;

    const targetId = formRenovarStock.id;
    const nuevoMontoNum = parseFloat(formRenovarStock.monto || 0);
    const fechaVencimientoInput = formRenovarStock.nuevaFechaVence;
    const switchActualizarCosto = Boolean(formRenovarStock.actualizarCostoBase);

    const payload = {
      id: targetId,
      monto: nuevoMontoNum,
      nuevaFechaVence: fechaVencimientoInput,
      actualizarCostoBase: switchActualizarCosto,
      servicio: formRenovarStock.servicio,
      correo: formRenovarStock.correo
    };

    const primaryUrl = api
      ? (api.endsWith('/') ? `${api}api/inventario/renovar` : `${api}/api/inventario/renovar`)
      : 'https://leotech-streaming.onrender.com/api/inventario/renovar';
    const fallbackUrl = api
      ? (api.endsWith('/') ? `${api}inventario/renovar` : `${api}/inventario/renovar`)
      : 'https://leotech-streaming.onrender.com/inventario/renovar';

    setCargandoRenovacionStock(true);

    const makeRequest = (url, isFallback = false) => {
      axios.post(url, payload)
        .then(res => {
          if (res.status === 200 && res.data && res.data.success !== false) {
            const cuentaResp = res.data.cuentaRenovada || res.data;
            const nuevaFechaFinal = cuentaResp.nuevaFechaVence || cuentaResp.fecha_vencimiento || payload.nuevaFechaVence;

            mostrarToast(`🎉 Stock de ${formRenovarStock.servicio} (${formRenovarStock.correo}) renovado hasta ${dayjs(nuevaFechaFinal).format('DD/MM/YYYY')} por S/ ${nuevoMontoNum.toFixed(2)}!`, 'success');
            
            // Actualización inmaculada e inmediata del Estado Local en React comparando estrictamente por ID único
            setDataInventario(prevInventario => 
              (Array.isArray(prevInventario) ? prevInventario.map(item => {
                if (String(item.id) === String(targetId)) {
                  return {
                    ...item,
                    costo: switchActualizarCosto ? nuevoMontoNum : item.costo,
                    fecha_vencimiento: nuevaFechaFinal,
                    vence: nuevaFechaFinal
                  };
                }
                return item;
              }) : [])
            );

            setStockRenovar(null);
            cargarDatos();
          } else {
            mostrarToast(`❌ Error: ${res.data?.message || res.data?.error || 'Error al renovar stock'}`, 'danger');
          }
        })
        .catch(err => {
          console.error(`Error al renovar stock en ${url}:`, err);
          if (err.response && err.response.status === 404 && fallbackUrl && !isFallback) {
            makeRequest(fallbackUrl, true);
            return;
          }
          mostrarToast(`❌ Error al renovar stock: ${err.response?.data?.message || err.message}`, 'danger');
        })
        .finally(() => {
          setCargandoRenovacionStock(false);
        });
    };

    makeRequest(primaryUrl);
  };

  // ORDENAMIENTO DE SERVICIOS Y CUENTAS (DEUDORES / VENCIDOS PRIMERO)
  const serviciosOrdenados = useMemo(() => {
    return Object.keys(clientesAgrupados).sort((servA, servB) => {
      const getMinDateServ = (serv) => {
        let minTs = Infinity;
        Object.values(clientesAgrupados[serv]).forEach(perfiles => {
          perfiles.forEach(p => {
            const d = getFechaVencimientoStr(p);
            if (d) {
              const ts = dayjs(d).valueOf();
              if (ts < minTs) minTs = ts;
            }
          });
        });
        return minTs;
      };
      return getMinDateServ(servA) - getMinDateServ(servB);
    });
  }, [clientesAgrupados]);

  return (
    <div className="row position-relative">
        
        {/* 🔥 BOTÓN FLOTANTE NOTIFICACIONES Y PAPELERA */}
        <div className="position-absolute top-0 end-0 mt-n4 me-2 d-flex gap-2 align-items-center" style={{zIndex: 1000}}>
            <button 
                className="btn btn-light shadow position-relative rounded-pill border d-flex align-items-center gap-2 px-3" 
                onClick={() => {
                    setMostrarPapelera(true);
                    cargarDatos();
                }}
                style={{height: '50px'}}
                title="Historial de Perfiles Eliminados"
            >
                <i className="bi bi-trash3-fill text-danger" style={{fontSize: '1.2rem'}}></i>
                <span className="fw-bold text-dark d-none d-sm-inline" style={{fontSize: '0.85rem'}}>Papelera</span>
                {enPapelera.length > 0 && (
                    <span className="badge rounded-pill bg-danger">
                        {enPapelera.length}
                    </span>
                )}
            </button>
            <button 
                className="btn btn-light shadow position-relative rounded-circle border" 
                onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}
                style={{width: '50px', height: '50px'}}
                title="Vencimientos Próximos"
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
                                    const fechaFinStr = getFechaVencimientoStr(c);
                                    const fechaFin = dayjs(fechaFinStr);
                                    const diasRestantes = fechaFin.diff(dayjs(), 'day');
                                    let estado = { color: 'bg-warning', texto: 'Pronto' };
                                    if (diasRestantes < 0) estado = { color: 'bg-danger', texto: 'VENCIDO' };
                                    if (diasRestantes === 0) estado = { color: 'bg-danger', texto: 'HOY' };
                                    
                                    const celular = c.numero_celular || c.celular || '';
                                    
                                    const mensajeWsp = `Hola ${c.nombre_cliente || c.nombre}, te saluda LeoTech. Tu cuenta de ${c.servicio} vence el ${fechaFin.format('DD/MM')}. ¿Desearías renovar? 🚀`;
                                    
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
                                            <div className="mt-2 mt-md-0 d-flex align-items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAbrirModalRenovar(c)}
                                                    className="btn btn-success btn-sm rounded-pill fw-bold px-3 shadow-sm d-inline-flex align-items-center gap-1"
                                                    title="Renovar este perfil (+30 días)"
                                                >
                                                    <i className="bi bi-arrow-repeat me-1"></i>Renovar
                                                </button>
                                                {celular ? (
                                                    <a href={linkWsp} target="_blank" rel="noreferrer" className="btn btn-outline-success btn-sm rounded-pill fw-bold px-3 shadow-sm">
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
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0" style={{color: '#5664d2'}}>
                {editandoCliente ? '✏️ EDITAR CLIENTE' : '+ NUEVO CLIENTE (30 DÍAS)'}
              </h5>
              {!editandoCliente && (
                <button 
                  type="button" 
                  onClick={handleGenerarPerfilLibre} 
                  className="btn btn-sm text-white fw-bold shadow-sm"
                  style={{ backgroundColor: '#00C853', borderRadius: '20px', fontSize: '0.8rem', border: 'none' }}
                  title="Autorellenar perfil como libre"
                >
                  <i className="bi bi-plus-circle me-1"></i>+ Perfil Libre
                </button>
              )}
            </div>

            <form onSubmit={editandoCliente ? actualizarCliente : guardarCliente}>
              <h6 className="text-muted border-bottom pb-2 mb-3 small fw-bold">Datos del Cliente</h6>
              <div className="mb-3"><label className="form-label small text-muted">Nombre Cliente</label><input className="form-control" value={formCliente.nombre} onChange={e=>setFormCliente({...formCliente, nombre:e.target.value})} placeholder="Ej: Juan Perez o >>> LIBRE <<<" style={{height:'45px', backgroundColor:'#f8f9fa'}}/></div>
              <div className="mb-3"><label className="form-label small text-muted">Celular (WhatsApp)</label><input className="form-control" value={formCliente.celular} onChange={e=>setFormCliente({...formCliente, celular:e.target.value})} placeholder="51... (Opcional)" style={{height:'45px', backgroundColor:'#f8f9fa'}}/></div>
              
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
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h5 className="mb-0 fw-bold text-dark"><i className="bi bi-people-fill me-2"></i>Gestión de Cuentas</h5>
              <div className="d-flex align-items-center gap-2">
                <button 
                  className="btn btn-outline-danger btn-sm rounded-pill fw-bold shadow-sm d-flex align-items-center gap-1 px-3"
                  onClick={() => setMostrarPapelera(true)}
                  title="Ver perfiles en la papelera"
                  style={{fontSize:'0.85rem'}}
                >
                  <i className="bi bi-trash3-fill"></i>
                  <span>Papelera ({dataEliminados.length})</span>
                </button>
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
            </div>

            <div style={{maxHeight:'800px', overflowY:'auto', paddingRight:'5px'}}>
              {serviciosOrdenados.length === 0 && (
                <div className="alert alert-secondary text-center">No hay clientes activos en esta categoría.</div>
              )}
              {serviciosOrdenados.map(servicio => {
                const cuentasDeEsteServicio = clientesAgrupados[servicio];
                const colorMarca = getBrandColor(servicio);

                // Ordenar las cuentas/correos por fecha de vencimiento más urgente primero
                const correosOrdenados = Object.keys(cuentasDeEsteServicio).sort((correoA, correoB) => {
                  const getMinDateEmail = (list) => {
                    let minTs = Infinity;
                    list.forEach(p => {
                      const d = getFechaVencimientoStr(p);
                      if (d) {
                        const ts = dayjs(d).valueOf();
                        if (ts < minTs) minTs = ts;
                      }
                    });
                    return minTs;
                  };
                  return getMinDateEmail(cuentasDeEsteServicio[correoA]) - getMinDateEmail(cuentasDeEsteServicio[correoB]);
                });

                return (
                  <div key={servicio} className="mb-4">
                    <div className="d-flex align-items-center mb-2">
                        <span className="badge rounded-pill me-2" style={{backgroundColor: colorMarca, fontSize:'0.9rem'}}>{servicio}</span>
                        <div style={{height:'1px', backgroundColor: colorMarca, flexGrow:1, opacity:0.3}}></div>
                    </div>
                    {correosOrdenados.map(correo => {
                      const clientesEnCuenta = cuentasDeEsteServicio[correo];
                      
                      // Ordenamiento interno por vencimiento (Deudores / Vencidos primero)
                      const clientesEnCuentaOrdenados = [...clientesEnCuenta].sort(compararVencimiento);

                      const stockEncontrado = dataInventario.find(i => i.correo.trim().toLowerCase() === correo.trim().toLowerCase());
                      const passwordCuenta = stockEncontrado ? stockEncontrado.contrasena : (clientesEnCuenta[0].contrasena || '???');

                      return (
                        <div key={correo} className="card shadow-sm border-0 mb-3" style={{overflow:'hidden', borderRadius:'12px'}}>
                          <div className="card-header bg-light border-0 d-flex justify-content-between align-items-center py-2">
                             <div className="d-flex align-items-center gap-2" style={{overflow:'hidden'}}>
                                <i className="bi bi-envelope-at-fill text-muted"></i>
                                <div className="fw-bold text-dark text-truncate" style={{maxWidth:'180px'}} title={correo}>{correo}</div>
                                <div className="badge bg-secondary bg-opacity-10 text-dark border ms-1">Pass: {passwordCuenta}</div>
                             </div>
                             <div className="d-flex align-items-center gap-2">
                                <button 
                                  type="button"
                                  onClick={() => handleGenerarPerfilLibreCuenta(servicio, correo, passwordCuenta, clientesEnCuenta)}
                                  className="btn btn-sm text-white fw-bold px-2 py-1 shadow-sm"
                                  style={{ backgroundColor: '#00C853', borderRadius: '15px', fontSize: '0.75rem', border: 'none' }}
                                  title="Generar perfil libre para esta cuenta"
                                >
                                  <i className="bi bi-plus-circle me-1"></i>+ Libre
                                </button>
                                <span className="badge bg-primary rounded-pill">{clientesEnCuenta.length} Perfiles</span>
                             </div>
                          </div>
                          <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle text-nowrap">
                                <tbody>
                                  {clientesEnCuentaOrdenados.map(c => {
                                     const fechaFinStr = getFechaVencimientoStr(c);
                                     const diasRestantes = fechaFinStr ? dayjs(fechaFinStr).diff(dayjs(), 'day') : 999;
                                     const celular = c.numero_celular || c.celular;
                                     const pinVal = (c.pin_perfil || c.pin || '').toString().trim();

                                     return (
                                       <tr key={c.id}>
                                         <td className="ps-3" style={{width:'30%'}}>
                                            <div className="fw-bold text-dark small">{c.nombre_cliente || c.nombre}</div>
                                            { celular ? (
                                              <div className="text-success small" style={{fontSize:'0.7rem'}}>
                                                <i className="bi bi-whatsapp me-1"></i>{celular}
                                              </div>
                                            ) : (
                                              <div className="text-muted small opacity-75" style={{fontSize:'0.7rem'}}>
                                                <i className="bi bi-dash-circle me-1"></i>Sin celular
                                              </div>
                                            )}
                                         </td>
                                         <td>
                                            <div className="badge bg-light text-dark border">
                                              <i className="bi bi-person-circle me-1"></i>{c.perfil}
                                              {pinVal ? <span className="text-muted border-start ps-1 ms-1">{pinVal}</span> : null}
                                            </div>
                                         </td>
                                         <td className="text-center"><span className={`badge rounded-pill ${diasRestantes < 3 ? 'bg-danger' : 'bg-success'}`} style={{fontSize:'0.75rem'}}>{fechaFinStr ? dayjs(fechaFinStr).add(10,'hour').format('DD/MM') : '-'}</span></td>
                                         <td className="text-end pe-3">
                                            <button 
                                              type="button"
                                              onClick={() => handleAbrirModalRenovar(c)} 
                                              className="btn btn-sm text-white rounded-pill px-2 py-1 me-2 fw-bold shadow-sm d-inline-flex align-items-center gap-1 border-0"
                                              style={{ fontSize: '0.75rem', backgroundColor: '#10B981' }}
                                              title="Renovar este perfil (+30 días)"
                                            >
                                              <i className="bi bi-arrow-repeat"></i> Renovar
                                            </button>
                                            <button onClick={() => handleEditarCliente(c)} className="btn btn-sm btn-link p-0 me-2 text-decoration-none" title="Editar">✏️</button>
                                            <button onClick={() => handleEliminar(c, 'cliente')} className="btn btn-sm btn-link p-0 text-decoration-none" title="Mover a Papelera">❌</button>
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
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <button 
                            onClick={() => handleAbrirModalRenovarStock(i)} 
                            className="btn btn-sm fw-bold shadow-sm d-inline-flex align-items-center gap-1" 
                            style={{backgroundColor:'#10B981', color:'white', border:'none', borderRadius:'20px', padding:'5px 14px'}}
                            title={`Renovar ${i.servicio} (${i.correo})`}
                          >
                            <i className="bi bi-arrow-repeat"></i> renovar
                          </button>
                          <button 
                            onClick={() => handleEditarStock(i)} 
                            className="btn btn-sm fw-bold shadow-sm" 
                            style={{backgroundColor:'white', color:'#0d6efd', border:'1px solid #dee2e6', borderRadius:'20px', padding:'5px 15px'}}
                          >
                            editar
                          </button>
                          <button 
                            onClick={() => handleEliminar(i.id, 'inventario')} 
                            className="btn btn-sm fw-bold shadow-sm" 
                            style={{backgroundColor:'white', color:'#dc3545', border:'1px solid #dee2e6', borderRadius:'20px', padding:'5px 15px'}}
                          >
                            eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {stockFiltrado.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No tienes stock de {filtroStock} 😔</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 🗑️ MODAL HISTORIAL DE PERFILES ELIMINADOS (PAPELERA) */}
        {mostrarPapelera && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                
                {/* CABECERA MODAL */}
                <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #1e1e2f 0%, #2d2b42 100%)', borderBottom: '2px solid #dc3545' }}>
                  <div className="d-flex align-items-center gap-2">
                    <div className="p-2 bg-danger bg-opacity-20 rounded-circle text-danger d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                      <i className="bi bi-trash3-fill fs-5 text-white"></i>
                    </div>
                    <div>
                      <h5 className="modal-title fw-bold mb-0 text-white">Historial de Perfiles Eliminados</h5>
                      <small className="text-light opacity-75">Perfiles en papelera con opción de restauración</small>
                    </div>
                  </div>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setMostrarPapelera(false)}></button>
                </div>

                {/* CUERPO MODAL */}
                <div className="modal-body p-4 bg-light">
                  
                  {/* BARRA DE BÚSQUEDA */}
                  {enPapelera.length > 0 && (
                    <div className="mb-3">
                      <div className="input-group shadow-sm">
                        <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
                        <input 
                          type="text" 
                          className="form-control border-start-0 ps-0 bg-white" 
                          placeholder="Buscar por cliente, correo o servicio..." 
                          value={filtroPapelera}
                          onChange={e => setFiltroPapelera(e.target.value)}
                        />
                        {filtroPapelera && (
                          <button className="btn btn-outline-secondary border-start-0" onClick={() => setFiltroPapelera('')}>
                            <i className="bi bi-x"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* LISTADO DE ELIMINADOS */}
                  {enPapelera.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="mb-3 text-muted opacity-50">
                        <i className="bi bi-trash3" style={{ fontSize: '3.5rem' }}></i>
                      </div>
                      <h6 className="fw-bold text-secondary">La papelera está vacía</h6>
                      <p className="text-muted small mb-0">Los perfiles que elimines con la "X" roja aparecerán aquí para ser restaurados cuando lo necesites.</p>
                    </div>
                  ) : (
                    <div className="table-responsive bg-white rounded-3 shadow-sm border">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th>Cliente Original</th>
                            <th>Cuenta Asignada</th>
                            <th>Perfil / PIN</th>
                            <th>Fecha Eliminación</th>
                            <th className="text-end pe-3">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enPapelera
                            .filter(item => {
                              if (!filtroPapelera) return true;
                              const term = filtroPapelera.toLowerCase();
                              return (
                                (item.nombre_cliente || item.nombre || '').toLowerCase().includes(term) ||
                                (item.correo || '').toLowerCase().includes(term) ||
                                (item.servicio || '').toLowerCase().includes(term) ||
                                (item.perfil || '').toLowerCase().includes(term)
                              );
                            })
                            .map(item => {
                              const fechaElim = item.fecha_eliminacion ? dayjs(item.fecha_eliminacion).format('DD/MM/YYYY HH:mm') : 'No registrada';
                              const colorMarca = getBrandColor(item.servicio || '');
                              const nombreMostrar = item.nombre_cliente || item.nombre || '>>> LIBRE <<<';

                              return (
                                <tr key={item.id}>
                                  <td>
                                    <div className="fw-bold text-dark">{nombreMostrar}</div>
                                    {item.numero_celular || item.celular ? (
                                      <small className="text-muted"><i className="bi bi-whatsapp me-1 text-success"></i>{item.numero_celular || item.celular}</small>
                                    ) : (
                                      <small className="text-muted opacity-75">Sin número</small>
                                    )}
                                  </td>
                                  <td>
                                    <span className="badge rounded-pill me-1 text-white" style={{ backgroundColor: colorMarca }}>{item.servicio}</span>
                                    <div className="small text-muted text-truncate" style={{ maxWidth: '160px' }} title={item.correo}>{item.correo || 'Sin correo'}</div>
                                  </td>
                                  <td>
                                    <span className="badge bg-light text-dark border">
                                      <i className="bi bi-person-fill me-1"></i>{item.perfil || 'Perfil'}
                                    </span>
                                    {item.pin_perfil || item.pin ? (
                                      <span className="small text-muted ms-1">({item.pin_perfil || item.pin})</span>
                                    ) : null}
                                  </td>
                                  <td>
                                    <small className="text-danger fw-semibold">
                                      <i className="bi bi-clock-history me-1"></i>{fechaElim}
                                    </small>
                                  </td>
                                  <td className="text-end pe-3">
                                    <div className="d-flex justify-content-end gap-2">
                                      <button 
                                        onClick={() => handleRestaurar(item.id, nombreMostrar)}
                                        className="btn btn-sm btn-outline-success rounded-pill fw-bold shadow-sm d-flex align-items-center gap-1 px-3"
                                        title="Restaurar perfil a vista principal"
                                      >
                                        <i className="bi bi-arrow-counterclockwise fs-6"></i>
                                        <span>Restaurar</span>
                                      </button>
                                      <button 
                                        onClick={() => handleEliminarDefinitivo(item.id, nombreMostrar)}
                                        className="btn btn-sm btn-outline-danger rounded-circle p-1 d-flex align-items-center justify-content-center"
                                        style={{ width: '32px', height: '32px' }}
                                        title="Eliminar definitivamente"
                                      >
                                        <i className="bi bi-x-lg"></i>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>

                {/* PIE MODAL */}
                <div className="modal-footer bg-white border-top-0 d-flex justify-content-between">
                  <span className="small text-muted">Perfiles eliminados: <strong>{dataEliminados.length}</strong></span>
                  <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setMostrarPapelera(false)}>
                    Cerrar
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 🔄 MODAL DE RENOVACIÓN DE PERFIL */}
        {perfilRenovar && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                
                {/* CABECERA MODAL */}
                <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                  <div className="d-flex align-items-center gap-2">
                    <div className="p-2 bg-white bg-opacity-20 rounded-circle text-white d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                      <i className="bi bi-arrow-repeat fs-4"></i>
                    </div>
                    <div>
                      <h5 className="modal-title fw-bold mb-0 text-white">Renovar Perfil de Streaming</h5>
                      <small className="text-white opacity-85">Extender vigencia y registrar pago en liquidez</small>
                    </div>
                  </div>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setPerfilRenovar(null)}></button>
                </div>

                <form onSubmit={handleConfirmarRenovacion}>
                  <div className="modal-body p-4 bg-light">
                    
                    {/* PLATAFORMA Y PERFIL BADGES */}
                    <div className="d-flex align-items-center justify-content-between p-3 bg-white rounded-3 shadow-sm mb-3 border">
                      <div>
                        <span className="badge text-white px-2 py-1 mb-1" style={{ backgroundColor: getBrandColor(formRenovar.servicio) }}>
                          {formRenovar.servicio}
                        </span>
                        <div className="fw-bold text-dark">{formRenovar.perfil || 'Perfil'}</div>
                      </div>
                      {formRenovar.pin && (
                        <div className="text-end">
                          <span className="small text-muted d-block">PIN de Acceso</span>
                          <span className="badge bg-secondary text-white">{formRenovar.pin}</span>
                        </div>
                      )}
                    </div>

                    {/* NOMBRE CLIENTE */}
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-muted">Nombre del Cliente</label>
                      <div className="input-group shadow-sm">
                        <span className="input-group-text bg-white"><i className="bi bi-person text-muted"></i></span>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={formRenovar.nombre_cliente} 
                          onChange={e => setFormRenovar({...formRenovar, nombre_cliente: e.target.value})}
                          required
                          placeholder="Nombre del cliente"
                        />
                      </div>
                    </div>

                    {/* MONTO Y FECHA */}
                    <div className="row g-3">
                      <div className="col-6">
                        <label className="form-label small fw-bold text-muted">Monto Renovación (S/)</label>
                        <div className="input-group shadow-sm">
                          <span className="input-group-text bg-white fw-bold text-success">S/</span>
                          <input 
                            type="number" 
                            step="0.5" 
                            min="0"
                            onWheel={handleWheel}
                            className="form-control fw-bold text-success" 
                            value={formRenovar.monto} 
                            onChange={e => setFormRenovar({...formRenovar, monto: e.target.value})}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-6">
                        <label className="form-label small fw-bold text-muted">Nueva Fecha Vencimiento</label>
                        <input 
                          type="date" 
                          className="form-control shadow-sm fw-bold border-success" 
                          value={formRenovar.fecha_finalizacion} 
                          onChange={e => setFormRenovar({...formRenovar, fecha_finalizacion: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="mt-3 p-2 bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3 text-success small d-flex align-items-center gap-2">
                      <i className="bi bi-check-circle-fill fs-5"></i>
                      <span>Se sumarán <strong>S/ {Number(formRenovar.monto || 0).toFixed(2)}</strong> a la Liquidez Total y Reportes de TiDB.</span>
                    </div>

                  </div>

                  {/* PIE MODAL */}
                  <div className="modal-footer bg-white border-top-0 d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-light rounded-pill px-4 fw-bold" onClick={() => setPerfilRenovar(null)} disabled={cargandoRenovacion}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-success rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2" disabled={cargandoRenovacion}>
                      {cargandoRenovacion ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          <span>Renovando...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-arrow-repeat"></i>
                          <span>Confirmar Renovación</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

              </div>
            </div>
          </div>
        )}

        {/* 📦 MODAL DE RENOVACIÓN DE STOCK (CUENTA PROVEEDORA) */}
        {stockRenovar && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1070 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                
                {/* CABECERA MODAL */}
                <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' }}>
                  <div className="d-flex align-items-center gap-2">
                    <div className="p-2 bg-white bg-opacity-20 rounded-circle text-white d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                      <i className="bi bi-box-seam-fill fs-4"></i>
                    </div>
                    <div>
                      <h5 className="modal-title fw-bold mb-0 text-white">Renovar Cuenta de Stock</h5>
                      <small className="text-white opacity-85">Extender vigencia y registrar egreso en finanzas</small>
                    </div>
                  </div>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setStockRenovar(null)}></button>
                </div>

                <form onSubmit={handleConfirmarRenovacionStock}>
                  <div className="modal-body p-4 bg-light">
                    
                    {/* PLATAFORMA Y CORREO CARD */}
                    <div className="d-flex align-items-center justify-content-between p-3 bg-white rounded-3 shadow-sm mb-3 border">
                      <div>
                        <span className="badge text-white px-2 py-1 mb-1" style={{ backgroundColor: getBrandColor(formRenovarStock.servicio) }}>
                          {formRenovarStock.servicio}
                        </span>
                        <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '240px' }} title={formRenovarStock.correo}>
                          <i className="bi bi-envelope-fill me-1 text-muted"></i>{formRenovarStock.correo}
                        </div>
                      </div>
                      {formRenovarStock.contrasena && (
                        <div className="text-end">
                          <span className="small text-muted d-block">Contraseña</span>
                          <span className="badge bg-secondary text-white">{formRenovarStock.contrasena}</span>
                        </div>
                      )}
                    </div>

                    {/* FECHAS */}
                    <div className="row g-3 mb-3">
                      <div className="col-6">
                        <label className="form-label small fw-bold text-muted">Fecha de Inicio / Pago</label>
                        <input 
                          type="date" 
                          className="form-control shadow-sm fw-bold border-success" 
                          value={formRenovarStock.fechaInicio} 
                          onChange={handleFechaInicioRenovarStockChange}
                          required
                        />
                      </div>

                      <div className="col-6">
                        <label className="form-label small fw-bold text-muted">Nueva Fecha Vencimiento</label>
                        <input 
                          type="date" 
                          className="form-control shadow-sm fw-bold border-warning" 
                          value={formRenovarStock.nuevaFechaVence} 
                          onChange={e => setFormRenovarStock({...formRenovarStock, nuevaFechaVence: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    {/* MONTO / COSTO */}
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-muted">Monto de Renovación (S/)</label>
                      <div className="input-group shadow-sm">
                        <span className="input-group-text bg-white fw-bold text-warning">S/</span>
                        <input 
                          type="number" 
                          step="0.5" 
                          min="0"
                          onWheel={handleWheel}
                          className="form-control fw-bold text-dark fs-5" 
                          value={formRenovarStock.monto} 
                          onChange={e => setFormRenovarStock({...formRenovarStock, monto: e.target.value})}
                          required
                          placeholder="Ej: 30.00"
                        />
                      </div>
                      <small className="text-muted" style={{ fontSize: '0.75rem' }}>Indica la tarifa real pagada al proveedor por esta renovación.</small>
                    </div>

                    {/* CHECKBOX GUARDAR NUEVO COSTO BASE */}
                    <div className="form-check form-switch p-3 bg-white border rounded-3 shadow-sm d-flex align-items-center justify-content-between mb-2 ms-0">
                      <label className="form-check-label small fw-bold text-dark cursor-pointer mb-0" htmlFor="switchCostoBase">
                        <i className="bi bi-save me-1 text-primary"></i>
                        Actualizar también costo base en inventario
                      </label>
                      <input 
                        className="form-check-input ms-2" 
                        type="checkbox" 
                        role="switch" 
                        id="switchCostoBase"
                        checked={formRenovarStock.actualizarCostoBase}
                        onChange={e => setFormRenovarStock({...formRenovarStock, actualizarCostoBase: e.target.checked})}
                        style={{ width: '2.5em', height: '1.25em', cursor: 'pointer' }}
                      />
                    </div>

                    <div className="p-2 bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded-3 text-dark small d-flex align-items-center gap-2">
                      <i className="bi bi-info-circle-fill text-warning fs-5"></i>
                      <span>Se registrará un egreso de <strong>S/ {Number(formRenovarStock.monto || 0).toFixed(2)}</strong> en el sistema de Gastos / Transacciones.</span>
                    </div>

                  </div>

                  {/* PIE MODAL */}
                  <div className="modal-footer bg-white border-top-0 d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-light rounded-pill px-4 fw-bold" onClick={() => setStockRenovar(null)} disabled={cargandoRenovacionStock}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn text-white rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2" style={{ backgroundColor: '#d97706', border: 'none' }} disabled={cargandoRenovacionStock}>
                      {cargandoRenovacionStock ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle-fill"></i>
                          <span>Confirmar y Registrar Pago</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

              </div>
            </div>
          </div>
        )}

        {/* 🔔 TOAST DE NOTIFICACIONES VISUALES SUAVES */}
        {toast.mostrar && (
          <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 2000 }}>
            <div className={`toast show align-items-center text-white bg-${toast.tipo} border-0 shadow-lg`} role="alert" aria-live="assertive" aria-atomic="true">
              <div className="d-flex">
                <div className="toast-body fw-bold">
                  {toast.mensaje}
                </div>
                <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => setToast({ mostrar: false, mensaje: '', tipo: 'success' })}></button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default VistaStreaming;
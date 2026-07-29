import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';

function VistaReportes({ api }) {
  const [transacciones, setTransacciones] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroMes, setFiltroMes] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // --- CARGAR DATOS FINANCIEROS ---
  const cargarReportes = useCallback(() => {
    setCargando(true);
    const ts = Date.now();

    Promise.all([
      axios.get(`${api}/reportes/transacciones?t=${ts}`).catch(err => {
        console.error("Error al cargar transacciones:", err);
        return { data: [] };
      }),
      axios.get(`${api}/inventario?t=${ts}`).catch(err => {
        console.error("Error al cargar inventario:", err);
        return { data: [] };
      })
    ]).then(([resTx, resInv]) => {
      const txData = Array.isArray(resTx.data) ? resTx.data : (resTx.data?.data || []);
      const invData = Array.isArray(resInv.data) ? resInv.data : (resInv.data?.data || []);
      setTransacciones(txData);
      setInventario(invData);
    }).finally(() => {
      setCargando(false);
    });
  }, [api]);

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);

  // --- LISTA DE MESES DISPONIBLES EN TRANSACCIONES ---
  const opcionesMeses = useMemo(() => {
    const mesesSet = new Set();
    transacciones.forEach(tx => {
      if (tx.date) {
        mesesSet.add(dayjs(tx.date).format('YYYY-MM'));
      }
    });
    return Array.from(mesesSet).sort().reverse();
  }, [transacciones]);

  // --- FILTRADO DE TRANSACCIONES POR MES Y BÚSQUEDA ---
  const transaccionesFiltradas = useMemo(() => {
    return transacciones.filter(tx => {
      // Filtro por Mes/Periodo
      if (filtroMes !== 'TODOS') {
        const fechaTx = dayjs(tx.date).format('YYYY-MM');
        if (fechaTx !== filtroMes) return false;
      }
      // Filtro por Búsqueda de texto
      if (busqueda.trim() !== '') {
        const term = busqueda.toLowerCase();
        const cliente = (tx.client_name || '').toLowerCase();
        const plat = (tx.platform || '').toLowerCase();
        const tipo = (tx.type || '').toLowerCase();
        const desc = (tx.description || '').toLowerCase();
        return cliente.includes(term) || plat.includes(term) || tipo.includes(term) || desc.includes(term);
      }
      return true;
    });
  }, [transacciones, filtroMes, busqueda]);

  // --- CÁLCULOS KPI PRINCIPALES ---
  const liquidezTotal = useMemo(() => {
    return transaccionesFiltradas.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  }, [transaccionesFiltradas]);

  const inversionStock = useMemo(() => {
    return inventario.reduce((acc, inv) => acc + Number(inv.costo || 0), 0);
  }, [inventario]);

  const gananciaNetaReal = useMemo(() => {
    return liquidezTotal - inversionStock;
  }, [liquidezTotal, inversionStock]);

  const totalVentasCount = transaccionesFiltradas.length;

  // --- DESGLOSE DE LIQUIDEZ POR PLATAFORMA ---
  const desglosePlataformas = useMemo(() => {
    const resumen = {};
    transaccionesFiltradas.forEach(tx => {
      const plat = tx.platform || 'Otros';
      if (!resumen[plat]) {
        resumen[plat] = { total: 0, cantidad: 0 };
      }
      resumen[plat].total += Number(tx.amount || 0);
      resumen[plat].cantidad += 1;
    });

    return Object.entries(resumen)
      .map(([plataforma, datos]) => ({
        plataforma,
        monto: datos.total,
        cantidad: datos.cantidad,
        porcentaje: liquidezTotal > 0 ? ((datos.total / liquidezTotal) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.monto - a.monto);
  }, [transaccionesFiltradas, liquidezTotal]);

  // --- COLORES BRAND PARA PLATAFORMAS ---
  const getBrandColor = (plat) => {
    const s = (plat || '').toLowerCase();
    if (s.includes('netflix')) return { bg: '#E50914', text: '#ffffff' };
    if (s.includes('disney')) return { bg: '#113CCF', text: '#ffffff' };
    if (s.includes('hbo max') || s.includes('hbo')) return { bg: '#991EEB', text: '#ffffff' };
    if (s.includes('prime video')) return { bg: '#00A8E1', text: '#ffffff' };
    if (s.includes('spotify')) return { bg: '#1DB954', text: '#ffffff' };
    if (s.includes('crunchyroll')) return { bg: '#F47521', text: '#ffffff' };
    if (s.includes('vix')) return { bg: '#FF5A00', text: '#ffffff' };
    if (s.includes('paramount')) return { bg: '#0064FF', text: '#ffffff' };
    return { bg: '#4A5568', text: '#ffffff' };
  };

  return (
    <div className="container-fluid px-0">
      
      {/* 🚀 CABECERA Y FILTRO DE PERIODO */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3 bg-white p-3 rounded-3 shadow-sm border">
        <div>
          <h4 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
            <i className="bi bi-pie-chart-fill text-success"></i>
            Reportes Financieros e Historial de Liquidez
          </h4>
          <p className="text-muted small mb-0">
            Control ejecutivo de ingresos brutos, costos de inventario, ganancia neta e historial de ventas en TiDB.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <label className="fw-bold small text-muted mb-0 me-1">
            <i className="bi bi-calendar-event me-1"></i>Periodo:
          </label>
          <select 
            className="form-select form-select-sm fw-bold border-success shadow-sm"
            style={{ width: '180px', borderRadius: '20px' }}
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
          >
            <option value="TODOS">📅 Todos los Meses</option>
            {opcionesMeses.map(m => (
              <option key={m} value={m}>
                {dayjs(m).format('MMMM YYYY').toUpperCase()}
              </option>
            ))}
          </select>

          <button 
            onClick={cargarReportes}
            className="btn btn-sm btn-outline-secondary rounded-circle p-2 d-flex align-items-center justify-content-center"
            title="Recargar datos de TiDB"
            style={{ width: '34px', height: '34px' }}
          >
            <i className={`bi bi-arrow-clockwise ${cargando ? 'spin' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* 💳 TARJETAS KPI PRINCIPALES */}
      <div className="row g-3 mb-4">

        {/* 1. LIQUIDEZ TOTAL */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-3 overflow-hidden text-white" style={{ background: 'linear-gradient(135deg, #00C853 0%, #009624 100%)' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <span className="small text-uppercase fw-bold opacity-75">Liquidez Total (Bruto)</span>
                  <h3 className="fw-bold my-1">S/ {liquidezTotal.toFixed(2)}</h3>
                  <small className="opacity-75" style={{ fontSize: '0.78rem' }}>
                    <i className="bi bi-arrow-up-circle-fill me-1"></i>Suma de ventas en periodo
                  </small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-circle p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-wallet2 fs-2 text-white"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. INVERSIÓN EN STOCK */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-3 overflow-hidden text-white" style={{ background: 'linear-gradient(135deg, #2A3B5C 0%, #1E293B 100%)' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <span className="small text-uppercase fw-bold opacity-75">Inversión en Stock</span>
                  <h3 className="fw-bold my-1">S/ {inversionStock.toFixed(2)}</h3>
                  <small className="opacity-75" style={{ fontSize: '0.78rem' }}>
                    <i className="bi bi-box-seam me-1"></i>Costo de cuentas proveedoras
                  </small>
                </div>
                <div className="bg-white bg-opacity-10 rounded-circle p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-cart-check fs-2 text-white"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. GANANCIA NETA REAL */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-3 overflow-hidden text-white" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <span className="small text-uppercase fw-bold opacity-75">Ganancia Neta Real</span>
                  <h3 className="fw-bold my-1">S/ {gananciaNetaReal.toFixed(2)}</h3>
                  <small className="opacity-75" style={{ fontSize: '0.78rem' }}>
                    <i className="bi bi-graph-up-arrow me-1"></i>Bruto menos costo stock
                  </small>
                </div>
                <div className="bg-white bg-opacity-20 rounded-circle p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-cash-stack fs-2 text-white"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. TOTAL TRANSACCIONES */}
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white text-dark border">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <span className="small text-uppercase fw-bold text-muted">Total de Ventas</span>
                  <h3 className="fw-bold my-1 text-dark">{totalVentasCount}</h3>
                  <small className="text-muted" style={{ fontSize: '0.78rem' }}>
                    <i className="bi bi-receipt me-1"></i>Operaciones registradas
                  </small>
                </div>
                <div className="bg-light rounded-circle p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-check-circle-fill fs-2 text-success"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 📊 SECCIÓN DE DESGLOSE POR PLATAFORMA Y RESUMEN */}
      <div className="row g-3 mb-4">
        
        {/* DESGLOSE POR PLATAFORMA (TABLA Y BARRAS) */}
        <div className="col-md-7">
          <div className="card border-0 shadow-sm rounded-3 bg-white p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="bi bi-grid-fill me-2 text-primary"></i>
                Desglose de Liquidez por Plataforma
              </h6>
              <span className="badge bg-light text-dark border">
                {desglosePlataformas.length} Plataformas
              </span>
            </div>

            {desglosePlataformas.length === 0 ? (
              <div className="text-center py-4 text-muted small">
                No hay transacciones registradas para este periodo.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light small text-uppercase">
                    <tr>
                      <th>Plataforma</th>
                      <th className="text-center">Ventas</th>
                      <th>Porcentaje</th>
                      <th className="text-end">Monto Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {desglosePlataformas.map(item => {
                      const brand = getBrandColor(item.plataforma);
                      return (
                        <tr key={item.plataforma}>
                          <td>
                            <span 
                              className="badge rounded-pill px-3 py-1 fw-bold shadow-sm"
                              style={{ backgroundColor: brand.bg, color: brand.text }}
                            >
                              {item.plataforma}
                            </span>
                          </td>
                          <td className="text-center fw-bold text-dark">
                            {item.cantidad}
                          </td>
                          <td style={{ width: '35%' }}>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: '8px', backgroundColor: '#e9ecef' }}>
                                <div 
                                  className="progress-bar rounded-pill" 
                                  role="progressbar" 
                                  style={{ width: `${item.porcentaje}%`, backgroundColor: brand.bg }}
                                ></div>
                              </div>
                              <span className="small fw-semibold text-muted" style={{ fontSize: '0.75rem', width: '40px' }}>
                                {item.porcentaje}%
                              </span>
                            </div>
                          </td>
                          <td className="text-end fw-bold text-success">
                            S/ {item.monto.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* TARJETA INFORMATIVA / AUDIT SUMMARY */}
        <div className="col-md-5">
          <div className="card border-0 shadow-sm rounded-3 bg-white p-3 h-100">
            <h6 className="fw-bold mb-3 text-dark">
              <i className="bi bi-shield-check me-2 text-success"></i>
              Resumen de Operatividad Financiera
            </h6>
            
            <div className="p-3 bg-light rounded-3 mb-3 border">
              <div className="d-flex justify-content-between mb-2">
                <span className="small text-muted">Ingreso Medio por Venta:</span>
                <span className="fw-bold text-dark">
                  S/ {totalVentasCount > 0 ? (liquidezTotal / totalVentasCount).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="small text-muted">Margen de Ganancia Estimado:</span>
                <span className={`fw-bold ${gananciaNetaReal >= 0 ? 'text-success' : 'text-danger'}`}>
                  {liquidezTotal > 0 ? ((gananciaNetaReal / liquidezTotal) * 100).toFixed(1) : '0'}%
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="small text-muted">Base de Datos Conectada:</span>
                <span className="badge bg-success text-white">TiDB Cloud Serverless</span>
              </div>
            </div>

            <div className="alert alert-info border-0 rounded-3 mb-0 small">
              <i className="bi bi-info-circle-fill me-2"></i>
              Cada nuevo registro de cliente o renovación realizada desde el panel de Streaming graba automáticamente un ticket de transacción en TiDB Cloud (`transactions`).
            </div>
          </div>
        </div>

      </div>

      {/* 📑 HISTORIAL DE VENTAS (AUDITORÍA DE TRANSACCIONES) */}
      <div className="card border-0 shadow-sm rounded-3 bg-white p-3">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <h6 className="fw-bold mb-0 text-dark">
              <i className="bi bi-journal-text me-2 text-dark"></i>
              Historial de Ventas y Auditoría Reciente (`transactions`)
            </h6>
            <small className="text-muted">Registro completo de operaciones grabadas en la base de datos.</small>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div className="input-group input-group-sm" style={{ width: '250px' }}>
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input 
                type="text"
                className="form-control border-start-0 bg-light"
                placeholder="Buscar cliente, plataforma..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button className="btn btn-outline-secondary border-start-0" onClick={() => setBusqueda('')}>
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {transaccionesFiltradas.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-inbox text-muted opacity-50" style={{ fontSize: '3rem' }}></i>
            <h6 className="fw-bold text-secondary mt-2">No hay transacciones que coincidan</h6>
            <p className="text-muted small mb-0">Revisa los filtros de búsqueda o cambia el mes seleccionado.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Cliente</th>
                  <th>Plataforma</th>
                  <th>Monto</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {transaccionesFiltradas.map(tx => {
                  const fechaFormateada = tx.date ? dayjs(tx.date).format('DD/MM/YYYY HH:mm') : 'Sin fecha';
                  const brand = getBrandColor(tx.platform);
                  const isVenta = (tx.type || '').toUpperCase() === 'VENTA';

                  return (
                    <tr key={tx.id}>
                      <td className="small fw-semibold text-muted">
                        <i className="bi bi-clock me-1"></i>{fechaFormateada}
                      </td>
                      <td className="fw-bold text-dark">
                        {tx.client_name || 'Cliente'}
                      </td>
                      <td>
                        <span 
                          className="badge rounded-pill px-3 py-1 shadow-sm"
                          style={{ backgroundColor: brand.bg, color: brand.text }}
                        >
                          {tx.platform || 'Streaming'}
                        </span>
                      </td>
                      <td className="fw-bold text-success">
                        S/ {Number(tx.amount || 0).toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge rounded-pill ${isVenta ? 'bg-success' : 'bg-primary'}`}>
                          {tx.type || 'VENTA'}
                        </span>
                      </td>
                      <td className="small text-muted">
                        {tx.description || 'Operación registrada'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
          <span className="small text-muted">
            Transacciones mostradas: <strong>{transaccionesFiltradas.length}</strong> de <strong>{transacciones.length}</strong>
          </span>
        </div>
      </div>

    </div>
  );
}

export default VistaReportes;

// frontend/src/api.js

const isLocal = typeof window !== "undefined" && (window.location.hostname.includes("localhost") || window.location.hostname.includes("192.168"));

// Si estamos en local, usa tu PC. Si estamos en la nube, usa Render.
const API_URL = isLocal 
    ? "http://localhost:8081" 
    : "https://leotech-streaming.onrender.com"; 

/**
 * Cabeceras para desactivar el caché agresivo en peticiones HTTP/fetch/axios
 */
export const NO_CACHE_HEADERS = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
};

/**
 * Normaliza defensivamente el valor de `eliminado` a 1 o 0
 * para compatibilidad entre valores booleanos y numéricos de TiDB
 */
export const normalizeEliminado = (item) => {
    if (!item) return item;
    if (Array.isArray(item)) {
        return item.map(normalizeEliminado);
    }
    const esEliminado = item.eliminado === 1 || item.eliminado === true || item.eliminado === '1' || item.eliminado === 'true' || Number(item.eliminado) === 1;
    return {
        ...item,
        eliminado: esEliminado ? 1 : 0
    };
};

export default API_URL;
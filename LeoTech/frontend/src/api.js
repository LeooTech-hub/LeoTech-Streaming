// frontend/src/api.js

const isLocal = window.location.hostname.includes("localhost") || window.location.hostname.includes("192.168");

// Si estamos en local, usa tu PC. Si estamos en la nube, usa Render.
const API_URL = isLocal 
    ? "http://localhost:8081" 
    : "https://leotech-streaming.onrender.com"; 

export default API_URL;
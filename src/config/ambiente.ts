// Leitura centralizada das variáveis VITE_* (as únicas que o Vite expõe ao navegador).
export const modoDemo = import.meta.env.VITE_MODO_DEMO === 'true'

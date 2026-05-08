// app/utils/fechas.js

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD usando hora local de Colombia
 * SIN conversión UTC ni timezone del navegador
 */
export const getFechaHoyLocal = () => {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const day = String(hoy.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convierte cualquier fecha (Date object o string) a formato YYYY-MM-DD local
 * @param {Date|string} fechaInput - Fecha a convertir
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const formatearFechaLocal = (fechaInput) => {
  let fecha;
  
  if (typeof fechaInput === 'string') {
    // Si es string, asumimos que viene en formato YYYY-MM-DD
    const [year, month, day] = fechaInput.split('-');
    return `${year}-${month}-${day}`;
  }
  
  fecha = fechaInput;
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Compara si dos fechas son iguales (solo año, mes, día)
 */
export const mismaFechaLocal = (fecha1, fecha2) => {
  return formatearFechaLocal(fecha1) === formatearFechaLocal(fecha2);
};
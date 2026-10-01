// app/utils/fechas.js

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD anclada a la hora oficial de Colombia (America/Bogota).
 * Inmune al huso horario UTC del servidor de Cloud Run y al reloj del dispositivo cliente.
 */
export const getFechaHoyLocal = () => {
  const opciones = {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };

  const partes = new Intl.DateTimeFormat('es-CO', opciones).formatToParts(new Date());
  const year = partes.find(p => p.type === 'year')?.value;
  const month = partes.find(p => p.type === 'month')?.value;
  const day = partes.find(p => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
};

/**
 * Convierte cualquier fecha a formato técnico YYYY-MM-DD local de Colombia.
 * Utilizado para <input type="date">, parámetros de URL y consultas a la base de datos.
 * @param {Date|string|null|undefined} fechaInput - Fecha a convertir
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const formatearFechaLocal = (fechaInput) => {
  if (!fechaInput) return "";

  if (typeof fechaInput === 'string') {
    const soloFecha = fechaInput.split('T')[0].split(' ')[0].trim();
    if (soloFecha.includes('-')) {
      const partes = soloFecha.split('-');
      if (partes.length === 3) {
        const [year, month, day] = partes;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    return soloFecha;
  }

  if (fechaInput instanceof Date && !isNaN(fechaInput.getTime())) {
    const opciones = {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    const partes = new Intl.DateTimeFormat('es-CO', opciones).formatToParts(fechaInput);
    const year = partes.find(p => p.type === 'year')?.value;
    const month = partes.find(p => p.type === 'month')?.value;
    const day = partes.find(p => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  }

  return "";
};

/**
 * Convierte cualquier fecha a formato visual colombiano DD/MM/AAAA.
 * Utilizado para mostrar en pantalla al odontólogo: tablas, fichas de pacientes y recibos.
 * @param {Date|string|null|undefined} fechaInput - Fecha a convertir
 * @returns {string} Fecha en formato DD/MM/AAAA o cadena vacía si es inválida
 */
export const formatearFechaVisual = (fechaInput) => {
  if (!fechaInput) return "";

  // 1. Si ya viene con separador '/' (ej: "28/09/2026")
  if (typeof fechaInput === 'string' && fechaInput.includes('/') && !fechaInput.includes('-')) {
    const partes = fechaInput.split('/');
    if (partes.length === 3) {
      const [dia, mes, anio] = partes;
      return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`;
    }
    return fechaInput;
  }

  // 2. Extraer primero el formato YYYY-MM-DD limpio de Colombia
  const fechaTecnica = formatearFechaLocal(fechaInput);
  if (!fechaTecnica || !fechaTecnica.includes('-')) return "";

  const [year, month, day] = fechaTecnica.split('-');
  return `${day}/${month}/${year}`;
};
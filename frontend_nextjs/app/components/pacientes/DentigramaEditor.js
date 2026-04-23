'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import './dentigrama.css';

// Configuración de dientes (igual que Flask)
const dientesAdultosSup = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const dientesNinosSup = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const dientesNinosInf = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const dientesAdultosInf = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const SVG_NS = "http://www.w3.org/2000/svg";

const DentigramaEditor = forwardRef(({ fondoUrl, onExportar }, ref) => {
  const svgRef = useRef(null);
  const [herramienta, setHerramienta] = useState('caries');
  const herramientaRef = useRef(herramienta);
  const [tieneFondo, setTieneFondo] = useState(false);

  // Detectar si hay fondo
  useEffect(() => {
    const hayFondo = fondoUrl && fondoUrl !== '' && fondoUrl !== 'null' && fondoUrl !== 'undefined';
    setTieneFondo(hayFondo);
    
    if (svgRef.current && hayFondo) {
      const timestamp = new Date().getTime();
      const cacheBusterUrl = fondoUrl + (fondoUrl.indexOf('?') > -1 ? '&' : '?') + 't=' + timestamp;
      svgRef.current.style.backgroundImage = `url('${cacheBusterUrl}')`;
      svgRef.current.style.backgroundSize = 'contain';
      svgRef.current.style.backgroundPosition = 'center';
      svgRef.current.style.backgroundRepeat = 'no-repeat';
    } else if (svgRef.current) {
      svgRef.current.style.backgroundImage = 'none';
    }
  }, [fondoUrl]);

  // Mantener referencia actualizada
  useEffect(() => {
    herramientaRef.current = herramienta;
  }, [herramienta]);

  // Función para exportar a PNG
  const exportarAPNG = async () => {
    if (!svgRef.current) return null;
    
    return new Promise((resolve, reject) => {
      try {
        const width = 860;
        const height = 480;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // 1. Fondo blanco base
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // 2. Función para dibujar el SVG sobre el canvas
        const dibujarSVG = async (imagenFondo = null) => {
          // Clonar el SVG
          const svgClone = svgRef.current.cloneNode(true);
          
          // Aplicar colores a las zonas pintadas
          svgClone.querySelectorAll('.zona').forEach(zona => {
            if (zona.classList.contains('pintado-caries')) {
              zona.style.fill = '#dc3545';
              zona.style.fillOpacity = '1';
            } else if (zona.classList.contains('pintado-amalgama')) {
              zona.style.fill = '#0d6efd';
              zona.style.fillOpacity = '1';
            } else if (zona.classList.contains('pintado-resina')) {
              zona.style.fill = '#198754';
              zona.style.fillOpacity = '1';
            } else {
              // ✅ Cambio clave: Si hay fondo, usar transparente; si no, blanco
              zona.style.fill = tieneFondo ? 'transparent' : '#ffffff';
            }
            zona.style.stroke = '#000000';
            zona.style.strokeWidth = '0.5';
          });
          
          // Asegurar capas estructurales visibles
          svgClone.querySelectorAll('.layer-extraccion, .layer-ausente, .layer-endo, .layer-protesis, .layer-corona, .layer-check').forEach(layer => {
            if (layer.getAttribute('display') === 'block') {
              layer.style.display = 'block';
            }
          });
          
          // Convertir a string
          const serializer = new XMLSerializer();
          let svgString = serializer.serializeToString(svgClone);
          if (!svgString.includes('width=')) {
            svgString = svgString.replace('<svg', `<svg width="${width}" height="${height}"`);
          }
          
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          const svgImg = new Image();
          
          svgImg.onload = () => {
            // Si hay imagen de fondo, ya está dibujada antes
            ctx.drawImage(svgImg, 0, 0, width, height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
          };
          
          svgImg.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(new Error('Error al procesar el SVG'));
          };
          
          svgImg.src = url;
        };
        
        // 3. Verificar si hay fondo de Cloudinary
        if (tieneFondo && fondoUrl) {
          const timestamp = new Date().getTime();
          const cacheBusterUrl = fondoUrl + (fondoUrl.indexOf('?') > -1 ? '&' : '?') + 't=' + timestamp;
          const fondoImg = new Image();
          fondoImg.crossOrigin = "Anonymous"; // Importante para CORS
          
          fondoImg.onload = () => {
            // Dibujar la imagen de fondo primero
            ctx.drawImage(fondoImg, 0, 0, width, height);
            // Luego dibujar el SVG encima
            dibujarSVG();
          };
          
          fondoImg.onerror = () => {
            // Si falla el fondo, continuar sin él
            console.warn('No se pudo cargar la imagen de fondo');
            dibujarSVG();
          };
          
          fondoImg.src = cacheBusterUrl;
        } else {
          // Sin fondo, dibujar solo SVG
          dibujarSVG();
        }
        
      } catch (error) {
        console.error('Error exportando PNG:', error);
        reject(error);
      }
    });
  };

  // Exponer función al padre
  useImperativeHandle(ref, () => ({
    exportar: exportarAPNG
  }));

  // Función para crear un diente
  const crearDienteSVG = (numero, x, y) => {
    const grupo = document.createElementNS(SVG_NS, "g");
    grupo.setAttribute("class", "diente-group");
    grupo.setAttribute("transform", `translate(${x}, ${y})`);
    grupo.setAttribute("data-diente", numero);
    
    // Número del diente
    const texto = document.createElementNS(SVG_NS, "text");
    texto.setAttribute("x", "25");
    texto.setAttribute("y", "-8");
    texto.setAttribute("class", "diente-numero");
    texto.textContent = numero;
    if (tieneFondo) {
      texto.setAttribute("opacity", "0.5");
    }
    grupo.appendChild(texto);
    
    // Grupo de zonas
    const zonasGroup = document.createElementNS(SVG_NS, "g");
    zonasGroup.setAttribute("class", "diente-zonas");
    
    // Crear las 5 zonas
    const crearZona = (d, cara) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      path.setAttribute("class", "zona");
      path.setAttribute("data-cara", cara);
      // ✅ Cambio: Si hay fondo, usar transparente, si no, blanco
      path.style.fill = tieneFondo ? 'transparent' : '#ffffff';
      path.setAttribute("stroke", "#999999");
      path.setAttribute("stroke-width", "0.5");
      return path;
    };
    
    const pathVestibular = "M10.8,10.8 L19.3,19.3 A8,8 0 0,1 30.7,19.3 L39.2,10.8 A20,20 0 0,0 10.8,10.8 Z";
    const pathDerecha = "M39.2,10.8 L30.7,19.3 A8,8 0 0,1 30.7,30.7 L39.2,39.2 A20,20 0 0,0 39.2,10.8 Z";
    const pathLingual = "M39.2,39.2 L30.7,30.7 A8,8 0 0,1 19.3,30.7 L10.8,39.2 A20,20 0 0,0 39.2,39.2 Z";
    const pathIzquierda = "M10.8,39.2 L19.3,30.7 A8,8 0 0,1 19.3,19.3 L10.8,10.8 A20,20 0 0,0 10.8,39.2 Z";
    
    zonasGroup.appendChild(crearZona(pathVestibular, "vestibular"));
    zonasGroup.appendChild(crearZona(pathDerecha, "derecha"));
    zonasGroup.appendChild(crearZona(pathLingual, "lingual"));
    zonasGroup.appendChild(crearZona(pathIzquierda, "izquierda"));
    
    const centro = document.createElementNS(SVG_NS, "circle");
    centro.setAttribute("cx", "25");
    centro.setAttribute("cy", "25");
    centro.setAttribute("r", "8");
    centro.setAttribute("class", "zona");
    centro.setAttribute("data-cara", "oclusal");
    // ✅ Cambio: Si hay fondo, usar transparente, si no, blanco
    centro.style.fill = tieneFondo ? 'transparent' : '#ffffff';
    centro.setAttribute("stroke", "#999999");
    centro.setAttribute("stroke-width", "0.5");
    zonasGroup.appendChild(centro);
    
    grupo.appendChild(zonasGroup);
    
    // Capas estructurales
    const crearCapaX = (clase, color) => {
      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", `layer-structure ${clase}`);
      g.setAttribute("display", "none");
      const l1 = document.createElementNS(SVG_NS, "line");
      l1.setAttribute("x1", "5"); l1.setAttribute("y1", "5"); l1.setAttribute("x2", "45"); l1.setAttribute("y2", "45");
      l1.setAttribute("stroke", color); l1.setAttribute("stroke-width", "4");
      const l2 = document.createElementNS(SVG_NS, "line");
      l2.setAttribute("x1", "45"); l2.setAttribute("y1", "5"); l2.setAttribute("x2", "5"); l2.setAttribute("y2", "45");
      l2.setAttribute("stroke", color); l2.setAttribute("stroke-width", "4");
      g.appendChild(l1); g.appendChild(l2);
      return g;
    };
    
    grupo.appendChild(crearCapaX("layer-extraccion", "#dc3545"));
    grupo.appendChild(crearCapaX("layer-ausente", "#0d6efd"));
    
    // Endodoncia
    const endo = document.createElementNS(SVG_NS, "text");
    endo.setAttribute("class", "layer-structure layer-endo");
    endo.setAttribute("x", "25"); endo.setAttribute("y", "-20");
    endo.setAttribute("text-anchor", "middle");
    endo.setAttribute("fill", "#d63384");
    endo.setAttribute("font-size", "10");
    endo.setAttribute("font-weight", "bold");
    endo.textContent = "ENDO";
    endo.setAttribute("display", "none");
    grupo.appendChild(endo);
    
    // Prótesis
    const protesis = document.createElementNS(SVG_NS, "g");
    protesis.setAttribute("class", "layer-structure layer-protesis");
    protesis.setAttribute("display", "none");
    const p1 = document.createElementNS(SVG_NS, "line");
    p1.setAttribute("x1", "0"); p1.setAttribute("y1", "15"); p1.setAttribute("x2", "50"); p1.setAttribute("y2", "15");
    p1.setAttribute("stroke", "#0d6efd"); p1.setAttribute("stroke-width", "3");
    const p2 = document.createElementNS(SVG_NS, "line");
    p2.setAttribute("x1", "0"); p2.setAttribute("y1", "35"); p2.setAttribute("x2", "50"); p2.setAttribute("y2", "35");
    p2.setAttribute("stroke", "#0d6efd"); p2.setAttribute("stroke-width", "3");
    protesis.appendChild(p1); protesis.appendChild(p2);
    grupo.appendChild(protesis);
    
    // Corona
    const corona = document.createElementNS(SVG_NS, "circle");
    corona.setAttribute("class", "layer-structure layer-corona");
    corona.setAttribute("cx", "25"); corona.setAttribute("cy", "25"); corona.setAttribute("r", "23");
    corona.setAttribute("fill", "none"); corona.setAttribute("stroke", "#0d6efd"); corona.setAttribute("stroke-width", "3");
    corona.setAttribute("display", "none");
    grupo.appendChild(corona);
    
    // Check
    const check = document.createElementNS(SVG_NS, "path");
    check.setAttribute("class", "layer-structure layer-check");
    check.setAttribute("d", "M8,25 L22,38 L44,12");
    check.setAttribute("fill", "none"); check.setAttribute("stroke", "#0acb41"); check.setAttribute("stroke-width", "7");
    check.setAttribute("stroke-linecap", "round"); check.setAttribute("stroke-linejoin", "round");
    check.setAttribute("display", "none");
    grupo.appendChild(check);
    
    // Evento click
    grupo.addEventListener('click', (e) => {
      e.stopPropagation();
      const herramientaActual = herramientaRef.current;
      
      // Herramientas globales
      const herramientasGlobales = ['extraccion', 'ausente', 'endodoncia', 'protesis', 'corona', 'check', 'borrador'];
      
      if (herramientasGlobales.includes(herramientaActual)) {
        if (herramientaActual === 'borrador') {
          // Limpiar diente completo
          grupo.querySelectorAll('.layer-structure').forEach(layer => {
            layer.setAttribute('display', 'none');
          });
          grupo.querySelectorAll('.zona').forEach(zona => {
            zona.classList.remove('pintado-caries', 'pintado-amalgama', 'pintado-resina');
            zona.style.fill = '#ffffff';
          });
          grupo.querySelector('.diente-zonas').setAttribute('opacity', '1');
        } else {
          // Aplicar estado estructural
          const mapaCapas = {
            'extraccion': '.layer-extraccion',
            'ausente': '.layer-ausente',
            'endodoncia': '.layer-endo',
            'protesis': '.layer-protesis',
            'corona': '.layer-corona',
            'check': '.layer-check'
          };
          const selector = mapaCapas[herramientaActual];
          if (selector) {
            const capa = grupo.querySelector(selector);
            if (capa) {
              const isVisible = capa.getAttribute('display') === 'block';
              capa.setAttribute('display', isVisible ? 'none' : 'block');
              
              if (herramientaActual === 'ausente') {
                grupo.querySelector('.diente-zonas').setAttribute('opacity', isVisible ? '1' : '0.2');
              }
            }
          }
        }
        return;
      }
      
      // Herramientas de pintado
      const targetEsZona = e.target.classList && e.target.classList.contains('zona');
      if (targetEsZona) {
        const zona = e.target;
        // Limpiar clases anteriores
        zona.classList.remove('pintado-caries', 'pintado-amalgama', 'pintado-resina');
        // Añadir nueva clase
        zona.classList.add(`pintado-${herramientaActual}`);
        // Aplicar color en línea directamente
        if (herramientaActual === 'caries') {
          zona.style.fill = '#dc3545';
        } else if (herramientaActual === 'amalgama') {
          zona.style.fill = '#0d6efd';
        } else if (herramientaActual === 'resina') {
          zona.style.fill = '#198754';
        }
      }
    });
    
    return grupo;
  };
  
  // Renderizar dentigrama
  const renderizarDentigrama = () => {
    const svg = svgRef.current;
    if (!svg) return;
    
    // Limpiar SVG
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
    
    const startX = 30;
    const gap = 48;
    
    // Adultos superiores
    dientesAdultosSup.forEach((num, i) => {
      let x = startX + (i * gap);
      if (i >= 8) x += 20;
      svg.appendChild(crearDienteSVG(num, x, 50));
    });
    
    // Niños superiores
    const offsetNinos = (gap * 3) + 20;
    dientesNinosSup.forEach((num, i) => {
      let x = startX + offsetNinos + (i * gap);
      if (i >= 5) x += 20;
      svg.appendChild(crearDienteSVG(num, x, 140));
    });
    
    // Niños inferiores
    dientesNinosInf.forEach((num, i) => {
      let x = startX + offsetNinos + (i * gap);
      if (i >= 5) x += 20;
      svg.appendChild(crearDienteSVG(num, x, 220));
    });
    
    // Adultos inferiores
    dientesAdultosInf.forEach((num, i) => {
      let x = startX + (i * gap);
      if (i >= 8) x += 20;
      svg.appendChild(crearDienteSVG(num, x, 310));
    });
    
    // Textos de referencia (solo si no hay fondo)
    if (!tieneFondo) {
      const addText = (x, y, text, anchor) => {
        const t = document.createElementNS(SVG_NS, "text");
        t.setAttribute("x", x); t.setAttribute("y", y);
        t.setAttribute("fill", "#aaa"); t.setAttribute("font-size", "12");
        t.setAttribute("text-anchor", anchor);
        t.textContent = text;
        svg.appendChild(t);
      };
      addText(40, 400, "DERECHA", "start");
      addText(820, 400, "IZQUIERDA", "end");
    }
  };
  
  // Renderizar al montar o cuando cambia tieneFondo
  useEffect(() => {
    renderizarDentigrama();
  }, [tieneFondo]);
  
  // Guardar manual
  const handleGuardar = async () => {
    if (onExportar) {
      try {
        // Pequeño retraso para asegurar estilos
        await new Promise(resolve => setTimeout(resolve, 100));
        const pngData = await exportarAPNG();
        if (pngData) {
          onExportar(pngData);
          alert('Dentigrama procesado correctamente');
        } else {
          alert('Error al procesar el dentigrama');
        }
      } catch (error) {
        console.error('Error al guardar:', error);
        alert('Error al procesar el dentigrama');
      }
    }
  };
  
  return (
    <div>
      {/* Barra de herramientas */}
      <div className="dentigrama-toolbar">
        <button type="button" className={`btn-tool btn-caries ${herramienta === 'caries' ? 'active' : ''}`} onClick={() => setHerramienta('caries')} title="Caries">C</button>
        <button type="button" className={`btn-tool btn-amalgama ${herramienta === 'amalgama' ? 'active' : ''}`} onClick={() => setHerramienta('amalgama')} title="Amalgama">A</button>
        <button type="button" className={`btn-tool btn-resina ${herramienta === 'resina' ? 'active' : ''}`} onClick={() => setHerramienta('resina')} title="Resina">R</button>
        
        <div className="toolbar-divider"></div>
        
        <button type="button" className={`btn-tool btn-protesis ${herramienta === 'protesis' ? 'active' : ''}`} onClick={() => setHerramienta('protesis')} title="Prótesis">
          <div className="icon-protesis-custom"><span></span><span></span></div>
        </button>
        <button type="button" className={`btn-tool btn-corona ${herramienta === 'corona' ? 'active' : ''}`} onClick={() => setHerramienta('corona')} title="Corona">
          <i className="far fa-circle" style={{ fontWeight: 900, fontSize: 20 }}></i>
        </button>
        <button type="button" className={`btn-tool btn-endo ${herramienta === 'endodoncia' ? 'active' : ''}`} onClick={() => setHerramienta('endodoncia')} title="Endodoncia">
          <i className="fas fa-tooth"></i>
        </button>
        <button type="button" className={`btn-tool btn-extraccion ${herramienta === 'extraccion' ? 'active' : ''}`} onClick={() => setHerramienta('extraccion')} title="Extracción">
          <i className="fas fa-times"></i>
        </button>
        <button type="button" className={`btn-tool btn-ausente ${herramienta === 'ausente' ? 'active' : ''}`} onClick={() => setHerramienta('ausente')} title="Diente Ausente">
          <i className="fas fa-times" style={{ color: '#0dcaf0' }}></i>
        </button>
        <button type="button" className={`btn-tool btn-check ${herramienta === 'check' ? 'active' : ''}`} onClick={() => setHerramienta('check')} title="Tratamiento Realizado">
          <i className="fas fa-check" style={{ color: '#0ecb73' }}></i>
        </button>
        
        <div className="toolbar-divider"></div>
        
        <button type="button" className={`btn-tool ${herramienta === 'borrador' ? 'active' : ''} bg-white border`} onClick={() => setHerramienta('borrador')} title="Borrador">
          <i className="fas fa-eraser text-secondary"></i>
        </button>
       
      </div>
      
      {/* Contenedor del SVG */}
      <div className="dentigrama-svg-container">
        <svg 
          ref={svgRef} 
          id="svgDentigrama"
          viewBox="0 0 860 480" 
          xmlns={SVG_NS}
          className="dentigrama-svg"
        />
      </div>
    </div>
  );
});

DentigramaEditor.displayName = 'DentigramaEditor';

export default DentigramaEditor;
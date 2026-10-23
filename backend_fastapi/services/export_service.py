# backend_fastapi/services/export_service.py
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from io import BytesIO
from datetime import datetime, date

TAMANO_TEXTO = Pt(8.5)
TAMANO_TITULO = Pt(14)
TAMANO_SUBTITULO = Pt(10)

def _clave_orden_evolucion(ev):
    """Garantiza comparabilidad cronológica sin colisiones entre datetimes naive/aware o valores None"""
    fecha = getattr(ev, "fecha", None)
    if not fecha:
        return datetime.min
    if isinstance(fecha, datetime):
        return fecha.replace(tzinfo=None)
    if isinstance(fecha, date):
        return datetime.combine(fecha, datetime.min.time())
    return datetime.min

def generar_historia_clinica_word(paciente, odontologo):
    doc = Document()
    
    # 1. Ajuste de márgenes clínicos (inferior de 1 pulgada para sello y firma física)
    section = doc.sections[0]
    section.top_margin = Inches(0.5)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

    # --- ENCABEZADO ---
    titulo = doc.add_heading('HISTORIA CLÍNICA ODONTOLÓGICA', 1)
    titulo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    titulo.paragraph_format.space_after = Pt(10)

    # Función auxiliar para añadir filas a las tablas de datos
    def agregar_fila_datos(tabla, etiqueta1, valor1, etiqueta2, valor2):
        row_cells = tabla.add_row().cells
        # Col 1
        p1 = row_cells[0].paragraphs[0]
        run_etiq1 = p1.add_run(f"{etiqueta1}: ")
        run_etiq1.bold = True
        p1.add_run(str(valor1 or ""))
        p1.paragraph_format.space_after = Pt(1)
        # Col 2
        p2 = row_cells[1].paragraphs[0]
        run_etiq2 = p2.add_run(f"{etiqueta2}: ")
        run_etiq2.bold = True
        p2.add_run(str(valor2 or ""))
        p2.paragraph_format.space_after = Pt(1)
        # Tamaño de fuente para toda la fila
        for cell in row_cells:
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.size = TAMANO_TEXTO

    # --- SECCIÓN 1: DATOS PERSONALES ---
    doc.add_heading('1. Información Personal', level=2)
    tabla_pers = doc.add_table(rows=0, cols=2)
    tabla_pers.style = 'Table Grid'

    fecha_nac = paciente.fecha_nacimiento.strftime('%d/%m/%Y') if getattr(paciente, "fecha_nacimiento", None) else ""
    
    # Combinar dirección con barrio solo si contiene texto real
    direccion_completa = str(paciente.direccion or "").strip()
    barrio_limpio = str(paciente.barrio or "").strip()
    if barrio_limpio:
        direccion_completa = f"{direccion_completa} (B. {barrio_limpio})".strip()

    agregar_fila_datos(tabla_pers, "Paciente", f"{paciente.nombres or ''} {paciente.apellidos or ''}".strip(), "Identificación", f"{paciente.tipo_documento or ''} {paciente.documento or ''}".strip())
    agregar_fila_datos(tabla_pers, "F. Nacimiento", fecha_nac, "Edad/Sexo", f"{paciente.edad or ''} años / {paciente.sexo or ''}".strip())
    agregar_fila_datos(tabla_pers, "Ocupación", paciente.ocupacion, "Teléfono", paciente.telefono)
    agregar_fila_datos(tabla_pers, "Email", paciente.email, "Dirección", direccion_completa)

    # --- SECCIÓN 2: ANAMNESIS Y ANTECEDENTES ---
    h2 = doc.add_heading('2. Anamnesis y Antecedentes', level=2)
    h2.paragraph_format.space_before = Pt(8)
    
    tabla_clin = doc.add_table(rows=0, cols=1)
    tabla_clin.style = 'Table Grid'

    def agregar_bloque_texto(titulo_bloque, contenido):
        row = tabla_clin.add_row().cells[0]
        p = row.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(1)

        run_tit = p.add_run(f"{titulo_bloque}: ")
        run_tit.bold = True
        run_tit.font.size = TAMANO_TEXTO

        lineas = str(contenido or "No registra").split("\n")
        for i, linea in enumerate(lineas):
            if i > 0:
                p.add_run().add_break()
            run_txt = p.add_run(linea)
            run_txt.font.size = TAMANO_TEXTO

    agregar_bloque_texto("Motivo de Consulta", paciente.motivo_consulta)
    agregar_bloque_texto("Enfermedad Actual", paciente.enfermedad_actual)
    agregar_bloque_texto("Alergias", paciente.alergias)
    agregar_bloque_texto("Hábitos", paciente.habitos)
    agregar_bloque_texto("Cepillado Dental", paciente.cepillado_dental)
    agregar_bloque_texto("Observaciones Generales", paciente.observaciones)

    # --- SECCIÓN 3: EVOLUCIONES (Filtrando eliminadas y orden cronológico seguro) ---
    h3 = doc.add_heading('3. Evoluciones Clínicas', level=2)
    h3.paragraph_format.space_before = Pt(8)

    # 1. Ignorar notas en papelera
    evoluciones_activas = [ev for ev in (paciente.evoluciones or []) if not getattr(ev, "is_deleted", False)]
    # 2. Ordenar cronológicamente descendente de forma segura
    evoluciones_ordenadas = sorted(evoluciones_activas, key=_clave_orden_evolucion, reverse=True)

    if not evoluciones_ordenadas:
        p = doc.add_paragraph()
        run = p.add_run("No se registran evoluciones.")
        run.font.size = TAMANO_TEXTO
    else:
        for ev in evoluciones_ordenadas:
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(1)
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            
            fecha_ev_str = ev.fecha.strftime('%d/%m/%Y %H:%M') if getattr(ev, "fecha", None) else "Fecha no registrada"
            run_fecha = p.add_run(f"{fecha_ev_str} - ")
            run_fecha.bold = True
            run_fecha.font.size = TAMANO_TEXTO
            
            desc_lineas = str(ev.descripcion or "").split("\n")
            for i, linea in enumerate(desc_lineas):
                if i > 0:
                    p.add_run().add_break()
                run_desc = p.add_run(linea)
                run_desc.font.size = TAMANO_TEXTO

    # --- FIRMA ---
    doc.add_paragraph("\n")
    firma_p = doc.add_paragraph()
    firma_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    
    consultorio = (odontologo.nombre_consultorio or "").strip()
    apellidos_doc = (odontologo.apellidos or "").strip()
    nombres_doc = (odontologo.nombres or "").strip()
    nombre_doctor = f"Dr(a). {nombres_doc} {apellidos_doc}".strip()
    telefono = (odontologo.telefono or "").strip()

    if consultorio:
        linea_nombre = f"{consultorio}\n{nombre_doctor}"
    else:
        linea_nombre = nombre_doctor

    linea_contacto = f"Tel: {telefono}" if telefono else ""
    
    texto_firma = f"__________________________\n{linea_nombre}"
    if linea_contacto:
        texto_firma += f"\n{linea_contacto}"

    firma_p.add_run(texto_firma)

    # Ajustar estilos de los Headings
    for paragraph in doc.paragraphs:
        if paragraph.style.name.startswith('Heading 1'):
            for run in paragraph.runs: run.font.size = TAMANO_TITULO
        if paragraph.style.name.startswith('Heading 2'):
            for run in paragraph.runs: run.font.size = TAMANO_SUBTITULO

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer
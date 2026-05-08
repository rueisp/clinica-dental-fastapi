'use client';

import Link from 'next/link';
import Button from '@/app/components/ui/Button';

export default function HeaderPaciente({ 
  paciente, 
  modo,           
  loading = false,
  onEliminar,
}) {
  
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-gray-200 rounded mt-1 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Nombre del paciente */}
        <div>
          {/* NUEVO: Indicador ahora interno para que no se salga del cuadro */}
          {modo === 'mostrar' && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Paciente Activo
              </span>
            </div>
          )}

          {modo === 'registrar' ? (
            <h1 className="text-2xl font-bold text-black">Nuevo Paciente</h1>
          ) : (
            <div className="flex flex-col leading-none"> {/* Cambié a leading-none para que estén más pegaditos */}
              <h1 className="text-2xl font-black text-black capitalize tracking-tight">
                {paciente?.nombres || 'Cargando...'}
              </h1>
              {paciente?.apellidos && (
                <h1 className="text-2xl font-black text-gray-500 capitalize tracking-tight">
                  {paciente.apellidos}
                </h1>
              )}
            </div>
          )}

          {/* ID recortado */}
          {modo !== 'registrar' && paciente?.id && (
            <p className="text-[11px] text-gray-400 font-medium mt-2">
              ID: <span className="font-mono">{paciente.id.substring(0, 8)}</span>
            </p>
          )}
        </div>
        
        {/* Botones de acción con el nuevo componente Button */}
        <div className="flex flex-wrap gap-3">
          {modo === 'mostrar' && (
            <>
              <Button 
            icon="Trash2" 
            texto="Eliminar" 
            onClick={onEliminar}
            variant="danger" 
          />
            <Button 
              icon="Pencil" 
              texto="Editar" 
              href={`/pacientes/${paciente?.id}/editar`} 
              variant="primary" 
            />
            <Button 
              icon="Users" 
              texto="Pacientes" 
              href="/pacientes" 
              variant="secondary" 
            />
            <Button 
              icon="Home" 
              texto="Inicio" 
              href="/" 
              variant="secondary" 
            />
            </>
          )}
          
          {modo === 'editar' && (
            <>
              <Button 
                texto="Cancelar" 
                href={`/pacientes/${paciente?.id}`} 
                variant="secondary" 
              />
              <Button 
                texto="Guardar Cambios" 
                type="submit"
                form="form-editar-paciente"
                variant="primary" 
              />
            </>
          )}
          
          {modo === 'registrar' && (
            <>
              <Button 
                texto="Cancelar" 
                href="/pacientes" 
                variant="secondary" 
              />
              <Button 
                texto="Guardar Paciente" 
                type="submit"
                form="form-registrar-paciente"
                variant="primary" 
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

export default function Privacidad() {
  return (
    <>
      <Navbar />
      <div className="bg-gray-50 min-h-screen py-20">
        <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 shadow-sm rounded-xl border border-gray-100">
          <a href="/" className="text-green-600 font-bold mb-6 inline-block">← Volver al inicio</a>
          <h1 className="text-3xl font-bold text-gray-800 border-b-2 border-green-500 pb-4 mb-8">Aviso de Privacidad</h1>
          <p className="text-sm text-gray-400 mb-6 font-medium uppercase">Última actualización: 26 de febrero de 2026</p>
          
          <article className="prose prose-green max-w-none text-gray-600 space-y-6">
            <section>
              <h4 className="text-xl font-bold text-gray-800 mb-2">1. Responsable del Tratamiento</h4>
              <p><strong>CloudentApp</strong> es una aplicación operada por [Tu Nombre], dentista emprendedor, actuando como proveedor tecnológico. Contacto: [tucorreo@ejemplo.com]</p>
            </section>
            
            <section>
              <h4 className="text-xl font-bold text-gray-800 mb-2">2. Información que Recolectamos</h4>
              <p><strong>De los odontólogos usuarios:</strong> nombre, correo electrónico, número de contacto, especialidad.</p>
              <p><strong>De los pacientes:</strong> nombres, datos de contacto, historia clínica, imágenes, odontograma. Esta información es almacenada bajo la total responsabilidad del odontólogo usuario.</p>
            </section>

            <section>
              <h4 className="text-xl font-bold text-gray-800 mb-2">4. Responsabilidad del Usuario (Odontólogo)</h4>
              <p className="bg-yellow-50 p-4 border-l-4 border-yellow-400 italic">
                El odontólogo usuario es el único responsable del tratamiento de los datos personales de sus pacientes, conforme a la Ley 1581 de 2012. CloudentApp actúa únicamente como encargado del tratamiento.
              </p>
            </section>
            {/* ... Agrega las demás secciones siguiendo este formato ... */}
          </article>
        </div>
      </div>
      <Footer />
    </>
  );
}
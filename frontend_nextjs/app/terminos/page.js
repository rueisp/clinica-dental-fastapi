import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import Link from 'next/link';

export default function TerminosPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      
      <main className="flex-grow bg-gray-50 py-16 px-4">
        <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
          
          <div className="bg-green-600 p-8 text-white">
            <Link href="/" className="text-green-100 hover:text-white mb-4 inline-block font-medium">
              ← Volver al inicio
            </Link>
            <h1 className="text-3xl font-bold">Términos y Condiciones</h1>
            <p className="text-green-100 mt-2">Fecha de entrada en vigencia: 26 de febrero de 2026</p>
          </div>

          <div className="p-8 md:p-12 text-gray-700 leading-relaxed space-y-8">
            <section>
              <h4 className="text-xl font-bold text-gray-900 mb-3">1. Aceptación de los Términos</h4>
              <p>Al registrarse y utilizar CloudentApp, el odontólogo usuario acepta íntegramente estos Términos y Condiciones de uso.</p>
            </section>

            <section>
              <h4 className="text-xl font-bold text-gray-900 mb-3">2. Naturaleza del Servicio</h4>
              <p>
                CloudentApp es una <strong className="text-green-700">herramienta de apoyo administrativo</strong>. 
                No constituye un sistema de historia clínica oficial ni reemplaza los registros exigidos por la normativa 
                sanitaria colombiana (Resolución 3100 de 2019).
              </p>
            </section>

            <section>
              <h4 className="text-xl font-bold text-gray-900 mb-3">3. Responsabilidad del Usuario</h4>
              <p>
                El Usuario es un profesional independiente y único responsable por la veracidad de los datos 
                y por obtener los consentimientos de sus pacientes conforme a la Ley 1581 de 2012.
              </p>
            </section>

            <section>
              <h4 className="text-xl font-bold text-gray-900 mb-3">4. Suscripciones y Pagos</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Prueba gratuita:</strong> 7 días con límite diario de pacientes.</li>
                <li><strong>Planes de Pago:</strong> Basico ($20,000 COP/mes) y Pro ($30,000 COP/mes).</li>
                <li>La activación se realiza tras el reporte de pago manual y verificación del mismo.</li>
              </ul>
            </section>

            <section className="bg-red-50 p-6 rounded-xl border-l-4 border-red-500">
              <h4 className="text-xl font-bold text-red-800 mb-2">5. Cancelación y Modo Solo Lectura</h4>
              <p className="text-red-900">
                Al vencer la suscripción, la cuenta entrará en modo <strong>Solo Lectura</strong>. 
                El usuario podrá consultar y exportar sus datos existentes, pero no podrá crear nuevos registros 
                hasta realizar el pago de la renovación.
              </p>
            </section>

            <section>
              <h4 className="text-xl font-bold text-gray-900 mb-3">6. Legislación Aplicable</h4>
              <p>Estos Términos se rigen por las leyes vigentes de la República de Colombia.</p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
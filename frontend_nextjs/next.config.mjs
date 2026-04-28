/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mantiene tu configuración de red local
  allowedDevOrigins: ['192.168.1.7', 'localhost', '*.localhost', '*.192.168.1.7'],

  // CLAVE PARA CLOUD RUN: (No la quites)
  output: 'standalone',

  // Si los avisos de ESLint te molestan al desplegar, 
  // en las versiones nuevas se manejan por separado, 
  // así que por ahora vamos a simplificar el archivo:
};

export default nextConfig;
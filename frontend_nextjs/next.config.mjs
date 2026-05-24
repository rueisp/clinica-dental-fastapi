/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.8', 'localhost', '*.localhost', '*.192.168.1.8'],
  output: 'standalone',
  
  // DESACTIVAR EL INDICADOR DE DESARROLLO QUE CONGELA EL CELULAR
  devIndicators: {
    appIsrStatus: false,
  },
};

export default nextConfig;
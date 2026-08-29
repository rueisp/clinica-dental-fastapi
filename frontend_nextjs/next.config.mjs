/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '192.168.1.4',
    '192.168.1.8',
    'localhost',
    '*.localhost',
    '*.192.168.1.4',
    '*.192.168.1.8',
  ],
  output: 'standalone',

  // Desactivar el indicador de desarrollo que congela el celular
  devIndicators: {
    appIsrStatus: false,
  },
};

export default nextConfig;
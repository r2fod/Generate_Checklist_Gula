import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Identificador de esta compilación. Va DENTRO del bundle y también se publica en
// version.json, así la app puede comparar lo que tiene cargado con lo que hay en el
// servidor y avisar de que hay una versión nueva. Sin esto, el navegador del móvil se
// queda con el index.html en caché y sigue sirviendo el bundle viejo indefinidamente:
// los .js llevan hash en el nombre, así que un index.html antiguo apunta para siempre a
// la compilación antigua, que sigue estando en el servidor.
const BUILD_ID = new Date().toISOString()

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'gula-version',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ id: BUILD_ID }),
        })
      },
    },
  ],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  base: './'
})

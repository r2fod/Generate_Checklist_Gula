import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

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
      generateBundle(_opciones, bundle) {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ id: BUILD_ID }),
        })
        // Lista de ficheros de ESTA compilación, para que el service worker pueda
        // guardárselos al instalarse. Sin esto no llega a verlos: se registra cuando la
        // página ya ha terminado de cargar, así que las peticiones de los .js y .css ya
        // han pasado sin él y la app no abría sin cobertura aunque el HTML sí estuviera
        // guardado. Los nombres llevan hash, por eso hay que generar la lista aquí.
        const ficheros = Object.keys(bundle)
          .filter((f) => /\.(js|css)$/.test(f))
          .map((f) => './' + f)
        this.emitFile({
          type: 'asset',
          fileName: 'precache.json',
          source: JSON.stringify({ id: BUILD_ID, ficheros }),
        })
      },
    },
  ],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  build: {
    rollupOptions: {
      // Dos apps, cada una en SU carpeta y ninguna dentro de la otra. El ámbito de un
      // manifiesto es la carpeta donde vive, así que con la checklist en la raíz su
      // ámbito se tragaba /formulario/: una app dentro del ámbito de otra no se puede
      // instalar aparte, el navegador solo ofrece "abrir en la de fuera". Por eso la
      // checklist también baja a su carpeta. La raíz se queda como desvío (ver
      // public/index.html), que va en HTML suelto y no pasa por aquí.
      input: {
        checklist: fileURLToPath(new URL('./checklist/index.html', import.meta.url)),
        formulario: fileURLToPath(new URL('./formulario/index.html', import.meta.url)),
      },
    },
  },
  base: './'
})

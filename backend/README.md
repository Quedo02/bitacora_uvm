# Claims

Este proyecto implementa una arquitectura MVC (Modelo-Vista-Controlador) utilizando PHP para el backend, JavaScript y SCSS para el frontend, y MySQL como base de datos. La estructura del proyecto está organizada para facilitar el desarrollo, mantenimiento y escalabilidad.

## Estructura del Proyecto

- **classes/**: Contiene las clases PHP que definen la lógica de negocio.
  
- **controllers/**: Incluye los controladores que gestionan las peticiones y actúan como intermediarios entre las vistas y los modelos.
  
- **includes/**:
  - **env/**: Configuración de variables de entorno.
  - **app.php**: Archivo principal que carga la configuración del entorno, las dependencias (vendor) y el objeto de la base de datos.
  - **funciones.php**: Funciones auxiliares para el desarrollo.

- **models/**: Contiene los modelos que representan los datos y la lógica de la base de datos.

- **public/**:
  - **index.php**: Punto de entrada de la aplicación. Carga las rutas y arranca la aplicación.
  - **build/**: Directorio que contiene los archivos JavaScript, CSS e imágenes optimizados y comprimidos.

- **src/**:
  - **js/**: Archivos JavaScript de desarrollo.
  - **scss/**: Archivos SCSS de desarrollo.
  - **img/**: Imágenes sin optimizar.

- **views/**: Contiene las vistas de la aplicación, incluyendo el layout principal y todas las demás vistas.

- **composer.json**: Archivo de configuración para Composer, que gestiona las dependencias de PHP.

- **package.json**: Archivo de configuración para npm, que gestiona las dependencias de JavaScript y herramientas de desarrollo.

- **gulpfile.js**: Configuración de Gulp, utilizada para compilar SCSS, optimizar imágenes y comprimir JavaScript.

- **Router.php**: Clase de enrutamiento que maneja las peticiones POST y GET, y gestiona el renderizado de las vistas.

## Instalación

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/usuario/proyecto-mvc.git
   cd proyecto-mvc
   ```

2. **Instalar dependencias de PHP:**

   ```bash
   composer install
   ```

3. **Instalar dependencias de Node.js:**

   ```bash
   npm install
   ```

4. **Configurar el entorno:**
   - Copiar el archivo `.env.example` a `.env` y configurar las variables de entorno necesarias, como la conexión a la base de datos.

5. **Compilar activos de frontend:**

   ```bash
   npm run dev
   ```

6. **Iniciar el servidor:**
   - Si estás utilizando un servidor local como XAMPP, coloca los archivos en el directorio `htdocs` y accede a `http://localhost/claims/public`.
   - Si estás utilizando un servidor php ejecuta php -S localhost:{puerto}, procura exponer el puerto en cuestión.

## Uso

- Accede a la aplicación desde el navegador en la URL configurada (`http://localhost/claims/public`).
- Las rutas se definen en el archivo `index.php` dentro de `public/`.
- Los controladores manejan las peticiones y los modelos interactúan con la base de datos.

## Desarrollo

- Para desarrollar nuevas características, asegúrate de seguir el patrón MVC.
- Utiliza Gulp para compilar los cambios en los archivos SCSS y JavaScript.
- Puedes añadir nuevas dependencias utilizando `composer` para PHP y `npm` para JavaScript.

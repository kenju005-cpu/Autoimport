AUTOIMPORT V20 · ADMIN INTELIGENTE + SUPABASE REAL

Qué cambia respecto a V19
- El usuario admin ya está creado y promovido en Supabase.
- Si un admin/staff entra en Área cliente, la app lo redirige automáticamente al Panel interno.
- Si existe una sesión admin al abrir index.html, la app abre directamente admin.html.
- Para revisar el simulador público manteniendo la sesión admin, usa index.html?public=1.
- En ese modo público, el enlace Área cliente se oculta para el administrador.
- La navegación pública ya no muestra la página técnica de configuración de nube.
- El panel muestra la identidad de la sesión y ofrece “Ver simulador público”.

Nube
- Organización Supabase: AutoImport.
- Proyecto conectado mediante URL + publishable key pública.
- RLS activo; datos internos y visibles al cliente están separados.
- Bucket order-documents privado.
- Nunca incluir claves secretas/service_role en frontend.

Publicación
- El proyecto está listo para hosting estático HTTPS (Vercel/Netlify).
- Tras obtener la URL definitiva, configurar appBaseUrl y las Redirect URLs de Supabase Auth.

APIs externas
- mobile.de, Coches.net, carVertical y autoDNA siguen desacoplados y se conectarán cuando tengamos acceso.

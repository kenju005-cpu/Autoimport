# Backend de historial VIN · V10

La V10 separa las consultas de historial del frontend. Las claves de carVertical/autoDNA deberán vivir en variables de entorno del servidor, nunca en `index.html` ni `app.js`.

Variables reservadas:
- `CARVERTICAL_API_KEY`
- `AUTODNA_API_KEY`

Los endpoints y esquemas de autenticación NO se han inventado: se completarán cuando los proveedores faciliten documentación B2B/partner y credenciales.

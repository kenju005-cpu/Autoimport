// AutoImport V10 · adaptadores de historial VIN (backend only)
// IMPORTANTE: no poner API keys en frontend. Estos adaptadores se completarán
// cuando cada proveedor entregue documentación técnica y credenciales oficiales.

export const historyProviders = {
  carvertical: {
    id: 'carvertical',
    name: 'carVertical',
    configured: () => Boolean(process.env.CARVERTICAL_API_KEY),
    async getReport(vin) {
      if (!this.configured()) throw new Error('CARVERTICAL_API_KEY no configurada');
      // Endpoint/autenticación se añadirán únicamente con la documentación B2B oficial.
      throw new Error('Conector carVertical pendiente de documentación/credenciales B2B');
    }
  },
  autodna: {
    id: 'autodna',
    name: 'autoDNA',
    configured: () => Boolean(process.env.AUTODNA_API_KEY),
    async getReport(vin) {
      if (!this.configured()) throw new Error('AUTODNA_API_KEY no configurada');
      // Endpoint/autenticación se añadirán únicamente con la documentación partner oficial.
      throw new Error('Conector autoDNA pendiente de documentación/credenciales partner');
    }
  }
};

export function validateVin(vin='') {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(String(vin).trim().toUpperCase());
}

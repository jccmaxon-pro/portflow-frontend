import apiClient from "./apiClient";

/**
 * Consulta el estado habitual de doblaje del trabajador
 * y sus excepciones activas.
 */
export async function getMyDoubleAvailability(params = {}) {
  const response = await apiClient.get("/worker-doubles/me", {
    params,
  });

  return response.data;
}

/**
 * Crea o actualiza una excepción puntual de doblaje.
 *
 * data:
 * {
 *   date: "2026-06-05",
 *   availableForDouble: true/false,
 *   notes: ""
 * }
 */
export async function createMyDoubleException(data) {
  const response = await apiClient.post(
    "/worker-doubles/exceptions",
    data
  );

  return response.data;
}

/**
 * Elimina una excepción puntual propia.
 */
export async function deleteMyDoubleException(exceptionId) {
  const response = await apiClient.delete(
    `/worker-doubles/exceptions/${exceptionId}`
  );

  return response.data;
}
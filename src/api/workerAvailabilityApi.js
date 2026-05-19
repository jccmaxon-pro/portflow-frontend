import apiClient from "./apiClient";

export async function getWorkerAvailabilityByWorker(workerId) {
  const response = await apiClient.get(`/worker-availability/worker/${workerId}`);
  return response.data;
}

export async function getWorkerAvailabilityByPort(portId) {
  const response = await apiClient.get(`/worker-availability/port/${portId}`);
  return response.data;
}

export async function createWorkerAvailability(data) {
  const response = await apiClient.post("/worker-availability", data);
  return response.data;
}

export async function updateWorkerAvailability(id, data) {
  const response = await apiClient.put(`/worker-availability/${id}`, data);
  return response.data;
}

export async function deleteWorkerAvailability(id) {
  const response = await apiClient.delete(`/worker-availability/${id}`);
  return response.data;
}
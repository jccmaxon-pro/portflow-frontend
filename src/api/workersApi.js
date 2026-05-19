import apiClient from "./apiClient";

const PORT_ID = "69f210fe5417a1641d23188d";

export async function getWorkers() {
  const response = await apiClient.get(`/workers?portId=${PORT_ID}`);
  return response.data;
}

export async function createWorker(workerData) {
  const payload = {
    ...workerData,
    port: PORT_ID,
    portId: PORT_ID,
  };

  console.log("Payload enviado a backend desde workersApi:", payload);

  const response = await apiClient.post("/workers", payload);
  return response.data;
}

export async function updateWorker(workerId, workerData) {
  const payload = {
    ...workerData,
    port: PORT_ID,
    portId: PORT_ID,
  };

  const response = await apiClient.put(`/workers/${workerId}`, payload);
  return response.data;
}

export async function deleteWorker(workerId) {
  const response = await apiClient.delete(`/workers/${workerId}`);
  return response.data;
}
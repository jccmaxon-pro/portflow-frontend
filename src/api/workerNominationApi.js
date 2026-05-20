import apiClient from "./apiClient";

export async function getWorkerNominationView(params = {}) {
  const response = await apiClient.get("/nomination-runs/worker-view", {
    params,
  });

  return response.data;
}
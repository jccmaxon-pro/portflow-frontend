import apiClient from "./apiClient";

export async function simulateAppointmentBlock(payload) {
  const response = await apiClient.post("/appointment-simulations/block", payload);
  return response.data;
}
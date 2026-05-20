import apiClient from "./apiClient";

export async function simulateAppointmentBlock({
  portId,
  blockItems,
  doorStartByRotationList = {},
  simulationOptions = {},
}) {
  const response = await apiClient.post("/appointment-simulations/block", {
    portId,
    blockItems,
    doorStartByRotationList,
    simulationOptions,
  });

  return response.data;
}
import apiClient from "./apiClient";

export async function getWeeklyIntegratedRotationsByPort(portId) {
  const response = await apiClient.get(
    `/weekly-integrated-rotations/port/${portId}`
  );

  return response.data;
}

export async function enableWeeklyIntegratedRotation(rotationId) {
  const response = await apiClient.patch(
    `/weekly-integrated-rotations/${rotationId}/enable`
  );

  return response.data;
}

export async function disableWeeklyIntegratedRotation(rotationId) {
  const response = await apiClient.patch(
    `/weekly-integrated-rotations/${rotationId}/disable`
  );

  return response.data;
}

export async function updateWeeklyIntegratedRotation(rotationId, payload) {
  const response = await apiClient.put(
    `/weekly-integrated-rotations/${rotationId}`,
    payload
  );

  return response.data;
}
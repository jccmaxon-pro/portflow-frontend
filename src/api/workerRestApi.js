import apiClient from "./apiClient";

export async function getMyRestCalendar(params = {}) {
  const response = await apiClient.get("/worker-rest/my-calendar", {
    params,
  });

  return response.data;
}

export async function selectRestDay({ restEntitlementDayId, notes = "" }) {
  const response = await apiClient.post("/worker-rest/my-selections", {
    restEntitlementDayId,
    notes,
  });

  return response.data;
}

export async function cancelRestSelection(selectionId) {
  const response = await apiClient.delete(
    `/worker-rest/my-selections/${selectionId}`
  );

  return response.data;
}
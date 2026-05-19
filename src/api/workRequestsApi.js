import apiClient from "./apiClient";

export async function getWorkRequests(params = {}) {
  const response = await apiClient.get("/work-requests", {
    params,
  });

  return response.data;
}

export async function getNominationPreview(params = {}) {
  const response = await apiClient.get("/work-requests/nomination-preview", {
    params,
  });

  return response.data;
}

export async function createWorkRequest(data) {
  const response = await apiClient.post("/work-requests", data);

  return response.data;
}

export async function updateWorkRequest(workRequestId, data) {
  const response = await apiClient.put(`/work-requests/${workRequestId}`, data);

  return response.data;
}

export async function cancelWorkRequest(workRequestId) {
  const response = await apiClient.delete(`/work-requests/${workRequestId}`);

  return response.data;
}

export async function submitWorkRequest(workRequestId) {
  const response = await apiClient.patch(
    `/work-requests/${workRequestId}/submit`
  );

  return response.data;
}

export async function confirmWorkRequest(workRequestId) {
  const response = await apiClient.patch(
    `/work-requests/${workRequestId}/confirm`
  );

  return response.data;
}

export async function markWorkRequestAsChangeable(workRequestId) {
  const response = await apiClient.patch(
    `/work-requests/${workRequestId}/mark-changeable`
  );

  return response.data;
}

export async function rejectWorkRequest(workRequestId, reason = "") {
  const response = await apiClient.patch(
    `/work-requests/${workRequestId}/reject`,
    {
      reason,
    }
  );

  return response.data;
}
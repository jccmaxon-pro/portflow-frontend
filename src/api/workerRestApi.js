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

export async function getAdminRestSelections(params = {}) {
  const response = await apiClient.get("/worker-rest/admin/selections", {
    params,
  });

  return response.data;
}

export async function getAdminRestGroups(params = {}) {
  const response = await apiClient.get("/worker-rest/admin/groups", {
    params,
  });

  return response.data;
}

export async function getAdminRestGroupAssignments(params = {}) {
  const response = await apiClient.get(
    "/worker-rest/admin/group-assignments",
    {
      params,
    }
  );

  return response.data;
}

export async function moveWorkerRestGroup(data = {}) {
  const response = await apiClient.post(
    "/worker-rest/admin/move-worker-group",
    data
  );

  return response.data;
}

export async function assignWorkerToRestGroup(data = {}) {
  const response = await apiClient.post(
    "/worker-rest/admin/assign-worker-group",
    data
  );

  return response.data;
}
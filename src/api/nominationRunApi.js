import apiClient from "./apiClient";

export async function createDraftNominationRun(data) {
  const response = await apiClient.post("/nomination-runs", data);

  return response.data;
}

export async function getNominationRuns(params = {}) {
  const response = await apiClient.get("/nomination-runs", {
    params,
  });

  return response.data;
}

export async function getNominationRunById(nominationRunId) {
  const response = await apiClient.get(`/nomination-runs/${nominationRunId}`);

  return response.data;
}

export async function publishNominationRun(nominationRunId) {
  const response = await apiClient.patch(
    `/nomination-runs/${nominationRunId}/publish`
  );

  return response.data;
}

export async function cancelNominationRun(nominationRunId) {
  const response = await apiClient.delete(`/nomination-runs/${nominationRunId}`);

  return response.data;
}

export async function confirmFullChangeableWorkRequest({
  nominationRunId,
  workRequestId,
}) {
  const response = await apiClient.patch(
    `/nomination-runs/${nominationRunId}/changeables/${workRequestId}/confirm-full`
  );

  return response.data;
}

export async function resetChangeableWorkRequestDecision({
  nominationRunId,
  workRequestId,
}) {
  const response = await apiClient.patch(
    `/nomination-runs/${nominationRunId}/changeables/${workRequestId}/reset`
  );

  return response.data;
}

export async function cancelChangeableWorkRequest({
  nominationRunId,
  workRequestId,
}) {
  const response = await apiClient.patch(
    `/nomination-runs/${nominationRunId}/changeables/${workRequestId}/cancel`
  );

  return response.data;
}

export async function reduceChangeableWorkRequest({
  nominationRunId,
  workRequestId,
  reduction = {},
}) {
  const response = await apiClient.patch(
    `/nomination-runs/${nominationRunId}/changeables/${workRequestId}/reduce`,
    {
      reduction,
    }
  );

  return response.data;
}

export async function changeShiftChangeableWorkRequest({
  nominationRunId,
  workRequestId,
  newShiftCode,
  notes = "",
}) {
  const response = await apiClient.patch(
    `/nomination-runs/${nominationRunId}/changeables/${workRequestId}/change-shift`,
    {
      newShiftCode,
      notes,
    }
  );

  return response.data;
}

export async function prepareChangeableDefinitivePlan(nominationRunId) {
  const response = await apiClient.post(
    `/nomination-runs/${nominationRunId}/changeables/prepare-definitive`
  );

  return response.data;
}

export async function prepareChangeableDefinitiveSimulation(nominationRunId) {
  const response = await apiClient.post(
    `/nomination-runs/${nominationRunId}/changeables/prepare-definitive-simulation`
  );

  return response.data;
}
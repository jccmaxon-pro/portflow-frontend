import React, { useEffect, useState } from "react";
import {
  cancelNominationRun,
  getNominationRunById,
  getNominationRuns,
  publishNominationRun,
} from "../../api/nominationRunApi";
import NominationVisualResult from "./NominationVisualResult";

const DEFAULT_PREVIEW_PORT_ID = "69f210fe5417a1641d23188d";

const STATUS_LABELS = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  CLOSED: "Cerrado",
  CANCELLED: "Anulado",
};

const OPERATIONAL_STATUS_LABELS = {
  OK: "Estado correcto",
  CURRENT: "Estado correcto",
  NEEDS_REVIEW: "Revisar",
  INVALIDATED: "Invalidado",
};

function getOperationalStatusLabel(operationalStatus) {
  return (
    OPERATIONAL_STATUS_LABELS[operationalStatus] ||
    operationalStatus ||
    "Estado correcto"
  );
}

function OperationalStatusBadge({ operationalStatus }) {
  if (!operationalStatus || ["OK", "CURRENT"].includes(operationalStatus)) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
        Estado correcto
      </span>
    );
  }

  const statusClass =
    operationalStatus === "NEEDS_REVIEW"
      ? "bg-amber-100 text-amber-900 ring-amber-200"
      : operationalStatus === "INVALIDATED"
      ? "bg-red-100 text-red-800 ring-red-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1 ${statusClass}`}
    >
      {getOperationalStatusLabel(operationalStatus)}
    </span>
  );
}

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "DRAFT", label: "Borradores" },
  { value: "PUBLISHED", label: "Publicados" },
  { value: "CLOSED", label: "Cerrados" },
  { value: "CANCELLED", label: "Anulados" },
];

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toISOString().slice(0, 10);
}

function formatDateTime(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "Sin estado";
}

function StatusBadge({ status }) {
  const statusClass =
    status === "PUBLISHED"
      ? "bg-emerald-100 text-emerald-800"
      : status === "DRAFT"
      ? "bg-amber-100 text-amber-800"
      : status === "CANCELLED"
      ? "bg-red-100 text-red-800"
      : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${statusClass}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

const CHANGEABLE_STATUS_LABELS = {
  PENDING_CONFIRMATION: "Pendiente de confirmación",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  REDUCED: "Reducido",
  MODIFIED: "Modificado",
};

function getChangeableStatusLabel(status) {
  return (
    CHANGEABLE_STATUS_LABELS[status] ||
    status ||
    "Pendiente de confirmación"
  );
}

function ChangeableStatusBadge({ status }) {
  const normalizedStatus = status || "PENDING_CONFIRMATION";

  const statusClass =
    normalizedStatus === "CONFIRMED"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
      : normalizedStatus === "CANCELLED"
      ? "bg-red-100 text-red-800 ring-red-200"
      : normalizedStatus === "REDUCED"
      ? "bg-orange-100 text-orange-900 ring-orange-200"
      : normalizedStatus === "MODIFIED"
      ? "bg-indigo-100 text-indigo-800 ring-indigo-200"
      : "bg-amber-100 text-amber-900 ring-amber-200";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1 ${statusClass}`}
    >
      {getChangeableStatusLabel(normalizedStatus)}
    </span>
  );
}

function getWorkRequestId(workRequest) {
  return String(workRequest?._id || workRequest?.id || "");
}

function getBerthName(workRequest) {
  if (typeof workRequest?.berth === "string") {
    return workRequest.berth;
  }

  return (
    workRequest?.berth?.name ||
    workRequest?.berth?.code ||
    workRequest?.berthName ||
    "-"
  );
}

function getChangeableWorkRequestsFromRun(nominationRun) {
  const workRequests = nominationRun?.result?.workRequests || [];

  if (!Array.isArray(workRequests)) {
    return [];
  }

  return workRequests.filter((workRequest) => {
    const status = String(workRequest?.status || "").toUpperCase();

    return status === "CHANGEABLE";
  });
}

function getAssignmentsForWorkRequest(nominationRun, workRequest) {
  const assignments = nominationRun?.result?.assignments || [];
  const workRequestId = getWorkRequestId(workRequest);

  if (!Array.isArray(assignments) || !workRequestId) {
    return [];
  }

  return assignments.filter((assignment) => {
    const assignmentWorkRequestId = String(
      assignment?.workRequestId ||
        assignment?.workRequest ||
        assignment?.workRequest?._id ||
        ""
    );

    if (assignmentWorkRequestId && assignmentWorkRequestId === workRequestId) {
      return true;
    }

    const sameShip =
      assignment?.shipName &&
      workRequest?.shipName &&
      assignment.shipName === workRequest.shipName;

    const sameShift =
      assignment?.shiftCode &&
      workRequest?.shiftCode &&
      assignment.shiftCode === workRequest.shiftCode;

    return Boolean(sameShip && sameShift);
  });
}

function buildPositionSummary(assignments) {
  const summaryByPosition = {};

  for (const assignment of assignments || []) {
    const positionCode = assignment?.positionCode || "SIN_PUESTO";

    summaryByPosition[positionCode] =
      (summaryByPosition[positionCode] || 0) + 1;
  }

  return Object.entries(summaryByPosition)
    .sort(([positionA], [positionB]) => positionA.localeCompare(positionB))
    .map(([positionCode, total]) => `${positionCode}: ${total}`)
    .join(" · ");
}

function ChangeableWorkRequestsPanel({ selectedRun }) {
  const changeableWorkRequests = getChangeableWorkRequestsFromRun(selectedRun);

  if (changeableWorkRequests.length === 0) {
    return null;
  }

  const canManageChangeables = selectedRun.status === "PUBLISHED";

  return (
    <div className="mb-5 rounded-3xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-black uppercase tracking-wide text-amber-900">
            Trabajos susceptibles de cambio
          </div>

          <p className="mt-2 max-w-4xl text-sm font-bold leading-6 text-amber-900">
            Estos trabajos se publicaron como provisionales. Antes de nombrar la
            siguiente ventana, deberían confirmarse, reducirse, modificarse o
            cancelarse para que el estado operativo final sea correcto.
          </p>
        </div>

        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-amber-900 shadow-sm ring-1 ring-amber-200">
          {changeableWorkRequests.length} susceptible
          {changeableWorkRequests.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {changeableWorkRequests.map((workRequest, index) => {
          const assignments = getAssignmentsForWorkRequest(
            selectedRun,
            workRequest
          );

          const positionSummary = buildPositionSummary(assignments);

          const changeableStatus =
            workRequest.changeableStatus ||
            workRequest.confirmationStatus ||
            "PENDING_CONFIRMATION";

          return (
            <div
              key={getWorkRequestId(workRequest) || index}
              className="rounded-3xl border border-amber-200 bg-white p-4 shadow-sm"
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-black text-slate-950">
                      {workRequest.shipName || "Barco sin nombre"}
                    </h4>

                    <ChangeableStatusBadge status={changeableStatus} />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-slate-600">
                    <span>Turno: {workRequest.shiftCode || "-"}</span>
                    <span>Muelle: {getBerthName(workRequest)}</span>
                    <span>
                      Tarea:{" "}
                      {workRequest.taskName ||
                        workRequest.taskCode ||
                        "Sin tarea"}
                    </span>
                    <span>
                      Empresa: {workRequest.requestingCompanyName || "-"}
                    </span>
                  </div>

                  <div className="mt-3 text-sm text-slate-700">
                    <span className="font-black">
                      Trabajadores asignados provisionalmente:
                    </span>{" "}
                    {assignments.length}
                  </div>

                  {positionSummary && (
                    <div className="mt-1 text-sm font-bold text-slate-600">
                      {positionSummary}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-start gap-2 lg:justify-end lg:whitespace-nowrap">
                  <button
                    type="button"
                    disabled={!canManageChangeables}
                    className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Confirmar completo
                  </button>

                  <button
                    type="button"
                    disabled={!canManageChangeables}
                    className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-black text-orange-800 ring-1 ring-orange-100 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Reducir
                  </button>

                  <button
                    type="button"
                    disabled={!canManageChangeables}
                    className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Cambiar horario
                  </button>

                  <button
                    type="button"
                    disabled={!canManageChangeables}
                    className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              {!canManageChangeables && (
                <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500">
                  Las acciones de susceptible solo estarán disponibles cuando el
                  nombramiento esté publicado.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SelectedNominationRunDetail({
  selectedRun,
  onClose,
  onPublish,
  onCancel,
  savingId,
}) {
  if (!selectedRun) {
    return null;
  }

  
  const canPublish =
    selectedRun.status === "DRAFT" &&
    selectedRun.operationalStatus !== "INVALIDATED";
  const canCancel = selectedRun.status !== "CLOSED";
  const isSaving = savingId === selectedRun._id;

  const needsOperationalReview =
  selectedRun.operationalStatus === "NEEDS_REVIEW";

  return (
    <section className="mt-6 rounded-3xl border border-slate-300 bg-slate-50 p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-3xl bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">
            Detalle del nombramiento guardado
          </p>

          <h3 className="mt-1 text-2xl font-black text-slate-950">
            {selectedRun.windowName}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-600">
            <span>{formatDate(selectedRun.workDate)}</span>
            <span>·</span>
            <span>{selectedRun.windowCode}</span>
            <span>·</span>
            <StatusBadge status={selectedRun.status} />
            <OperationalStatusBadge
              operationalStatus={selectedRun.operationalStatus}
            />
          </div>

          <div className="mt-3 text-sm text-slate-500">
            <div>
              Creado por:{" "}
              <span className="font-bold text-slate-700">
                {selectedRun.createdBy?.name || "-"}
              </span>{" "}
              · {formatDateTime(selectedRun.createdAt)}
            </div>

            {selectedRun.publishedAt && (
              <div>
                Publicado por:{" "}
                <span className="font-bold text-slate-700">
                  {selectedRun.publishedBy?.name || "-"}
                </span>{" "}
                · {formatDateTime(selectedRun.publishedAt)}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-700 hover:bg-slate-200"
          >
            Cerrar vista
          </button>

          <button
            type="button"
            disabled={isSaving || !canPublish}
            onClick={() => onPublish(selectedRun)}
            className="rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Publicar
          </button>

          <button
            type="button"
            disabled={isSaving || !canCancel}
            onClick={() => onCancel(selectedRun)}
            className="rounded-2xl bg-red-50 px-4 py-3 font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anular
          </button>
        </div>
      </div>
      {needsOperationalReview && (
        <div className="mb-5 rounded-3xl border border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-sm">
          <div className="text-sm font-black uppercase tracking-wide">
            Nombramiento pendiente de revisión
          </div>

          <p className="mt-2 text-sm font-bold leading-6">
            Este nombramiento dependía de una ventana anterior que ha sido anulada.
            El estado operativo anterior ya no es válido, por lo que deberías volver
            a simular esta ventana y publicarla de nuevo antes de usarla como
            nombramiento definitivo.
          </p>
        </div>
      )}        
      <ChangeableWorkRequestsPanel selectedRun={selectedRun} />

      <NominationVisualResult simulationResult={selectedRun.result} />
    </section>
  );
}

export default function SavedNominationRunsPanel({ currentUser, refreshKey }) {
  const [nominationRuns, setNominationRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedRun, setSelectedRun] = useState(null);
  const [loadingDetailId, setLoadingDetailId] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadNominationRuns() {
    try {
      setLoading(true);
      setErrorMessage("");

      const params = {};

      if (currentUser?.role === "SUPER_ADMIN") {
        params.portId = currentUser?.port?._id || DEFAULT_PREVIEW_PORT_ID;
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      const result = await getNominationRuns(params);

      if (!result.success) {
        throw new Error(result.message || "No se pudieron cargar nombramientos");
      }

      setNominationRuns(result.data || []);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error cargando nombramientos guardados"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNominationRuns();
  }, [refreshKey, statusFilter]);

  async function handleView(nominationRun) {
    try {
      setLoadingDetailId(nominationRun._id);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await getNominationRunById(nominationRun._id);

      if (!result.success) {
        throw new Error(result.message || "No se pudo cargar el detalle");
      }

      setSelectedRun(result.data);
    } catch (error) {
      setSelectedRun(null);
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error cargando detalle del nombramiento"
      );
    } finally {
      setLoadingDetailId(null);
    }
  }

  async function handlePublish(nominationRun) {
    const confirmed = window.confirm(
      `¿Seguro que quieres publicar el nombramiento ${nominationRun.windowName} del ${formatDate(
        nominationRun.workDate
      )}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSavingId(nominationRun._id);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await publishNominationRun(nominationRun._id);

      if (!result.success) {
        throw new Error(result.message || "No se pudo publicar el nombramiento");
      }

      setSuccessMessage("Nombramiento publicado correctamente");

      if (selectedRun?._id === nominationRun._id) {
        setSelectedRun(result.data);
      }

      await loadNominationRuns();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error publicando nombramiento"
      );
    } finally {
      setSavingId(null);
    }
  }

  async function handleCancel(nominationRun) {
    const confirmed = window.confirm(
      `¿Seguro que quieres anular el nombramiento ${nominationRun.windowName} del ${formatDate(
        nominationRun.workDate
      )}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSavingId(nominationRun._id);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await cancelNominationRun(nominationRun._id);

      if (!result.success) {
        throw new Error(result.message || "No se pudo anular el nombramiento");
      }

      setSuccessMessage("Nombramiento anulado correctamente");

      if (selectedRun?._id === nominationRun._id) {
        setSelectedRun(null);
      }

      await loadNominationRuns();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error anulando nombramiento"
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="mb-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <h2 className="text-xl font-black text-slate-900">
                    Nombramientos guardados
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Borradores y nombramientos publicados generados desde la simulación.
                </p>
            </div>

            <button
                type="button"
                onClick={loadNominationRuns}
                className="rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-700 hover:bg-slate-200"
            >
                Actualizar lista
            </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => {
                const isActive = statusFilter === filter.value;

                return (
                    <button
                        key={filter.value || "ALL"}
                        type="button"
                        onClick={() => setStatusFilter(filter.value)}
                        className={`rounded-2xl px-4 py-2 text-sm font-black ${
                            isActive
                                ? "bg-slate-950 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                    >
                        {filter.label}
                    </button>
                );
            })}
        </div>
      </div>

      {errorMessage && (
        <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="m-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700">
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="p-6 font-bold text-slate-500">
          Cargando nombramientos guardados...
        </div>
      ) : nominationRuns.length === 0 ? (
        <div className="p-6 text-slate-500">
          Todavía no hay nombramientos guardados.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">Fecha</th>
                <th className="px-5 py-4">Ventana</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Estado operativo</th>
                <th className="px-5 py-4">Resumen</th>
                <th className="px-5 py-4">Creado por</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {nominationRuns.map((nominationRun) => {
                const isSaving = savingId === nominationRun._id;
                const isLoadingDetail = loadingDetailId === nominationRun._id;
                const canPublish =
                  nominationRun.status === "DRAFT" &&
                  nominationRun.operationalStatus !== "INVALIDATED";
                const canCancel = nominationRun.status !== "CLOSED";

                return (
                  <tr
                    key={nominationRun._id}
                    className={`border-t border-slate-100 ${
                      nominationRun.operationalStatus === "NEEDS_REVIEW"
                        ? "bg-amber-50"
                        : selectedRun?._id === nominationRun._id
                        ? "bg-slate-50"
                        : "bg-white"
                    }`}
                  >
                    <td className="px-5 py-4 font-black text-slate-900">
                      {formatDate(nominationRun.workDate)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-black text-slate-900">
                        {nominationRun.windowName}
                      </div>
                      <div className="text-xs font-bold text-slate-500">
                        {nominationRun.windowCode}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={nominationRun.status} />
                    </td>

                    <td className="px-5 py-4">
                      <OperationalStatusBadge
                        operationalStatus={nominationRun.operationalStatus}
                      />
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      <div className="font-bold">
                        Puestos: {nominationRun.summary?.positionsToCover || 0}
                      </div>
                      <div>
                        Asignados:{" "}
                        {nominationRun.summary?.assignedPositions || 0} · Sin
                        cubrir:{" "}
                        {nominationRun.summary?.uncoveredPositions || 0}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      <div className="font-bold">
                        {nominationRun.createdBy?.name || "-"}
                      </div>
                      <div className="text-xs">
                        {formatDateTime(nominationRun.createdAt)}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={isLoadingDetail}
                          onClick={() => handleView(nominationRun)}
                          className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isLoadingDetail ? "Abriendo..." : "Ver"}
                        </button>

                        <button
                          type="button"
                          disabled={isSaving || !canPublish}
                          onClick={() => handlePublish(nominationRun)}
                          className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Publicar
                        </button>

                        <button
                          type="button"
                          disabled={isSaving || !canCancel}
                          onClick={() => handleCancel(nominationRun)}
                          className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Anular
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SelectedNominationRunDetail
        selectedRun={selectedRun}
        onClose={() => setSelectedRun(null)}
        onPublish={handlePublish}
        onCancel={handleCancel}
        savingId={savingId}
      />
    </section>
  );
}
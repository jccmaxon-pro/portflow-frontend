import React, { useEffect, useMemo, useState } from "react";
import { simulateAppointmentBlock } from "../../api/appointmentSimulationApi";
import NominationVisualResult from "../../components/nomination/NominationVisualResult";
import SavedNominationRunsPanel from "../../components/nomination/SavedNominationRunsPanel";
import { createDraftNominationRun } from "../../api/nominationRunApi";
import {
  cancelWorkRequest,
  confirmWorkRequest,
  getNominationPreview,
  getWorkRequests,
  markWorkRequestAsChangeable,
  rejectWorkRequest,
  submitWorkRequest,
} from "../../api/workRequestsApi";

const STATUS_LABELS = {
  DRAFT: "Borrador",
  SUBMITTED: "Enviada",
  REVIEWED: "Revisada",
  CONFIRMED: "Confirmada",
  CHANGEABLE: "Susceptible",
  REJECTED: "Rechazada",
  CANCELLED: "Anulada",
};

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "SUBMITTED", label: "Enviadas" },
  { value: "CONFIRMED", label: "Confirmadas" },
  { value: "CHANGEABLE", label: "Susceptibles" },
  { value: "REJECTED", label: "Rechazadas" },
  { value: "CANCELLED", label: "Anuladas" },
];

const SHIFT_OPTIONS = [
  { value: "", label: "Todos los turnos" },
  { value: "02_08", label: "02 A 08" },
  { value: "08_14", label: "08 A 14" },
  { value: "08_18", label: "08 A 18" },
  { value: "14_20", label: "14 A 20" },
  { value: "18_24", label: "18 A 24" },
  { value: "20_02", label: "20 A 02" },
];

const NOMINATION_WINDOWS = [
  {
    value: "EARLY_02_14",
    label: "Nombramiento corrido 02 a 14",
    description: "Incluye 02_08, 08_18 y 08_14",
  },
  {
    value: "AFTERNOON_14_20",
    label: "Nombramiento 14 a 20",
    description: "Incluye 14_20",
  },
  {
    value: "NIGHT_18_02",
    label: "Nombramiento noche 18/20 a 02",
    description: "Incluye 18_24 y 20_02",
  },
];

const DEFAULT_PREVIEW_PORT_ID = "69f210fe5417a1641d23188d";

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

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "Sin estado";
}

function getShiftSortOrder(shiftCode) {
  const order = {
    "02_08": 1,
    "08_14": 2,
    "08_18": 3,
    "14_20": 4,
    "18_24": 5,
    "20_02": 6,
  };

  return order[shiftCode] || 999;
}

function StatusBadge({ status }) {
  const baseClass =
    "inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide";

  const statusClass =
    status === "CONFIRMED"
      ? "bg-emerald-100 text-emerald-800"
      : status === "CHANGEABLE"
      ? "bg-amber-100 text-amber-800"
      : status === "REJECTED"
      ? "bg-red-100 text-red-800"
      : status === "CANCELLED"
      ? "bg-slate-200 text-slate-600"
      : "bg-blue-100 text-blue-800";

  return (
    <span className={`${baseClass} ${statusClass}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function canConfirm(workRequest) {
  return ["SUBMITTED", "REVIEWED"].includes(workRequest?.status);
}

function canMarkChangeable(workRequest) {
  return ["SUBMITTED", "REVIEWED"].includes(workRequest?.status);
}

function canSubmit(workRequest) {
  return ["DRAFT", "REJECTED", "CONFIRMED", "CHANGEABLE"].includes(
    workRequest?.status
  );
}

function canReject(workRequest) {
  return !["REJECTED", "CANCELLED"].includes(workRequest?.status);
}

function canCancel(workRequest) {
  return workRequest?.status !== "CANCELLED";
}

function RequestMiniTable({ title, requests, emptyText }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-black text-slate-900">{title}</h3>
      </div>

      {requests.length === 0 ? (
        <div className="p-5 text-sm text-slate-500">{emptyText}</div>
      ) : (
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">Turno</th>
                <th className="px-5 py-4">Empresa</th>
                <th className="px-5 py-4">Barco</th>
                <th className="px-5 py-4">Muelle</th>
                <th className="px-5 py-4">Trabajo</th>
                <th className="px-5 py-4">Estado</th>
              </tr>
            </thead>

            <tbody>
              {requests.map((workRequest) => (
                <tr key={workRequest._id} className="border-t border-slate-100">
                  <td className="px-5 py-4 text-sm font-black text-slate-800">
                    {workRequest.shiftCode}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-black text-slate-900">
                      {workRequest.requestingCompany?.name ||
                        workRequest.requestingCompanyName ||
                        "-"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {workRequest.requestingCompany?.code || ""}
                    </div>
                  </td>

                  <td className="px-5 py-4 font-black text-slate-900">
                    {workRequest.shipName}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-700">
                    <div className="font-bold">
                      {workRequest.berth?.name || "-"}
                    </div>
                    <div className="text-xs text-slate-500">
                      Orden {workRequest.berth?.order || "-"}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-black text-slate-900">
                      {workRequest.taskName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {workRequest.taskCode}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={workRequest.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SimulationSummaryCard({ label, value, tone = "slate" }) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "red"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-white text-slate-900";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value ?? 0}</p>
    </div>
  );
}

function AppointmentSimulationResult({ simulationResult }) {
  if (!simulationResult) {
    return null;
  }

  const summary = simulationResult.summary || {};
  const assignments = simulationResult.assignments || [];
  const uncoveredPositions = simulationResult.uncoveredPositions || [];
  const byPosition = summary.byPosition || {};

  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const key = [
      assignment.nominationWindowLabel || assignment.nominationWindowCode || "Sin ventana",
      assignment.shiftCode || "Sin turno",
      assignment.shipName || "Sin barco",
      assignment.berth?.name || "Sin muelle",
    ].join("|");

    if (!acc[key]) {
      acc[key] = {
        key,
        windowLabel:
          assignment.nominationWindowLabel ||
          assignment.nominationWindowCode ||
          "Sin ventana",
        shiftCode: assignment.shiftCode || "-",
        shipName: assignment.shipName || "-",
        berthName: assignment.berth?.name || "-",
        items: [],
      };
    }

    acc[key].items.push(assignment);

    return acc;
  }, {});

  const groupedList = Object.values(groupedAssignments);

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-sm font-black uppercase tracking-wide text-slate-400">
          Resultado del nombramiento
        </p>
        <h3 className="mt-1 text-2xl font-black">
          Simulación generada
        </h3>
        <p className="mt-2 text-sm text-slate-300">
          Estrategia: {summary.strategyName || summary.strategyCode || "-"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SimulationSummaryCard
          label="Puestos a cubrir"
          value={summary.positionsToCover}
        />

        <SimulationSummaryCard
          label="Asignados"
          value={summary.assignedPositions}
          tone="green"
        />

        <SimulationSummaryCard
          label="Sin cubrir"
          value={summary.uncoveredPositions}
          tone={summary.uncoveredPositions > 0 ? "red" : "green"}
        />

        <SimulationSummaryCard
          label="Trabajos usados"
          value={summary.workRequests}
          tone="amber"
        />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-black text-slate-900">
            Resumen por puesto
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">Puesto</th>
                <th className="px-5 py-4">Solicitados</th>
                <th className="px-5 py-4">Asignados</th>
                <th className="px-5 py-4">Sin cubrir</th>
              </tr>
            </thead>

            <tbody>
              {Object.entries(byPosition).map(([positionCode, item]) => (
                <tr key={positionCode} className="border-t border-slate-100">
                  <td className="px-5 py-4 font-black text-slate-900">
                    {positionCode}
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-700">
                    {item.requested || 0}
                  </td>
                  <td className="px-5 py-4 font-bold text-emerald-700">
                    {item.assigned || 0}
                  </td>
                  <td className="px-5 py-4 font-bold text-red-700">
                    {item.uncovered || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {uncoveredPositions.length > 0 && (
        <div className="rounded-3xl border border-red-200 bg-red-50 shadow-sm">
          <div className="border-b border-red-200 px-5 py-4">
            <h3 className="font-black text-red-800">
              Puestos sin cubrir
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="text-left text-xs font-black uppercase tracking-wide text-red-700">
                  <th className="px-5 py-4">Turno</th>
                  <th className="px-5 py-4">Barco</th>
                  <th className="px-5 py-4">Muelle</th>
                  <th className="px-5 py-4">Puesto</th>
                  <th className="px-5 py-4">Unidad</th>
                </tr>
              </thead>

              <tbody>
                {uncoveredPositions.map((position, index) => (
                  <tr key={`${position.workRequestId}-${position.positionCode}-${position.unitNumber}-${index}`} className="border-t border-red-100">
                    <td className="px-5 py-4 font-bold text-red-900">
                      {position.shiftCode}
                    </td>
                    <td className="px-5 py-4 font-bold text-red-900">
                      {position.shipName}
                    </td>
                    <td className="px-5 py-4 text-red-800">
                      {position.berth?.name || "-"}
                    </td>
                    <td className="px-5 py-4 font-black text-red-900">
                      {position.positionCode}
                    </td>
                    <td className="px-5 py-4 text-red-800">
                      {position.unitNumber}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-black text-slate-900">
            Nombramiento generado
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Agrupado por ventana, turno, barco y muelle.
          </p>
        </div>

        <div className="space-y-5 p-5">
          {groupedList.length === 0 ? (
            <div className="text-sm text-slate-500">
              No hay asignaciones generadas.
            </div>
          ) : (
            groupedList.map((group) => (
              <div
                key={group.key}
                className="overflow-hidden rounded-3xl border border-slate-200"
              >
                <div className="bg-slate-50 px-5 py-4">
                  <div className="font-black text-slate-900">
                    {group.windowLabel} · {group.shiftCode}
                  </div>
                  <div className="text-sm text-slate-500">
                    {group.shipName} · {group.berthName}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse">
                    <thead>
                      <tr className="bg-white text-left text-xs font-black uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-4">Puesto</th>
                        <th className="px-5 py-4">Unidad</th>
                        <th className="px-5 py-4">Trabajador</th>
                        <th className="px-5 py-4">Tipo</th>
                        <th className="px-5 py-4">Motivo</th>
                      </tr>
                    </thead>

                    <tbody>
                      {group.items.map((assignment, index) => (
                        <tr
                          key={`${assignment.workRequestId}-${assignment.positionCode}-${assignment.unitNumber}-${assignment.workerCode}-${index}`}
                          className="border-t border-slate-100"
                        >
                          <td className="px-5 py-4 font-black text-slate-900">
                            {assignment.positionCode}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-slate-700">
                            {assignment.unitNumber}
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-black text-slate-900">
                              {assignment.workerCode} · {assignment.workerName}
                            </div>
                            <div className="text-xs text-slate-500">
                              {assignment.rotationListCode || assignment.mainProfessionalGroup || ""}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                              {assignment.coverageType || assignment.phase || "-"}
                            </span>
                          </td>

                          <td className="max-w-sm px-5 py-4 text-sm text-slate-600">
                            {assignment.reason || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function NominatorWorkRequestsPage({ currentUser }) {
  const [workRequests, setWorkRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [filters, setFilters] = useState({
    workDate: "",
    status: "",
    shiftCode: "",
  });

  const [previewFilters, setPreviewFilters] = useState({
    workDate: getTodayInputValue(),
    windowCode: "EARLY_02_14",
  });

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedDraftRun, setSavedDraftRun] = useState(null);
  const [savedRunsRefreshKey, setSavedRunsRefreshKey] = useState(0);

  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const filteredWorkRequests = useMemo(() => {
    return [...workRequests]
      .filter((workRequest) => {
        if (filters.status && workRequest.status !== filters.status) {
          return false;
        }

        if (filters.shiftCode && workRequest.shiftCode !== filters.shiftCode) {
          return false;
        }

        if (
          filters.workDate &&
          formatDate(workRequest.workDate) !== filters.workDate
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.workDate).getTime();
        const dateB = new Date(b.workDate).getTime();

        if (dateA !== dateB) {
          return dateA - dateB;
        }

        const shiftCompare =
          getShiftSortOrder(a.shiftCode) - getShiftSortOrder(b.shiftCode);

        if (shiftCompare !== 0) {
          return shiftCompare;
        }

        const berthA = Number(a.berth?.order || 999);
        const berthB = Number(b.berth?.order || 999);

        if (berthA !== berthB) {
          return berthA - berthB;
        }

        return String(a.shipName || "").localeCompare(String(b.shipName || ""));
      });
  }, [workRequests, filters]);

  const groupedByDate = useMemo(() => {
    const groups = [];

    for (const workRequest of filteredWorkRequests) {
      const dateLabel = formatDate(workRequest.workDate);

      let group = groups.find((item) => item.dateLabel === dateLabel);

      if (!group) {
        group = {
          dateLabel,
          items: [],
        };

        groups.push(group);
      }

      group.items.push(workRequest);
    }

    return groups.sort((a, b) => {
      const dateA = new Date(a.items[0]?.workDate);
      const dateB = new Date(b.items[0]?.workDate);

      return dateB - dateA;
    });
  }, [filteredWorkRequests]);

  const summary = useMemo(() => {
    return workRequests.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      {
        total: 0,
      }
    );
  }, [workRequests]);

  async function loadWorkRequests() {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getWorkRequests();

      if (!result.success) {
        throw new Error(result.message || "No se pudieron cargar las solicitudes");
      }

      setWorkRequests(result.data || []);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error cargando solicitudes"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadNominationPreview() {
    try {
      setPreviewLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!previewFilters.workDate) {
        throw new Error("Debes seleccionar fecha para preparar el nombramiento");
      }

      if (!previewFilters.windowCode) {
        throw new Error("Debes seleccionar ventana de nombramiento");
      }

      const params = {
        workDate: previewFilters.workDate,
        windowCode: previewFilters.windowCode,
      };

      if (currentUser?.role === "SUPER_ADMIN") {
        params.portId = currentUser?.port?._id || DEFAULT_PREVIEW_PORT_ID;
      }

      const result = await getNominationPreview(params);

      if (!result.success) {
        throw new Error(
          result.message || "No se pudo preparar el preview de nombramiento"
        );
      }

      setPreviewData(result.data);
      setSimulationResult(null);
      setSavedDraftRun(null);
    } catch (error) {
      setPreviewData(null);
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error preparando preview"
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  function buildBlockItemsFromPreview(preview) {
    if (!preview?.workDate || !Array.isArray(preview?.includedShiftCodes)) {
      return [];
    }

    return preview.includedShiftCodes.map((shiftCode) => ({
      workDate: preview.workDate,
      shiftCode,
    }));
  }

  function getSimulationPortId() {
    if (previewData?.portId) {
      return previewData.portId;
    }

    if (currentUser?.port?._id) {
      return currentUser.port._id;
    }

    /**
     * Provisional para SUPER_ADMIN mientras no tenemos selector de puerto.
     * Debe coincidir con el puerto de Málaga.
     */
    return DEFAULT_PREVIEW_PORT_ID;
  }

  async function handleSimulateNomination() {
    try {
      setSimulationLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      setSimulationResult(null);

      if (!previewData) {
        throw new Error("Primero debes preparar el nombramiento");
      }

      if (!previewData.includedRequests || previewData.includedRequests.length === 0) {
        throw new Error("No hay solicitudes incluidas para simular");
      }

      const portId = getSimulationPortId();
      const blockItems = buildBlockItemsFromPreview(previewData);

      if (!portId) {
        throw new Error("No se ha podido determinar el puerto");
      }

      if (blockItems.length === 0) {
        throw new Error("No se han podido preparar los turnos del bloque");
      }

      const result = await simulateAppointmentBlock({
        portId,
        blockItems,
        doorStartByRotationList: {},
        simulationOptions: {
          source: "NOMINATION_PREVIEW",
          windowCode: previewData.windowCode,
          windowName: previewData.windowName,
          allowedWorkRequestStatuses: ["CONFIRMED", "CHANGEABLE"],
        },
      });

      if (!result.success) {
        throw new Error(result.message || "No se pudo simular el nombramiento");
      }

      setSimulationResult(result.data);
      setSuccessMessage("Simulación de nombramiento generada correctamente");
    } catch (error) {
      setSimulationResult(null);
      setSavedDraftRun(null);
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error simulando nombramiento"
      );
    } finally {
      setSimulationLoading(false);
    }
  }

  async function handleSaveDraftNominationRun() {
    try {
      setSavingDraft(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!previewData) {
        throw new Error("Primero debes preparar el nombramiento");
      }

      if (!simulationResult) {
        throw new Error("Primero debes simular el nombramiento");
      }

      const portId = getSimulationPortId();

      if (!portId) {
        throw new Error("No se ha podido determinar el puerto");
      }

      const blockItems = buildBlockItemsFromPreview(previewData);

      if (blockItems.length === 0) {
        throw new Error("No se han podido preparar los turnos del bloque");
      }

      const usedWorkRequests = (previewData.includedRequests || [])
        .map((workRequest) => workRequest._id)
        .filter(Boolean);

      const result = await createDraftNominationRun({
        portId,
        workDate: previewData.workDate,
        windowCode: previewData.windowCode,
        windowName: previewData.windowName,
        source: "NOMINATION_PREVIEW",
        blockItems,
        usedWorkRequests,
        result: simulationResult,
      });

      if (!result.success) {
        throw new Error(
          result.message || "No se pudo guardar el nombramiento como borrador"
        );
      }

      setSavedDraftRun(result.data);
      setSuccessMessage("Nombramiento guardado como borrador correctamente");
      setSavedRunsRefreshKey((currentValue) => currentValue + 1);
    } catch (error) {
      setSavedDraftRun(null);
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error guardando borrador de nombramiento"
      );
    } finally {
      setSavingDraft(false);
    }
  }

  useEffect(() => {
    loadWorkRequests();
  }, []);

  function updateFilter(fieldName, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [fieldName]: value,
    }));
  }

  function updatePreviewFilter(fieldName, value) {
    setPreviewFilters((currentFilters) => ({
      ...currentFilters,
      [fieldName]: value,
    }));
  }

  async function runAction({
    workRequest,
    action,
    successText,
    confirmText,
  }) {
    if (confirmText) {
      const confirmed = window.confirm(confirmText);

      if (!confirmed) {
        return;
      }
    }

    try {
      setSavingId(workRequest._id);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await action(workRequest._id);

      if (!result.success) {
        throw new Error(result.message || "No se pudo realizar la acción");
      }

      setSuccessMessage(successText);
      await loadWorkRequests();

      if (previewData) {
        await loadNominationPreview();
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error realizando acción"
      );
    } finally {
      setSavingId(null);
    }
  }

  async function handleReject() {
    if (!rejectingRequest) {
      return;
    }

    try {
      setSavingId(rejectingRequest._id);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await rejectWorkRequest(
        rejectingRequest._id,
        rejectionReason
      );

      if (!result.success) {
        throw new Error(result.message || "No se pudo rechazar la solicitud");
      }

      setSuccessMessage("Solicitud rechazada correctamente");
      setRejectingRequest(null);
      setRejectionReason("");

      await loadWorkRequests();

      if (previewData) {
        await loadNominationPreview();
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error rechazando solicitud"
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-100 p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-500">
              Panel nominadora
            </p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">
              Solicitudes de trabajo recibidas
            </h1>
            <p className="mt-2 text-slate-600">
              {currentUser?.port?.name || "Puerto"} · revisión, confirmación,
              susceptibles y preparación del nombramiento.
            </p>
          </div>

          <button
            type="button"
            onClick={loadWorkRequests}
            className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow hover:bg-slate-700"
          >
            Actualizar
          </button>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700">
            {successMessage}
          </div>
        )}

        <SavedNominationRunsPanel
          currentUser={currentUser}
          refreshKey={savedRunsRefreshKey}
        />

        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Total
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {summary.total || 0}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Enviadas
            </p>
            <p className="mt-2 text-3xl font-black text-blue-700">
              {summary.SUBMITTED || 0}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Firmes
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-700">
              {summary.CONFIRMED || 0}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Susceptibles
            </p>
            <p className="mt-2 text-3xl font-black text-amber-700">
              {summary.CHANGEABLE || 0}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Rechazadas
            </p>
            <p className="mt-2 text-3xl font-black text-red-700">
              {summary.REJECTED || 0}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-black text-slate-900">
              Preparar nombramiento
            </h2>
            <p className="text-sm text-slate-500">
              Selecciona fecha y ventana. Aquí verás qué solicitudes firmes o
              susceptibles entran realmente en ese nombramiento.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_2fr_1fr]">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Fecha
              </span>
              <input
                type="date"
                value={previewFilters.workDate}
                onChange={(event) =>
                  updatePreviewFilter("workDate", event.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Ventana
              </span>
              <select
                value={previewFilters.windowCode}
                onChange={(event) =>
                  updatePreviewFilter("windowCode", event.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
              >
                {NOMINATION_WINDOWS.map((windowItem) => (
                  <option key={windowItem.value} value={windowItem.value}>
                    {windowItem.label} · {windowItem.description}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={loadNominationPreview}
                disabled={previewLoading}
                className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow hover:bg-slate-700 disabled:opacity-60"
              >
                {previewLoading ? "Preparando..." : "Preparar"}
              </button>
            </div>
          </div>

          {previewData && (
            <div className="mt-6 space-y-5">
              <div className="rounded-3xl bg-slate-950 p-5 text-white">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-wide text-slate-400">
                      Preview de nombramiento
                    </p>
                    <h3 className="mt-1 text-2xl font-black">
                      {previewData.windowName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-300">
                      Fecha: {previewData.workDate} · Turnos:{" "}
                      {previewData.includedShiftCodes?.join(", ")}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 px-5 py-4 text-right">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-300">
                      Solicitudes que entran
                    </p>
                    <p className="text-4xl font-black">
                      {previewData.summary?.included || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Total fecha
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-900">
                    {previewData.summary?.totalRequestsForDate || 0}
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-xs font-black uppercase text-emerald-700">
                    Incluidas
                  </p>
                  <p className="mt-2 text-3xl font-black text-emerald-800">
                    {previewData.summary?.included || 0}
                  </p>
                </div>

                <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
                  <p className="text-xs font-black uppercase text-blue-700">
                    Pendientes
                  </p>
                  <p className="mt-2 text-3xl font-black text-blue-800">
                    {previewData.summary?.pending || 0}
                  </p>
                </div>

                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-xs font-black uppercase text-amber-700">
                    Susceptibles
                  </p>
                  <p className="mt-2 text-3xl font-black text-amber-800">
                    {previewData.summary?.changeable || 0}
                  </p>
                </div>

                <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
                  <p className="text-xs font-black uppercase text-red-700">
                    Rechaz./Anul.
                  </p>
                  <p className="mt-2 text-3xl font-black text-red-800">
                    {(previewData.summary?.rejected || 0) +
                      (previewData.summary?.cancelled || 0)}
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Fuera ventana
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-800">
                    {previewData.summary?.outOfWindow || 0}
                  </p>
                </div>
              </div>

              <RequestMiniTable
                title="Solicitudes que SÍ entran en este nombramiento"
                requests={previewData.includedRequests || []}
                emptyText="No hay solicitudes firmes o susceptibles para esta ventana."
              />

              <RequestMiniTable
                title="Pendientes no incluidas"
                requests={previewData.excludedRequests?.pending || []}
                emptyText="No hay solicitudes pendientes para esta fecha/ventana."
              />

              <RequestMiniTable
                title="Rechazadas o anuladas"
                requests={[
                  ...(previewData.excludedRequests?.rejected || []),
                  ...(previewData.excludedRequests?.cancelled || []),
                ]}
                emptyText="No hay solicitudes rechazadas o anuladas para esta fecha."
              />
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Simular nombramiento
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Se usará solo el trabajo incluido arriba: solicitudes CONFIRMED y
                      CHANGEABLE de esta ventana.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      simulationLoading ||
                      !previewData.includedRequests ||
                      previewData.includedRequests.length === 0
                    }
                    onClick={handleSimulateNomination}
                    className="rounded-2xl bg-slate-950 px-6 py-3 font-black text-white shadow hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {simulationLoading
                      ? "Simulando..."
                      : "Simular nombramiento con estas solicitudes"}
                  </button>
                </div>
              </div>

              <NominationVisualResult simulationResult={simulationResult} />

              {simulationResult && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        Guardar nombramiento
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Guarda esta simulación como borrador para poder revisarla, publicarla
                        o recuperarla más adelante.
                      </p>

                      {savedDraftRun && (
                        <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                          Borrador guardado correctamente · Estado: {savedDraftRun.status}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={savingDraft || Boolean(savedDraftRun)}
                      onClick={handleSaveDraftNominationRun}
                      className="rounded-2xl bg-emerald-600 px-6 py-3 font-black text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingDraft
                        ? "Guardando..."
                        : savedDraftRun
                        ? "Borrador guardado"
                        : "Guardar borrador"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-900">
              Filtros de revisión
            </h2>
            <p className="text-sm text-slate-500">
              Esta tabla sirve para revisar y cambiar estados de solicitudes.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Fecha
              </span>
              <input
                type="date"
                value={filters.workDate}
                onChange={(event) =>
                  updateFilter("workDate", event.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Estado
              </span>
              <select
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
              >
                {STATUS_FILTERS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Turno
              </span>
              <select
                value={filters.shiftCode}
                onChange={(event) =>
                  updateFilter("shiftCode", event.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
              >
                {SHIFT_OPTIONS.map((shift) => (
                  <option key={shift.value} value={shift.value}>
                    {shift.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    workDate: "",
                    status: "",
                    shiftCode: "",
                  })
                }
                className="w-full rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-700 hover:bg-slate-200"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-black text-slate-900">
              Solicitudes recibidas
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Mostrando {filteredWorkRequests.length} solicitud/es filtradas. Desplaza dentro de la ventana para ver más.
            </p>
          </div>

          {loading ? (
            <div className="p-8 font-bold text-slate-600">
              Cargando solicitudes...
            </div>
          ) : filteredWorkRequests.length === 0 ? (
            <div className="p-8 text-slate-600">
              No hay solicitudes con los filtros actuales.
            </div>
          ) : (
            <div className="max-h-[720px] space-y-6 overflow-y-auto p-5">
              {groupedByDate.map((group) => (
                <div
                  key={group.dateLabel}
                  className="overflow-hidden rounded-3xl border border-slate-200"
                >
                  <div className="bg-slate-50 px-5 py-4">
                    <h3 className="text-lg font-black text-slate-900">
                      {group.dateLabel}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {group.items.length} solicitud/es
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1180px] border-collapse">
                      <thead>
                        <tr className="bg-white text-left text-xs font-black uppercase tracking-wide text-slate-500">
                          <th className="px-5 py-4">Turno</th>
                          <th className="px-5 py-4">Empresa</th>
                          <th className="px-5 py-4">Barco</th>
                          <th className="px-5 py-4">Muelle</th>
                          <th className="px-5 py-4">Trabajo</th>
                          <th className="px-5 py-4">Estado</th>
                          <th className="px-5 py-4">Observaciones</th>
                          <th className="px-5 py-4 text-right">Acciones</th>
                        </tr>
                      </thead>

                      <tbody>
                        {group.items.map((workRequest) => {
                          const isSaving = savingId === workRequest._id;

                          return (
                            <tr
                              key={workRequest._id}
                              className="border-t border-slate-100"
                            >
                              <td className="px-5 py-4 text-sm font-black text-slate-800">
                                {workRequest.shiftCode}
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-black text-slate-900">
                                  {workRequest.requestingCompany?.name ||
                                    workRequest.requestingCompanyName ||
                                    "-"}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {workRequest.requestingCompany?.code || ""}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-black text-slate-900">
                                  {workRequest.shipName}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {formatDate(workRequest.workDate)}
                                </div>
                              </td>

                              <td className="px-5 py-4 text-sm text-slate-700">
                                <div className="font-bold">
                                  {workRequest.berth?.name || "-"}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Orden {workRequest.berth?.order || "-"}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-black text-slate-900">
                                  {workRequest.taskName}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {workRequest.taskCode}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <StatusBadge status={workRequest.status} />
                              </td>

                              <td className="max-w-xs px-5 py-4 text-sm text-slate-600">
                                <div className="line-clamp-2">
                                  {workRequest.observations || "-"}
                                </div>
                                {workRequest.rejectionReason && (
                                  <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                                    Motivo: {workRequest.rejectionReason}
                                  </div>
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <button
                                    type="button"
                                    disabled={
                                      isSaving || !canConfirm(workRequest)
                                    }
                                    onClick={() =>
                                      runAction({
                                        workRequest,
                                        action: confirmWorkRequest,
                                        successText:
                                          "Solicitud aceptada como trabajo firme",
                                      })
                                    }
                                    className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    Aceptar firme
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      isSaving ||
                                      !canMarkChangeable(workRequest)
                                    }
                                    onClick={() =>
                                      runAction({
                                        workRequest,
                                        action: markWorkRequestAsChangeable,
                                        successText:
                                          "Solicitud aceptada como susceptible de cambio",
                                      })
                                    }
                                    className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    Aceptar susceptible
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isSaving || !canSubmit(workRequest)}
                                    onClick={() =>
                                      runAction({
                                        workRequest,
                                        action: submitWorkRequest,
                                        successText:
                                          "Solicitud reabierta como enviada",
                                      })
                                    }
                                    className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    Reabrir
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isSaving || !canReject(workRequest)}
                                    onClick={() => {
                                      setRejectingRequest(workRequest);
                                      setRejectionReason("");
                                    }}
                                    className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    Rechazar
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isSaving || !canCancel(workRequest)}
                                    onClick={() =>
                                      runAction({
                                        workRequest,
                                        action: cancelWorkRequest,
                                        successText:
                                          "Solicitud anulada correctamente",
                                        confirmText: `¿Seguro que quieres anular la solicitud de ${workRequest.shipName} ${workRequest.shiftCode}?`,
                                      })
                                    }
                                    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
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
                </div>
              ))}
            </div>
          )}
        </div>

        {rejectingRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
              <h2 className="text-xl font-black text-slate-900">
                Rechazar solicitud
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {rejectingRequest.shipName} ·{" "}
                {formatDate(rejectingRequest.workDate)} ·{" "}
                {rejectingRequest.shiftCode}
              </p>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Motivo del rechazo
                </span>
                <textarea
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  className="min-h-32 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                  placeholder="Ejemplo: fuera de plazo, datos incompletos, duplicada..."
                />
              </label>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingRequest(null);
                    setRejectionReason("");
                  }}
                  className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700 hover:bg-slate-200"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  disabled={savingId === rejectingRequest._id}
                  onClick={handleReject}
                  className="rounded-2xl bg-red-600 px-5 py-3 font-black text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {savingId === rejectingRequest._id
                    ? "Rechazando..."
                    : "Rechazar solicitud"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
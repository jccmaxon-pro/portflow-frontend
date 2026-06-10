import React, { useEffect, useRef, useState } from "react";
import {
  cancelNominationRun,
  confirmFullChangeableWorkRequest,
  getNominationRunById,
  getNominationRuns,
  publishNominationRun,
  cancelChangeableWorkRequest,
  resetChangeableWorkRequestDecision,
  reduceChangeableWorkRequest,
  changeShiftChangeableWorkRequest,
  prepareChangeableDefinitivePlan,
  prepareChangeableDefinitiveSimulation,
  publishChangeableDefinitiveNomination,
  getReplacementCandidates,
  replaceAssignmentManually,
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

const getAlternativeChangeableShiftCode = (shiftCode) => {
  const safeShiftCode = String(shiftCode || "").trim().toUpperCase();

  if (safeShiftCode === "08_14") {
    return "08_18";
  }

  if (safeShiftCode === "08_18") {
    return "08_14";
  }

  return "";
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
  CONFIRMED: "Confirmado completo",
  CONFIRMED_FULL: "Confirmado completo",
  CANCELLED: "Trabajo cancelado",
  REDUCED: "Trabajo reducido",
  MODIFIED: "Horario modificado",
  SHIFT_CHANGED: "Horario Cambiado",
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
      : normalizedStatus === "MODIFIED" || normalizedStatus === "SHIFT_CHANGED"
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

function normalizeId(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value._id) {
    return String(value._id);
  }

  return String(value);
}

function getChangeableDecisionForWorkRequest(nominationRun, workRequest) {
  const decisions = nominationRun?.changeableDecisions || [];
  const workRequestId = getWorkRequestId(workRequest);

  if (!Array.isArray(decisions) || !workRequestId) {
    return null;
  }

  return (
    decisions.find((decision) => {
      return normalizeId(decision.workRequestId) === normalizeId(workRequestId);
    }) || null
  );
}

function getEffectiveChangeableStatus({ nominationRun, workRequest }) {
  const decision = getChangeableDecisionForWorkRequest(
    nominationRun,
    workRequest
  );

  if (decision?.status === "CONFIRMED_FULL") {
    return "CONFIRMED";
  }

  if (decision?.status === "CANCELLED") {
    return "CANCELLED";
  }

  if (decision?.status === "REDUCED") {
    return "REDUCED";
  }

  if (decision?.status === "MODIFIED") {
    return "MODIFIED";
  }

  if (decision?.status === "SHIFT_CHANGED") {
    return "SHIFT_CHANGED";
  }

  if (decision?.status === "PENDING") {
    return "PENDING_CONFIRMATION";
  }

  return (
    workRequest.changeableStatus ||
    workRequest.confirmationStatus ||
    "PENDING_CONFIRMATION"
  );
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

function buildChangeableDecisionSummary(nominationRun) {
  const changeableWorkRequests = getChangeableWorkRequestsFromRun(nominationRun);

  const summary = {
    total: changeableWorkRequests.length,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    reduced: 0,
    shifted: 0,
    allResolved: false,
  };

  for (const workRequest of changeableWorkRequests) {
    const status = getEffectiveChangeableStatus({
      nominationRun,
      workRequest,
    });

    if (status === "CONFIRMED" || status === "CONFIRMED_FULL") {
      summary.confirmed += 1;
      continue;
    }

    if (status === "CANCELLED") {
      summary.cancelled += 1;
      continue;
    }

    if (status === "REDUCED") {
      summary.reduced += 1;
      continue;
    }

    if (status === "SHIFT_CHANGED" || status === "MODIFIED") {
      summary.shifted += 1;
      continue;
    }

    summary.pending += 1;
  }

  summary.allResolved = summary.total > 0 && summary.pending === 0;
  return summary;
}

function buildPreparedChangeablePlan(nominationRun) {
  const changeableWorkRequests = getChangeableWorkRequestsFromRun(nominationRun);

  return changeableWorkRequests.map((workRequest) => {
    const workRequestId = getWorkRequestId(workRequest);

    const decision = getChangeableDecisionForWorkRequest(
      nominationRun,
      workRequest
    );

    const effectiveStatus = getEffectiveChangeableStatus({
      nominationRun,
      workRequest,
    });

    const assignments = getAssignmentsForWorkRequest(nominationRun, workRequest);
    const originalPositions = buildPositionCounts(assignments);

    const baseItem = {
      workRequestId,
      shipName: workRequest.shipName || "Barco sin nombre",
      berthName: getBerthName(workRequest),
      taskName: workRequest.taskName || workRequest.taskCode || "Sin tarea",
      companyName: workRequest.requestingCompanyName || "-",
      originalShiftCode: workRequest.shiftCode || "",
      finalShiftCode: workRequest.shiftCode || "",
      decisionStatus: effectiveStatus,
      actionLabel: "Pendiente",
      originalPositions,
      finalPositions: originalPositions,
      isIncludedInFinalNomination: true,
      notes: decision?.notes || "",
    };

    if (effectiveStatus === "CONFIRMED" || effectiveStatus === "CONFIRMED_FULL") {
      return {
        ...baseItem,
        actionLabel: "Se mantiene completo",
      };
    }

    if (effectiveStatus === "CANCELLED") {
      return {
        ...baseItem,
        actionLabel: "Se elimina del definitivo",
        isIncludedInFinalNomination: false,
        finalPositions: {},
      };
    }

    if (effectiveStatus === "REDUCED") {
      return {
        ...baseItem,
        actionLabel: "Se mantiene reducido",
        finalShiftCode:
          decision?.reduction?.newShiftCode ||
          decision?.newShiftCode ||
          workRequest.shiftCode ||
          "",
        finalPositions:
          decision?.reduction?.newPositions &&
          typeof decision.reduction.newPositions === "object"
            ? decision.reduction.newPositions
            : originalPositions,
        notes: decision?.reduction?.notes || decision?.notes || "",
      };
    }

    if (effectiveStatus === "SHIFT_CHANGED" || effectiveStatus === "MODIFIED") {
      return {
        ...baseItem,
        actionLabel: "Cambia de horario",
        finalShiftCode:
          decision?.newShiftCode ||
          decision?.modifiedShiftCode ||
          getAlternativeChangeableShiftCode(workRequest.shiftCode) ||
          workRequest.shiftCode ||
          "",
      };
    }

    return baseItem;
  });
}

function PreparedChangeablePlanPanel({ preparedPlan, onClose }) {
  const planItems = Array.isArray(preparedPlan)
    ? preparedPlan
    : preparedPlan?.plan || [];

  if (!Array.isArray(planItems) || planItems.length === 0) {
    return null;
  }

  const includedCount = planItems.filter(
    (item) => item.isIncludedInFinalNomination
  ).length;

  const cancelledCount = planItems.length - includedCount;

  return (
    <div className="mb-5 rounded-3xl border border-sky-300 bg-sky-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-black uppercase tracking-wide text-sky-900">
            Plan preparado para nombramiento definitivo
          </div>

          <p className="mt-2 max-w-4xl text-sm font-bold leading-6 text-sky-900">
            {preparedPlan?.message ||
              "Esto todavía no renombra ni guarda snapshots. Solo muestra cómo quedaría la ventana aplicando las decisiones tomadas sobre los trabajos susceptibles."}
          </p>
          {preparedPlan?.safeMode && (
            <div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-sky-800 ring-1 ring-sky-200">
              Modo seguro: sin renombrar ni guardar snapshots
            </div>
        )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Cerrar plan
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
          <div className="text-xs font-black uppercase text-slate-500">
            Susceptibles revisados
          </div>
          <div className="mt-1 text-2xl font-black text-slate-950">
            {planItems.length}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-emerald-100">
          <div className="text-xs font-black uppercase text-emerald-700">
            Entran en definitivo
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-800">
            {includedCount}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-red-100">
          <div className="text-xs font-black uppercase text-red-700">
            Cancelados
          </div>
          <div className="mt-1 text-2xl font-black text-red-800">
            {cancelledCount}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {planItems.map((item) => (
          <div
            key={item.workRequestId}
            className="rounded-3xl border border-sky-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-lg font-black text-slate-950">
                    {item.shipName}
                  </h4>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1 ${
                      item.isIncludedInFinalNomination
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-red-50 text-red-700 ring-red-200"
                    }`}
                  >
                    {item.actionLabel}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-slate-600">
                  <span>Muelle: {item.berthName}</span>
                  <span>Tarea: {item.taskName}</span>
                  <span>Empresa: {item.companyName}</span>
                  <span>
                    Turno: {item.originalShiftCode}
                    {item.finalShiftCode !== item.originalShiftCode
                      ? ` → ${item.finalShiftCode}`
                      : ""}
                  </span>
                </div>

                {item.notes && (
                  <div className="mt-2 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600">
                    {item.notes}
                  </div>
                )}
              </div>
            </div>

            {item.isIncludedInFinalNomination ? (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Original
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-700">
                    {Object.entries(item.originalPositions || {})
                      .map(([positionCode, amount]) => `${positionCode}: ${amount}`)
                      .join(" · ") || "-"}
                  </div>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-3">
                  <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
                    Definitivo previsto
                  </div>
                  <div className="mt-1 text-sm font-bold text-emerald-800">
                    {Object.entries(item.finalPositions || {})
                      .map(([positionCode, amount]) => `${positionCode}: ${amount}`)
                      .join(" · ") || "-"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-black text-red-700">
                Este trabajo no entraría en el nombramiento definitivo.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
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

function buildPositionCounts(assignments) {
  const counts = {};

  for (const assignment of assignments || []) {
    const positionCode = assignment?.positionCode || "SIN_PUESTO";

    counts[positionCode] = (counts[positionCode] || 0) + 1;
  }

  return Object.fromEntries(
    Object.entries(counts).sort(([positionA], [positionB]) =>
      positionA.localeCompare(positionB)
    )
  );
}

function estimateHandsFromPositions(positionCounts) {
  const values = Object.values(positionCounts || {}).filter((value) => {
    return Number(value) > 0;
  });
  if (values.length === 0) {
    return 1;
  }
  const maxValue = Math.max(...values);
  if (maxValue >= 10) {
    return 3;
  }
  if (maxValue >= 6) {
    return 2;
  }
  return 1;
}

function buildReducedPositionsByHands({ originalPositions, targetHands }) {
  const safeTargetHands = Number(targetHands);

  if (![1, 2, 3].includes(safeTargetHands)) {
    return originalPositions || {};
  }

  const estimatedOriginalHands = estimateHandsFromPositions(originalPositions);
  const reducedPositions = {};

  for (const [positionCode, originalAmount] of Object.entries(
    originalPositions || {}
  )) {
    const safeOriginalAmount = Number(originalAmount) || 0;
    const newAmount = Math.ceil(
      (safeOriginalAmount * safeTargetHands) / estimatedOriginalHands
    );
    reducedPositions[positionCode] = Math.max(0, newAmount);
  }
  return reducedPositions;
}

function ReduceChangeableForm({
  selectedRun,
  workRequest,
  assignments,
  onSaveReduction,
  onCancelReduction,
  savingChangeableId,
}) {
  const workRequestId = getWorkRequestId(workRequest);

  const originalPositions = buildPositionCounts(assignments);
  const [presetHands, setPresetHands] = useState(() =>
    estimateHandsFromPositions(originalPositions)
  );
  const [newPositions, setNewPositions] = useState(originalPositions);
  const [notes, setNotes] = useState("");

  const isSavingThisChangeable = savingChangeableId === workRequestId;

  function applyHands(nextHands) {
    setPresetHands(nextHands);
    setNewPositions(
      buildReducedPositionsByHands({
        originalPositions,
        targetHands: nextHands,
      })
    );
  }

  function updatePositionAmount(positionCode, value) {
    const numericValue = Math.max(0, Number(value) || 0);

    setNewPositions((current) => ({
      ...current,
      [positionCode]: numericValue,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    onSaveReduction({
      nominationRunId: selectedRun._id,
      workRequestId,
      shipName: workRequest.shipName,
      reduction: {
        mode: "EDITED_POSITIONS",
        presetHands,
        originalShiftCode: workRequest.shiftCode || "",
        newShiftCode: workRequest.shiftCode || "",
        originalPositions,
        newPositions,
        notes:
          notes.trim() ||
          `Reducción estructurada a ${presetHands} mano${
            presetHands === 1 ? "" : "s"
          }`,
      },
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-3xl border border-orange-200 bg-orange-50 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black uppercase tracking-wide text-orange-900">
            Reducir trabajo susceptible
          </div>

          <p className="mt-1 text-sm font-bold text-orange-900">
            Elige una reducción rápida por manos o ajusta manualmente cada
            puesto.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancelReduction}
          className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Cerrar reducción
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[1, 2, 3].map((hands) => {
          const isActive = presetHands === hands;

          return (
            <button
              key={hands}
              type="button"
              onClick={() => applyHands(hands)}
              className={`rounded-xl px-4 py-2 text-sm font-black ring-1 ${
                isActive
                  ? "bg-orange-600 text-white ring-orange-600"
                  : "bg-white text-orange-800 ring-orange-200 hover:bg-orange-100"
              }`}
            >
              {hands} mano{hands === 1 ? "" : "s"}
            </button>
          );
        })}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-orange-200 bg-white">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="bg-orange-50 text-left text-xs font-black uppercase tracking-wide text-orange-900">
              <th className="px-4 py-3">Puesto</th>
              <th className="px-4 py-3">Original</th>
              <th className="px-4 py-3">Nueva cantidad</th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(originalPositions).map(
              ([positionCode, originalAmount]) => (
                <tr key={positionCode} className="border-t border-orange-100">
                  <td className="px-4 py-3 font-black text-slate-800">
                    {positionCode}
                  </td>

                  <td className="px-4 py-3 font-bold text-slate-600">
                    {originalAmount}
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      value={newPositions[positionCode] ?? 0}
                      onChange={(event) =>
                        updatePositionAmount(positionCode, event.target.value)
                      }
                      className="w-24 rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-black uppercase tracking-wide text-orange-900">
          Nota opcional
        </span>

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          placeholder="Ejemplo: De 3 manos pasa a 1 mano"
          className="mt-2 w-full rounded-2xl border border-orange-200 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
      </label>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancelReduction}
          className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={isSavingThisChangeable}
          className="rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSavingThisChangeable ? "Guardando..." : "Guardar reducción"}
        </button>
      </div>
    </form>
  );
}

function ChangeableWorkRequestsPanel({
  selectedRun,
  onConfirmFullChangeable,
  onCancelChangeable,
  onReduceChangeable,
  onResetChangeableDecision,
  onChangeShiftChangeable,
  reducingWorkRequestId,
  onStartReduceChangeable,
  onCancelReduceChangeable,
  onPrepareDefinitiveNomination,
  savingChangeableId,
}) {
  const changeableWorkRequests = getChangeableWorkRequestsFromRun(selectedRun);

  if (changeableWorkRequests.length === 0) {
    return null;
  }

  const canManageChangeables = selectedRun.status === "PUBLISHED";
  const decisionSummary = buildChangeableDecisionSummary(selectedRun);

  return (
    <div className="mb-5 rounded-3xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-black uppercase tracking-wide text-amber-900">
            Trabajos susceptibles de cambio
          </div>

          <p className="mt-2 max-w-4xl text-sm font-bold leading-6 text-amber-900">
            {decisionSummary.allResolved
              ? "Todos los trabajos susceptibles tienen una decisión tomada. El siguiente paso será preparar el nombramiento definitivo aplicando esas decisiones."
              : "Estos trabajos se publicaron como provisionales. Antes de nombrar la siguiente ventana, deberían confirmarse, reducirse, modificarse o cancelarse para que el estado operativo final sea correcto."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-3 text-xs font-black shadow-sm ring-1 ring-amber-200 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center text-slate-700">
            <div className="text-lg">{decisionSummary.total}</div>
            <div>Total</div>
          </div>

          <div className="rounded-xl bg-amber-50 px-3 py-2 text-center text-amber-800">
            <div className="text-lg">{decisionSummary.pending}</div>
            <div>Pendientes</div>
          </div>

          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-emerald-700">
            <div className="text-lg">{decisionSummary.confirmed}</div>
            <div>Confirmados</div>
          </div>

          <div className="rounded-xl bg-red-50 px-3 py-2 text-center text-red-700">
            <div className="text-lg">{decisionSummary.cancelled}</div>
            <div>Cancelados</div>
          </div>

          <div className="rounded-xl bg-orange-50 px-3 py-2 text-center text-orange-800">
            <div className="text-lg">{decisionSummary.reduced}</div>
            <div>Reducidos</div>
          </div>

          <div className="rounded-xl bg-indigo-50 px-3 py-2 text-center text-indigo-700">
            <div className="text-lg">{decisionSummary.shifted}</div>
            <div>Cambio horario</div>
          </div>
        </div>
      </div>

      {decisionSummary.allResolved && (
        <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black uppercase tracking-wide text-emerald-900">
                Susceptibles resueltos
              </div>

              <p className="mt-1 text-sm font-bold leading-6 text-emerald-900">
                Ya no queda ningún trabajo susceptible pendiente. Cuando activemos
                la siguiente fase, este botón preparará una nueva simulación
                definitiva aplicando confirmaciones, cancelaciones, reducciones y
                cambios de horario.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onPrepareDefinitiveNomination(selectedRun)}
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700"
            >
              Preparar nombramiento definitivo
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {changeableWorkRequests.map((workRequest, index) => {

          const workRequestId = getWorkRequestId(workRequest);
          const isSavingThisChangeable = savingChangeableId === workRequestId;

          const assignments = getAssignmentsForWorkRequest(
            selectedRun,
            workRequest
          );

          const positionSummary = buildPositionSummary(assignments);

          const changeableStatus = getEffectiveChangeableStatus({
            nominationRun: selectedRun,
            workRequest,
          });

          const changeableDecision = getChangeableDecisionForWorkRequest(
            selectedRun,
            workRequest
          );

          const alternativeShiftCode = getAlternativeChangeableShiftCode(
            workRequest.shiftCode
          );

          const hasFinalDecision = changeableStatus !== "PENDING_CONFIRMATION";
          const canUseMainActions = canManageChangeables && !hasFinalDecision;

          return (
            <div
              key={workRequestId || index}
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
                    {changeableStatus === "SHIFT_CHANGED" && (
                      <span className="text-indigo-700">
                        Cambio: {changeableDecision?.originalShiftCode || workRequest.shiftCode} →{" "}
                        {changeableDecision?.newShiftCode || "-"}
                      </span>
                    )}
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
                    disabled={
                      !canUseMainActions ||
                      !workRequestId ||
                      isSavingThisChangeable
                    }
                    onClick={() =>
                      onConfirmFullChangeable({
                        nominationRunId: selectedRun._id,
                        workRequestId,
                        shipName: workRequest.shipName,
                      })
                    }
                    className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSavingThisChangeable ? "Guardando..." : "Confirmar completo"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      !canUseMainActions ||
                      !workRequestId ||
                      isSavingThisChangeable
                    }
                    onClick={() => onStartReduceChangeable(workRequestId)}
                    className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-black text-orange-800 ring-1 ring-orange-100 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {reducingWorkRequestId === workRequestId ? "Editando reducción" : "Reducir"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      !canUseMainActions ||
                      !workRequestId ||
                      !alternativeShiftCode ||
                      isSavingThisChangeable
                    }
                    onClick={() =>
                      onChangeShiftChangeable({
                        nominationRunId: selectedRun._id,
                        workRequest,
                        shipName: workRequest.shipName,
                      })
                    }
                    className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {alternativeShiftCode
                      ? `Cambiar a ${alternativeShiftCode}`
                      : "Cambiar horario"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      !canUseMainActions ||
                      !workRequestId ||
                      isSavingThisChangeable
                    }
                    onClick={() =>
                      onCancelChangeable({
                        nominationRunId: selectedRun._id,
                        workRequestId,
                        shipName: workRequest.shipName,
                      })
                    }
                    className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSavingThisChangeable ? "Cancelando..." : "Cancelar trabajo"}
                  </button>

                  {hasFinalDecision && (
                    <button
                      type="button"
                      disabled={
                        !canManageChangeables ||
                        !workRequestId ||
                        isSavingThisChangeable
                      }
                      onClick={() =>
                        onResetChangeableDecision({
                          nominationRunId: selectedRun._id,
                          workRequestId,
                          shipName: workRequest.shipName,
                        })
                      }
                      className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSavingThisChangeable ? "Volviendo..." : "Volver a pendiente"}
                    </button>
                  )}
                </div>
              </div>

              {reducingWorkRequestId === workRequestId && (
                <ReduceChangeableForm
                  selectedRun={selectedRun}
                  workRequest={workRequest}
                  assignments={assignments}
                  onSaveReduction={onReduceChangeable}
                  onCancelReduction={onCancelReduceChangeable}
                  savingChangeableId={savingChangeableId}
                />
              )}

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

function ManualReplacementPanel({
  replacementPanel,
  reasonCode,
  reasonText,
  replacingAssignment,
  onClose,
  onChangeReasonCode,
  onChangeReasonText,
  onManualReplacement,
}) {
  const assignment = replacementPanel?.assignmentToReplace;
  const candidates = replacementPanel?.candidates || [];
  const selectableCandidates = candidates.filter(
    (candidate) => candidate.isSelectable
  );
  const excludedCandidates = candidates.filter(
    (candidate) => !candidate.isSelectable
  );

  return (
    <div className="mb-5 rounded-3xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-indigo-700">
            Sustitución manual de trabajador
          </p>

          <h4 className="mt-1 text-xl font-black text-slate-950">
            {assignment?.workerCode} - {assignment?.workerName}
          </h4>

          <p className="mt-2 text-sm font-bold text-slate-700">
            {assignment?.positionCode} · {assignment?.shiftCode} ·{" "}
            {assignment?.shipName || "-"} · {assignment?.berth?.name || "-"}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-100"
        >
          Cerrar
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            Motivo
          </span>

          <select
            value={reasonCode}
            onChange={(event) => onChangeReasonCode(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800"
          >
            <option value="SICK_LEAVE">Baja / enfermedad</option>
            <option value="NO_SHOW">No se presenta</option>
            <option value="PERSONAL_REASON">Motivo personal</option>
            <option value="OPERATIONAL_CHANGE">Cambio operativo</option>
            <option value="OTHER">Otro motivo</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            Observación
          </span>

          <input
            type="text"
            value={reasonText}
            onChange={(event) => onChangeReasonText(event.target.value)}
            placeholder="Ej: avisa de que se ha puesto malo"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800"
          />
        </label>
      </div>

      <div className="mt-5 rounded-2xl bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h5 className="font-black text-slate-900">
            Candidatos disponibles
          </h5>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            {selectableCandidates.length} disponibles
          </span>
        </div>

        {selectableCandidates.length === 0 ? (
          <p className="mt-3 text-sm font-bold text-slate-500">
            No hay candidatos disponibles para esta sustitución.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Trabajador</th>
                  <th className="px-3 py-3">Grupo</th>
                  <th className="px-3 py-3">Lista</th>
                  <th className="px-3 py-3">Motivo</th>
                  <th className="px-3 py-3 text-right">Acción</th>
                </tr>
              </thead>

              <tbody>
                {selectableCandidates.map((candidate) => (
                  <tr
                    key={candidate.workerId}
                    className="border-b border-slate-100"
                  >
                    <td className="px-3 py-3">
                      <div className="font-black text-slate-900">
                        {candidate.workerCode} - {candidate.fullName}
                      </div>
                      <div className="text-xs font-bold text-slate-500">
                        Orden {candidate.rotationOrder ?? "-"}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-sm font-bold text-slate-700">
                      {candidate.mainProfessionalGroup || "-"}
                    </td>

                    <td className="px-3 py-3 text-sm font-bold text-slate-700">
                      {candidate.rotationListCode || "-"}
                    </td>

                    <td className="px-3 py-3 text-sm text-slate-600">
                      {candidate.reason || "-"}
                    </td>

                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        disabled={replacingAssignment}
                        onClick={() =>
                          onManualReplacement({
                            candidate,
                            assignmentIndex: replacementPanel.assignmentIndex,
                            reasonCode,
                            reasonText,
                          })
                        }
                        className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {replacingAssignment
                          ? "Sustituyendo..."
                          : "Sustituir"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {excludedCandidates.length > 0 && (
        <details className="mt-4 rounded-2xl bg-white p-4">
          <summary className="cursor-pointer font-black text-slate-700">
            Ver excluidos ({excludedCandidates.length})
          </summary>

          <div className="mt-3 space-y-2">
            {excludedCandidates.map((candidate) => (
              <div
                key={candidate.workerId}
                className="rounded-xl bg-slate-50 p-3 text-sm"
              >
                <div className="font-black text-slate-800">
                  {candidate.workerCode} - {candidate.fullName}
                </div>
                <div className="font-bold text-slate-500">
                  {candidate.reason || "Excluido"}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function SelectedNominationRunDetail({
  selectedRun,
  onClose,
  onPublish,
  onCancel,
  onConfirmFullChangeable,
  onCancelChangeable,
  onReduceChangeable,
  onResetChangeableDecision,
  onChangeShiftChangeable,
  reducingWorkRequestId,
  onStartReduceChangeable,
  onCancelReduceChangeable,
  preparedChangeablePlan,
  onClosePreparedChangeablePlan,
  preparedChangeableSimulation,
  onClosePreparedChangeableSimulation,
  onPrepareDefinitiveNomination,
  savingId,
  savingChangeableId,
  changeablePanelRef,
  onPublishDefinitiveChangeableNomination,
  onWorkerClickForReplacement,
  replacementPanel,
  replacementReasonCode,
  replacementReasonText,
  replacingAssignment,
  onCloseReplacementPanel,
  onChangeReplacementReasonCode,
  onChangeReplacementReasonText,
  onManualReplacement,
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

      <div ref={changeablePanelRef} />

      <ChangeableWorkRequestsPanel
        selectedRun={selectedRun}
        onConfirmFullChangeable={onConfirmFullChangeable}
        onCancelChangeable={onCancelChangeable}
        onReduceChangeable={onReduceChangeable}
        onResetChangeableDecision={onResetChangeableDecision}
        onChangeShiftChangeable={onChangeShiftChangeable}
        reducingWorkRequestId={reducingWorkRequestId}
        onStartReduceChangeable={onStartReduceChangeable}
        onCancelReduceChangeable={onCancelReduceChangeable}
        savingChangeableId={savingChangeableId}
        onPrepareDefinitiveNomination={onPrepareDefinitiveNomination}
      />

      <PreparedChangeablePlanPanel
        preparedPlan={preparedChangeablePlan}
        onClose={onClosePreparedChangeablePlan}
      />

      {preparedChangeableSimulation && (
        <div className="mb-5 rounded-3xl border border-purple-300 bg-purple-50 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-black uppercase tracking-wide text-purple-900">
                Simulación definitiva del nombramiento
              </div>

              <p className="mt-2 max-w-4xl text-sm font-bold leading-6 text-purple-900">
                Esta es la simulación real generada por el motor aplicando las
                decisiones de susceptibles. El trabajo fijo de 02_08 se mantiene y
                solo se han transformado los trabajos susceptibles. Todavía no se
                publica ni se guarda snapshot.
              </p>

              <div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-800 ring-1 ring-purple-200">
                Modo seguro: preview sin snapshot
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onPublishDefinitiveChangeableNomination(selectedRun)}
                className="rounded-2xl bg-purple-700 px-4 py-3 text-sm font-black text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSaving ? "Publicando definitivo..." : "Publicar definitivo"}
              </button>

              <button
                type="button"
                onClick={onClosePreparedChangeableSimulation}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Cerrar simulación
              </button>
            </div>
          </div>

          <NominationVisualResult simulationResult={preparedChangeableSimulation} />
        </div>
      )}

      {replacementPanel && (
        <ManualReplacementPanel
          replacementPanel={replacementPanel}
          reasonCode={replacementReasonCode}
          reasonText={replacementReasonText}
          replacingAssignment={replacingAssignment}
          onClose={onCloseReplacementPanel}
          onChangeReasonCode={onChangeReplacementReasonCode}
          onChangeReasonText={onChangeReplacementReasonText}
          onManualReplacement={onManualReplacement}
        />
      )}

      <NominationVisualResult
        simulationResult={selectedRun.result}
        onWorkerClick={onWorkerClickForReplacement}
      />
    </section>
  );
}

export default function SavedNominationRunsPanel({ currentUser, refreshKey }) {
  const [nominationRuns, setNominationRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [savingChangeableId, setSavingChangeableId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [reducingWorkRequestId, setReducingWorkRequestId] = useState(null);

  const [selectedRun, setSelectedRun] = useState(null);
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [preparedChangeablePlan, setPreparedChangeablePlan] = useState(null);

  const [replacementPanel, setReplacementPanel] = useState(null);
  const [loadingReplacementCandidates, setLoadingReplacementCandidates] =
    useState(false);
  const [replacingAssignment, setReplacingAssignment] = useState(false);
  const [replacementReasonCode, setReplacementReasonCode] =
    useState("SICK_LEAVE");
  const [replacementReasonText, setReplacementReasonText] = useState("");

  const [selectedAssignmentForReplacement, setSelectedAssignmentForReplacement] =
    useState(null);

  const [selectedAssignmentIndexForReplacement, setSelectedAssignmentIndexForReplacement] =
    useState(null);

  const [selectedReplacementCandidate, setSelectedReplacementCandidate] =
    useState(null);

  const [replacementCandidatesData, setReplacementCandidatesData] = useState(null);

  const [replacementCandidatesError, setReplacementCandidatesError] = useState("");

  const [savingManualReplacement, setSavingManualReplacement] = useState(false);
  



  const handleWorkerClickForReplacement = async (assignment) => {
    if (!assignment || !selectedRun?._id) {
      return;
    }

    const assignments = selectedRun?.result?.assignments || [];

    const assignmentIndex = assignments.findIndex((item) => {
      return (
        String(item.workerId || "") === String(assignment.workerId || "") &&
        String(item.workRequestId || "") === String(assignment.workRequestId || "") &&
        String(item.positionCode || "") === String(assignment.positionCode || "") &&
        String(item.unitNumber || "") === String(assignment.unitNumber || "") &&
        String(item.shiftCode || "") === String(assignment.shiftCode || "")
      );
    });

    if (assignmentIndex < 0) {
      setErrorMessage(
        "No se ha podido localizar esta asignación dentro del nombramiento."
      );
      return;
    }

    setSelectedAssignmentForReplacement(assignment);
    setSelectedAssignmentIndexForReplacement(assignmentIndex);
    setSelectedReplacementCandidate(null);
    setReplacementCandidatesData(null);
    setReplacementCandidatesError("");
    setLoadingReplacementCandidates(true);

    try {
      const result = await getReplacementCandidates({
        nominationRunId: selectedRun._id,
        assignmentIndex,
      });

      if (!result.success) {
        throw new Error(
          result.message || "No se pudieron obtener candidatos de sustitución"
        );
      }

      setReplacementCandidatesData(result.data);
    } catch (error) {
      setReplacementCandidatesError(
        error.response?.data?.message ||
          error.message ||
          "Error obteniendo candidatos de sustitución"
      );
    } finally {
      setLoadingReplacementCandidates(false);
    }
  };

  const closeReplacementPanel = () => {
    setSelectedAssignmentForReplacement(null);
    setSelectedAssignmentIndexForReplacement(null);
    setSelectedReplacementCandidate(null);
    setReplacementCandidatesData(null);
    setReplacementCandidatesError("");
    setLoadingReplacementCandidates(false);
    setReplacementReasonCode("SICK_LEAVE");
    setReplacementReasonText("");
  };

  async function handleConfirmManualReplacement() {
    if (!selectedRun?._id) {
      setErrorMessage("No hay nombramiento seleccionado.");
      return;
    }

    if (selectedAssignmentIndexForReplacement === null) {
      setErrorMessage("No se ha localizado la asignación a sustituir.");
      return;
    }

    if (!selectedReplacementCandidate?.workerId) {
      setErrorMessage("Selecciona un candidato de sustitución.");
      return;
    }

    const oldWorkerLabel = selectedAssignmentForReplacement
      ? `${selectedAssignmentForReplacement.workerCode} - ${selectedAssignmentForReplacement.workerName}`
      : "trabajador actual";

    const newWorkerLabel = `${selectedReplacementCandidate.workerCode} - ${
      selectedReplacementCandidate.fullName ||
      selectedReplacementCandidate.workerName ||
      "Sin nombre"
    }`;

    const confirmed = window.confirm(
      `¿Confirmar sustitución manual?\n\nSale: ${oldWorkerLabel}\nEntra: ${newWorkerLabel}\n\nEl nombramiento publicado quedará actualizado.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSavingManualReplacement(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await replaceAssignmentManually({
        nominationRunId: selectedRun._id,
        assignmentIndex: selectedAssignmentIndexForReplacement,
        replacementWorkerId: selectedReplacementCandidate.workerId,
        reasonCode: replacementReasonCode,
        reasonText: replacementReasonText,
      });

      if (!result.success) {
        throw new Error(
          result.message || "No se pudo realizar la sustitución manual"
        );
      }

      const detailResult = await getNominationRunById(selectedRun._id);

      if (!detailResult.success) {
        throw new Error(
          detailResult.message ||
            "La sustitución se hizo, pero no se pudo recargar el detalle"
        );
      }

      setSelectedRun(detailResult.data);
      closeReplacementPanel();

      setSuccessMessage("Sustitución manual realizada correctamente.");

      await loadNominationRuns();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error realizando la sustitución manual"
      );
    } finally {
      setSavingManualReplacement(false);
    }
  }

  const [
  preparedChangeableSimulation,
  setPreparedChangeableSimulation,
] = useState(null);

  const changeablePanelRef = useRef(null);

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

  function scrollToChangeablePanel() {
    setTimeout(() => {
      changeablePanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  async function handleView(nominationRun) {
    try {
      setLoadingDetailId(nominationRun._id);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await getNominationRunById(nominationRun._id);

      if (!result.success) {
        throw new Error(result.message || "No se pudo cargar el detalle");
      }

      setPreparedChangeablePlan(null);
      setPreparedChangeableSimulation(null);
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

  async function handleManualReplacement({
    candidate,
    assignmentIndex,
    reasonCode,
    reasonText,
  }) {
    if (!selectedRun?._id) {
      setErrorMessage("No hay nombramiento seleccionado");
      return;
    }

    if (!candidate?.workerId) {
      setErrorMessage("No se ha seleccionado trabajador sustituto");
      return;
    }

    const confirmed = window.confirm(
      `¿Confirmar sustitución por ${candidate.workerCode} - ${candidate.fullName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setReplacingAssignment(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await replaceAssignmentManually({
        nominationRunId: selectedRun._id,
        assignmentIndex,
        replacementWorkerId: candidate.workerId,
        reasonCode,
        reasonText,
      });

      if (!result.success) {
        throw new Error(result.message || "No se pudo realizar la sustitución");
      }

      setSuccessMessage("Sustitución manual realizada correctamente");

      const detailResult = await getNominationRunById(selectedRun._id);

      if (detailResult.success) {
        setSelectedRun(detailResult.data);
      }

      setReplacementPanel(null);
      setReplacementReasonCode("SICK_LEAVE");
      setReplacementReasonText("");

      await loadNominationRuns();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error realizando sustitución manual"
      );
    } finally {
      setReplacingAssignment(false);
    }
  }

  function handleCloseReplacementPanel() {
    closeReplacementPanel();
  }

  async function handlePrepareDefinitiveNomination(nominationRun) {
  const summary = buildChangeableDecisionSummary(nominationRun);

  if (!summary.total) {
    setErrorMessage("Este nombramiento no tiene trabajos susceptibles");
    return;
  }

  if (!summary.allResolved) {
    setErrorMessage(
      "Todavía hay trabajos susceptibles pendientes. Resuélvelos antes de preparar el definitivo."
    );
    return;
  }

  const confirmed = window.confirm(
    "¿Preparar la simulación definitiva de este nombramiento aplicando las decisiones de susceptibles?\n\nEl trabajo fijo de 02_08 se mantiene. Solo se recalculan los susceptibles. Todavía no se publica ni se guarda snapshot."
  );

  if (!confirmed) {
    return;
  }

  try {
    setSavingId(nominationRun._id);
    setErrorMessage("");
    setSuccessMessage("");
    setPreparedChangeablePlan(null);
    setPreparedChangeableSimulation(null);

    const result = await prepareChangeableDefinitiveSimulation(
      nominationRun._id
    );

    if (!result.success) {
      throw new Error(
        result.message ||
          "No se pudo preparar la simulación definitiva"
      );
    }

    setPreparedChangeablePlan(result.data);
    setPreparedChangeableSimulation(
      result.data?.combinedDefinitiveResult ||
        result.data?.simulationResult ||
        null
    );

    setSuccessMessage(
      result.data?.message ||
        "Simulación definitiva preparada desde backend. Todavía no se ha publicado ni guardado snapshot."
    );
  } catch (error) {
    setErrorMessage(
      error.response?.data?.message ||
        error.message ||
        "Error preparando la simulación definitiva de susceptibles"
    );
  } finally {
    setSavingId(null);
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

  async function handlePublishDefinitiveChangeableNomination(nominationRun) {
    if (!nominationRun?._id) {
      setErrorMessage("No hay nombramiento seleccionado para publicar definitivo");
      return;
    }

    const confirmed = window.confirm(
      `¿Publicar el nombramiento definitivo aplicando las decisiones de susceptibles?\n\nSe creará un nombramiento definitivo nuevo, se guardarán los snapshots definitivos y el nombramiento provisional quedará reemplazado.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSavingId(nominationRun._id);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await publishChangeableDefinitiveNomination(
        nominationRun._id
      );

      if (!result.success) {
        throw new Error(
          result.message ||
            "No se pudo publicar el nombramiento definitivo de susceptibles"
        );
      }

      const definitiveNominationRunId =
        result.data?.summary?.definitiveNominationRunId ||
        result.data?.definitiveNominationRun?._id ||
        result.data?.nominationRun?._id ||
        null;

      setSuccessMessage(
        result.message ||
          "Nombramiento definitivo publicado correctamente"
      );

      setPreparedChangeablePlan(null);
      setPreparedChangeableSimulation(null);

      await loadNominationRuns();

      if (definitiveNominationRunId) {
        const detailResult = await getNominationRunById(
          definitiveNominationRunId
        );

        if (detailResult.success) {
          setSelectedRun(detailResult.data);
        }
      } else {
        const detailResult = await getNominationRunById(nominationRun._id);

        if (detailResult.success) {
          setSelectedRun(detailResult.data);
        }
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error publicando el nombramiento definitivo de susceptibles"
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


  async function handleConfirmFullChangeable({
    nominationRunId,
    workRequestId,
    shipName,
  }) {
    const confirmed = window.confirm(
      `¿Confirmar completo el trabajo susceptible${
        shipName ? ` del barco ${shipName}` : ""
      }?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSavingChangeableId(workRequestId);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await confirmFullChangeableWorkRequest({
        nominationRunId,
        workRequestId,
      });

      if (!result.success) {
        throw new Error(
          result.message || "No se pudo confirmar el trabajo susceptible"
        );
      }

      setSuccessMessage("Trabajo susceptible confirmado completo correctamente");

      const detailResult = await getNominationRunById(nominationRunId);

      if (detailResult.success) {
        setSelectedRun(detailResult.data);
        scrollToChangeablePanel();
      }

      await loadNominationRuns();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error confirmando trabajo susceptible"
      );
    } finally {
      setSavingChangeableId(null);
    }
  }

  async function handleCancelChangeableWorkRequest({
    nominationRunId,
    workRequestId,
    shipName,
  }) {
    const confirmed = window.confirm(
      `¿Seguro que quieres cancelar el trabajo susceptible${
        shipName ? ` del barco ${shipName}` : ""
      }? De momento solo se guardará la decisión. No se renombra todavía el nombramiento.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSavingChangeableId(workRequestId);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await cancelChangeableWorkRequest({
        nominationRunId,
        workRequestId,
      });

      if (!result.success) {
        throw new Error(
          result.message || "No se pudo cancelar el trabajo susceptible"
        );
      }

      setSuccessMessage("Trabajo susceptible cancelado correctamente");

      const detailResult = await getNominationRunById(nominationRunId);

      if (detailResult.success) {
        setSelectedRun(detailResult.data);
        scrollToChangeablePanel();
      }

      await loadNominationRuns();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error cancelando trabajo susceptible"
      );
    } finally {
      setSavingChangeableId(null);
    }
  }

  async function handleReduceChangeableWorkRequest({
    nominationRunId,
    workRequestId,
    shipName,
    reduction,
  }) {
    if (!reduction?.newPositions || !reduction?.originalPositions) {
      setErrorMessage("Faltan cantidades para guardar la reducción");
      return;
    }

    const confirmed = window.confirm(
      `¿Guardar la reducción del trabajo susceptible${
        shipName ? ` del barco ${shipName}` : ""
      }?\n\nDe momento solo se guardará la decisión estructurada. No se renombra todavía el nombramiento.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSavingChangeableId(workRequestId);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await reduceChangeableWorkRequest({
        nominationRunId,
        workRequestId,
        reduction,
      });

      if (!result.success) {
        throw new Error(
          result.message || "No se pudo reducir el trabajo susceptible"
        );
      }

      setSuccessMessage("Trabajo susceptible reducido correctamente");
      setReducingWorkRequestId(null);

      const detailResult = await getNominationRunById(nominationRunId);

      if (detailResult.success) {
        setSelectedRun(detailResult.data);
      }

      await loadNominationRuns();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error reduciendo trabajo susceptible"
      );
    } finally {
      setSavingChangeableId(null);
    }
  }

  async function handleResetChangeableDecision({
    nominationRunId,
    workRequestId,
    shipName,
  }) {
    const confirmed = window.confirm(
      `¿Volver a pendiente el trabajo susceptible${
        shipName ? ` del barco ${shipName}` : ""
      }?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSavingChangeableId(workRequestId);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await resetChangeableWorkRequestDecision({
        nominationRunId,
        workRequestId,
      });

      if (!result.success) {
        throw new Error(
          result.message || "No se pudo volver a pendiente el trabajo susceptible"
        );
      }

      setSuccessMessage("Trabajo susceptible vuelto a pendiente correctamente");

      const detailResult = await getNominationRunById(nominationRunId);

      if (detailResult.success) {
        setSelectedRun(detailResult.data);
        scrollToChangeablePanel();
      }

      await loadNominationRuns();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error volviendo a pendiente el trabajo susceptible"
      );
    } finally {
      setSavingChangeableId(null);
    }
  }

  async function handleChangeShiftChangeableWorkRequest({
    nominationRunId,
    workRequest,
    shipName,
  }) {
    const workRequestId = getWorkRequestId(workRequest);
    const originalShiftCode = String(workRequest?.shiftCode || "")
      .trim()
      .toUpperCase();

    const newShiftCode = getAlternativeChangeableShiftCode(originalShiftCode);

    if (!workRequestId || !newShiftCode) {
      setErrorMessage(
        "No se puede cambiar el horario de este susceptible. Solo se permite 08_14 ↔ 08_18."
      );
      return;
    }

    const confirmed = window.confirm(
      `¿Cambiar el trabajo susceptible${
        shipName ? ` del barco ${shipName}` : ""
      } de ${originalShiftCode} a ${newShiftCode}? De momento solo se guardará la decisión. No se renombra todavía el nombramiento.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSavingChangeableId(workRequestId);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await changeShiftChangeableWorkRequest({
        nominationRunId,
        workRequestId,
        newShiftCode,
        notes: `Cambio de horario de ${originalShiftCode} a ${newShiftCode}`,
      });

      if (!result.success) {
        throw new Error(
          result.message || "No se pudo cambiar el horario del trabajo susceptible"
        );
      }

      setSuccessMessage("Horario del trabajo susceptible cambiado correctamente");

      const detailResult = await getNominationRunById(nominationRunId);

      if (detailResult.success) {
        setSelectedRun(detailResult.data);
        scrollToChangeablePanel();
      }

      await loadNominationRuns();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error cambiando horario del trabajo susceptible"
      );
    } finally {
      setSavingChangeableId(null);
    }
  }

  const replacementCandidates = replacementCandidatesData?.candidates || [];
  const selectableReplacementCandidates = replacementCandidates.filter(
    (candidate) => candidate.isSelectable
  );
  const excludedReplacementCandidates = replacementCandidates.filter(
    (candidate) => !candidate.isSelectable
  );

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

                <p className="mt-2 text-xs font-bold text-slate-400">
                  Mostrando {nominationRuns.length} nombramiento(s). Desplaza dentro de la ventana para ver más.
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
        <div className="max-h-[650px] overflow-auto">
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

      {selectedAssignmentForReplacement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Sustitución manual de trabajador
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Usa esta opción cuando un trabajador ya nombrado no pueda acudir y haya que sustituirlo manualmente.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeReplacementPanel}
                  className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  Trabajador a sustituir
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="rounded-lg bg-red-600 px-3 py-1 text-sm font-black text-white">
                    {selectedAssignmentForReplacement.workerCode}
                  </span>

                  <span className="text-base font-black text-slate-900">
                    {selectedAssignmentForReplacement.workerName || "Sin nombre"}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Puesto
                  </p>
                  <p className="mt-1 font-black text-slate-900">
                    {selectedAssignmentForReplacement.positionCode || "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Turno
                  </p>
                  <p className="mt-1 font-black text-slate-900">
                    {selectedAssignmentForReplacement.shiftCode || "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Barco
                  </p>
                  <p className="mt-1 font-black text-slate-900">
                    {selectedAssignmentForReplacement.shipName || "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Muelle
                  </p>
                  <p className="mt-1 font-black text-slate-900">
                    {selectedAssignmentForReplacement.berth?.name ||
                      selectedAssignmentForReplacement.berthName ||
                      "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <label className="text-sm font-black text-slate-800">
                  Motivo de la sustitución
                </label>

                <select
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Selecciona un motivo
                  </option>
                  <option value="ENFERMEDAD">Enfermedad</option>
                  <option value="BAJA">Baja médica</option>
                  <option value="ACCIDENTE">Accidente</option>
                  <option value="NO_LOCALIZADO">No localizado</option>
                  <option value="NO_PUEDE_ACUDIR">No puede acudir</option>
                  <option value="ERROR_NOMBRAMIENTO">Error en nombramiento</option>
                  <option value="OTRO">Otro motivo</option>
                </select>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-black text-slate-900">
                  Motivo de la sustitución
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-[240px_1fr]">
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Motivo
                    </span>

                    <select
                      value={replacementReasonCode}
                      onChange={(event) => setReplacementReasonCode(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                    >
                      <option value="SICK_LEAVE">Baja / enfermedad</option>
                      <option value="NO_SHOW">No se presenta</option>
                      <option value="PERSONAL_REASON">Motivo personal</option>
                      <option value="OPERATIONAL_CHANGE">Cambio operativo</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Observación
                    </span>

                    <input
                      type="text"
                      value={replacementReasonText}
                      onChange={(event) => setReplacementReasonText(event.target.value)}
                      placeholder="Ej: avisa de que se ha puesto malo antes del turno"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Candidatos reales de sustitución
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Lista calculada por el backend aplicando habilitación, turno, descansos y trabajadores ya nombrados.
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {replacementCandidatesData?.summary?.selectableCandidates ?? selectableReplacementCandidates.length}
                  </span>
                </div>

                {loadingReplacementCandidates ? (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
                    Cargando candidatos reales desde backend...
                  </div>
                ) : replacementCandidatesError ? (
                  <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">
                    {replacementCandidatesError}
                  </div>
                ) : replacementCandidates.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-800">
                    No se han encontrado candidatos de sustitución para este puesto.
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                        Disponibles
                      </p>

                      {selectableReplacementCandidates.length === 0 ? (
                        <div className="mt-2 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-800">
                          No hay candidatos seleccionables.
                        </div>
                      ) : (
                        <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                          {selectableReplacementCandidates.map((candidate) => {
                            const isSelected =
                              selectedReplacementCandidate?.workerId === candidate.workerId;

                            return (
                              <button
                                key={candidate.workerId}
                                type="button"
                                onClick={() => setSelectedReplacementCandidate(candidate)}
                                className={[
                                  "w-full rounded-xl border p-3 text-left transition",
                                  isSelected
                                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                                    : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50",
                                ].join(" ")}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-black text-white">
                                        {candidate.workerCode}
                                      </span>

                                      <span className="text-sm font-black text-slate-900">
                                        {candidate.fullName || candidate.workerName || "Sin nombre"}
                                      </span>

                                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                                        Disponible
                                      </span>
                                    </div>

                                    <p className="mt-2 text-xs font-bold text-slate-500">
                                      {candidate.reason || "Candidato compatible"}
                                    </p>
                                  </div>

                                  <div className="text-right text-xs font-bold text-slate-500">
                                    <p>{candidate.rotationListCode || "-"}</p>
                                    <p className="mt-1">
                                      Orden: {candidate.rotationOrder ?? "-"}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {excludedReplacementCandidates.length > 0 && (
                      <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-600">
                          Ver excluidos ({excludedReplacementCandidates.length})
                        </summary>

                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                          {excludedReplacementCandidates.map((candidate) => (
                            <div
                              key={candidate.workerId}
                              className="rounded-xl border border-slate-200 bg-white p-3 opacity-75"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-lg bg-slate-400 px-2.5 py-1 text-xs font-black text-white">
                                      {candidate.workerCode}
                                    </span>

                                    <span className="text-sm font-black text-slate-700">
                                      {candidate.fullName || candidate.workerName || "Sin nombre"}
                                    </span>

                                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-red-700 ring-1 ring-red-200">
                                      Excluido
                                    </span>
                                  </div>

                                  <p className="mt-2 text-xs font-bold text-red-700">
                                    {candidate.reason || "No seleccionable"}
                                  </p>
                                </div>

                                <div className="text-right text-xs font-bold text-slate-500">
                                  <p>{candidate.rotationListCode || "-"}</p>
                                  <p className="mt-1">
                                    Orden: {candidate.rotationOrder ?? "-"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeReplacementPanel}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={!selectedReplacementCandidate || savingManualReplacement}
                onClick={handleConfirmManualReplacement}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-black text-white",
                  selectedReplacementCandidate && !savingManualReplacement
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-slate-300",
                ].join(" ")}
                title={
                  selectedReplacementCandidate
                    ? "Confirmar sustitución manual"
                    : "Selecciona primero un candidato"
                }
              >
                {savingManualReplacement ? "Sustituyendo..." : "Confirmar sustitución"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SelectedNominationRunDetail
        selectedRun={selectedRun} 
        onClose={() => {
          setSelectedRun(null);
          closeReplacementPanel();
        }}
        onPublish={handlePublish}
        onCancel={handleCancel}
        onWorkerClickForReplacement={handleWorkerClickForReplacement}
        onConfirmFullChangeable={handleConfirmFullChangeable}
        onCancelChangeable={handleCancelChangeableWorkRequest}
        onReduceChangeable={handleReduceChangeableWorkRequest}
        onResetChangeableDecision={handleResetChangeableDecision}
        onChangeShiftChangeable={handleChangeShiftChangeableWorkRequest}
        reducingWorkRequestId={reducingWorkRequestId}
        onStartReduceChangeable={setReducingWorkRequestId}
        onCancelReduceChangeable={() => setReducingWorkRequestId(null)}
        savingId={savingId}
        savingChangeableId={savingChangeableId}
        changeablePanelRef={changeablePanelRef}
        preparedChangeablePlan={preparedChangeablePlan}
        preparedChangeableSimulation={preparedChangeableSimulation}
        replacementPanel={replacementPanel}
        replacementReasonCode={replacementReasonCode}
        replacementReasonText={replacementReasonText}
        replacingAssignment={replacingAssignment}
        onCloseReplacementPanel={handleCloseReplacementPanel}
        onChangeReplacementReasonCode={setReplacementReasonCode}
        onChangeReplacementReasonText={setReplacementReasonText}
        onManualReplacement={handleManualReplacement}
        onClosePreparedChangeableSimulation={() =>
          setPreparedChangeableSimulation(null)
        }
        onClosePreparedChangeablePlan={() => setPreparedChangeablePlan(null)}
        onPrepareDefinitiveNomination={handlePrepareDefinitiveNomination}
        onPublishDefinitiveChangeableNomination={
          handlePublishDefinitiveChangeableNomination
        }
      />
    </section>
  );
}
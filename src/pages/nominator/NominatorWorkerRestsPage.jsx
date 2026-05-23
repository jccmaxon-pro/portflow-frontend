import React, { useEffect, useMemo, useState } from "react";
import {
  assignWorkerToRestGroup,
  getAdminRestGroupAssignments,
  getAdminRestGroupChangeLogs,
  getAdminRestGroups,
  getAdminRestSelections,
  moveWorkerRestGroup,
} from "../../api/workerRestApi";

const DEFAULT_PORT_ID = "69f210fe5417a1641d23188d";

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

function getTodayText() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStartText() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function getMonthEndText() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const end = new Date(Date.UTC(year, month + 1, 0));

  return end.toISOString().slice(0, 10);
}

function StatusBadge({ status }) {
  const className =
    status === "SELECTED"
      ? "bg-blue-100 text-blue-800"
      : status === "LOCKED"
      ? "bg-slate-200 text-slate-700"
      : status === "CANCELLED"
      ? "bg-red-100 text-red-700"
      : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${className}`}
    >
      {status || "SIN ESTADO"}
    </span>
  );
}

function RestSelectionsTable({ selections }) {
  if (!selections || selections.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
        No hay descansos seleccionados con los filtros actuales.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <th className="px-5 py-4">Fecha descanso</th>
              <th className="px-5 py-4">Trabajador</th>
              <th className="px-5 py-4">Grupo</th>
              <th className="px-5 py-4">Bloque</th>
              <th className="px-5 py-4">Fecha límite</th>
              <th className="px-5 py-4">Estado</th>
              <th className="px-5 py-4">Origen</th>
              <th className="px-5 py-4">Seleccionado</th>
            </tr>
          </thead>

          <tbody>
            {selections.map((selection) => {
              const worker = selection.worker;
              const entitlement = selection.restEntitlementDay;

              return (
                <tr
                  key={selection._id}
                  className="border-t border-slate-100"
                >
                  <td className="px-5 py-4 font-black text-slate-900">
                    {formatDate(selection.date)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-black text-slate-900">
                      {worker?.workerCode || "-"} · {worker?.fullName || "-"}
                    </div>
                    <div className="text-xs font-bold text-slate-500">
                      {worker?.mainProfessionalGroup || "-"}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm font-bold text-slate-700">
                    {entitlement?.restGroupCode || "-"}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-900">
                      {entitlement?.blockLabel || selection.blockCode || "-"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDate(entitlement?.blockStartDate)} →{" "}
                      {formatDate(entitlement?.blockEndDate)}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm font-bold text-slate-700">
                    {formatDateTime(entitlement?.selectionDeadlineAt)}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={selection.status} />
                  </td>

                  <td className="px-5 py-4 text-sm font-bold text-slate-600">
                    {selection.source || "-"}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {formatDateTime(selection.selectedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RestGroupCards({
  restGroups,
  selectedGroupCode,
  onViewWorkers,
}) {
  if (!restGroups || restGroups.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
        No hay grupos de descanso configurados para este año.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {restGroups.map((group) => {
        const isSelected = selectedGroupCode === group.code;

        return (
          <button
            key={group.code}
            type="button"
            onClick={() => onViewWorkers(group.code)}
            className={`rounded-3xl border p-5 text-left shadow-sm transition ${
              isSelected
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-900 hover:border-slate-400"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className={`text-xs font-black uppercase tracking-wide ${
                    isSelected ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {group.calendarType || "Grupo"}
                </p>

                <h3 className="mt-2 text-lg font-black leading-tight">
                  {group.name}
                </h3>

                <p
                  className={`mt-2 text-xs font-bold ${
                    isSelected ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {group.code}
                </p>
              </div>

              <span
                className="mt-1 h-4 w-4 shrink-0 rounded-full ring-2 ring-white"
                style={{
                  backgroundColor: group.color || "#94a3b8",
                }}
              />
            </div>

            <div
              className={`mt-5 rounded-2xl px-4 py-3 ${
                isSelected ? "bg-white/10" : "bg-slate-50"
              }`}
            >
              <p
                className={`text-xs font-black uppercase tracking-wide ${
                  isSelected ? "text-slate-300" : "text-slate-500"
                }`}
              >
                Trabajadores asignados
              </p>

              <p className="mt-1 text-3xl font-black">
                {group.workerCount || 0}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function RestGroupAssignmentsTable({
  assignments,
  loading,
  onMoveWorker,
}) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 font-bold text-slate-500 shadow-sm">
        Cargando trabajadores del grupo...
      </div>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
        Selecciona un grupo para ver sus trabajadores, o no hay trabajadores
        asignados a este grupo.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-xl font-black text-slate-900">
          Trabajadores del grupo
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Personal actualmente asignado a este grupo de descanso.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="bg-white text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <th className="px-5 py-4">Nº</th>
              <th className="px-5 py-4">Trabajador</th>
              <th className="px-5 py-4">Grupo profesional</th>
              <th className="px-5 py-4">Grupo descanso</th>
              <th className="px-5 py-4 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {assignments.map((assignment) => {
              const worker = assignment.worker;
              const restGroup = assignment.restGroup;

              return (
                <tr
                  key={assignment._id}
                  className="border-t border-slate-100"
                >
                  <td className="px-5 py-4 text-xl font-black text-slate-950">
                    {worker?.workerCode || "-"}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-black text-slate-900">
                      {worker?.fullName || "-"}
                    </div>
                    <div className="text-xs font-bold text-slate-500">
                      ID trabajador: {worker?._id || "-"}
                    </div>
                  </td>

                  <td className="px-5 py-4 font-bold text-slate-700">
                    {worker?.mainProfessionalGroup ||
                      worker?.professionalGroup ||
                      "-"}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                        type="button"
                        onClick={() => onMoveWorker(assignment)}
                        className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-700"
                    >
                        Mover
                    </button>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: restGroup?.color || "#94a3b8",
                        }}
                      />
                      <div>
                        <div className="font-bold text-slate-900">
                          {restGroup?.name || "-"}
                        </div>
                        <div className="text-xs font-bold text-slate-500">
                          {restGroup?.code || "-"}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MoveWorkerGroupForm({
  moveForm,
  restGroups,
  moveTargetGroupCode,
  setMoveTargetGroupCode,
  moveReason,
  setMoveReason,
  moveNotes,
  setMoveNotes,
  moveLoading,
  onSubmit,
  onCancel,
}) {
  if (!moveForm) {
    return null;
  }

  const worker = moveForm.worker;
  const currentRestGroup = moveForm.restGroup;

  const targetGroups = restGroups.filter((group) => {
    return group.code !== currentRestGroup?.code;
  });

  return (
    <form
      onSubmit={onSubmit}
      className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-amber-700">
            Mover trabajador de grupo
          </p>

          <h3 className="mt-1 text-2xl font-black text-slate-950">
            Nº {worker?.workerCode || "-"} · {worker?.fullName || "-"}
          </h3>

          <p className="mt-2 text-sm font-bold text-slate-600">
            Grupo actual: {currentRestGroup?.name || "-"}
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Grupo destino
          </span>

          <select
            value={moveTargetGroupCode}
            onChange={(event) => setMoveTargetGroupCode(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900"
          >
            <option value="">Selecciona grupo</option>

            {targetGroups.map((group) => (
              <option key={group.code} value={group.code}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Motivo
          </span>

          <input
            type="text"
            value={moveReason}
            onChange={(event) => setMoveReason(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-900"
            placeholder="Ej: cambio administrativo"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Notas
          </span>

          <input
            type="text"
            value={moveNotes}
            onChange={(event) => setMoveNotes(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-900"
            placeholder="Comentario interno opcional"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl bg-white px-5 py-3 font-black text-slate-700 shadow-sm hover:bg-slate-100"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={moveLoading}
          className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {moveLoading ? "Moviendo..." : "Confirmar cambio"}
        </button>
      </div>
    </form>
  );
}

function AssignWorkerGroupForm({
  isOpen,
  restGroups,
  workerCode,
  setWorkerCode,
  restGroupCode,
  setRestGroupCode,
  notes,
  setNotes,
  loading,
  onSubmit,
  onCancel,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-5 rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">
            Añadir trabajador a grupo
          </p>

          <h3 className="mt-1 text-2xl font-black text-slate-950">
            Alta en cuadrante de descanso
          </h3>

          <p className="mt-2 max-w-3xl text-sm font-bold text-slate-600">
            Usa esta opción para trabajadores nuevos o trabajadores que todavía
            no tienen grupo de descanso asignado para el año seleccionado.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Nº trabajador
          </span>

          <input
            type="text"
            value={workerCode}
            onChange={(event) => setWorkerCode(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900"
            placeholder="Ej: 999"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Grupo descanso
          </span>

          <select
            value={restGroupCode}
            onChange={(event) => setRestGroupCode(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900"
          >
            <option value="">Selecciona grupo</option>

            {restGroups.map((group) => (
              <option key={group.code} value={group.code}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Notas
          </span>

          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900"
            placeholder="Alta inicial, incorporación, etc."
          />
        </label>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl bg-white px-5 py-3 font-black text-slate-700 shadow-sm hover:bg-slate-100"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Asignando..." : "Asignar trabajador"}
        </button>
      </div>
    </form>
  );
}

function RestGroupChangeLogsTable({
  logs,
  summary,
  loading,
  restGroups,
  workerCode,
  setWorkerCode,
  newGroupCode,
  setNewGroupCode,
  onSearch,
  onClear,
}) {
  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">
            Auditoría
          </p>

          <h3 className="mt-1 text-2xl font-black text-slate-950">
            Cambios de grupo de descanso
          </h3>

          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Registro de movimientos de trabajadores entre grupos de descanso.
            Sirve para saber quién hizo el cambio, cuándo y por qué.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">
          {summary?.totalLogs || 0} cambio/s
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_1.4fr_auto_auto]">
        <input
          type="text"
          value={workerCode}
          onChange={(event) => setWorkerCode(event.target.value)}
          className="rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-900"
          placeholder="Filtrar por nº trabajador"
        />

        <select
          value={newGroupCode}
          onChange={(event) => setNewGroupCode(event.target.value)}
          className="rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-900"
        >
          <option value="">Grupo destino</option>

          {restGroups.map((group) => (
            <option key={group.code} value={group.code}>
              {group.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onSearch}
          className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-700"
        >
          Filtrar
        </button>

        <button
          type="button"
          onClick={onClear}
          className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700 hover:bg-slate-200"
        >
          Limpiar
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-slate-50 p-5 font-bold text-slate-500">
          Cargando auditoría...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-5 text-slate-500">
          No hay cambios de grupo registrados con los filtros actuales.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[1050px] border-collapse bg-white">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Trabajador</th>
                <th className="px-4 py-3">Grupo anterior</th>
                <th className="px-4 py-3">Grupo nuevo</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Notas</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr
                  key={log._id}
                  className="border-t border-slate-100 align-top"
                >
                  <td className="px-4 py-3 text-sm font-bold text-slate-700">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString("es-ES")
                      : "-"}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-black text-slate-950">
                      {log.worker?.workerCode || "-"}
                    </div>
                    <div className="text-xs font-bold text-slate-500">
                      {log.worker?.fullName || ""}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-slate-700">
                    {log.previousRestGroup?.name ||
                      log.previousRestGroup?.code ||
                      "-"}
                  </td>

                  <td className="px-4 py-3 text-sm font-black text-slate-900">
                    {log.newRestGroup?.name || log.newRestGroup?.code || "-"}
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm font-bold text-slate-800">
                      {log.changedBy?.name || log.changedBy?.email || "-"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {log.changedBy?.role || ""}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-700">
                    {log.reason || "-"}
                  </td>

                  <td className="max-w-xs px-4 py-3 text-sm text-slate-600">
                    {log.notes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function NominatorWorkerRestsPage({ currentUser }) {
  const [year, setYear] = useState(2026);
  const [date, setDate] = useState("");
  const [fromDate, setFromDate] = useState(getMonthStartText());
  const [toDate, setToDate] = useState(getMonthEndText());
  const [workerCode, setWorkerCode] = useState("");
  const [restGroupCode, setRestGroupCode] = useState("");
  const [restGroups, setRestGroups] = useState([]);
  const [selectedGroupForWorkers, setSelectedGroupForWorkers] = useState("");
  const [groupAssignmentsData, setGroupAssignmentsData] = useState(null);
  const [groupAssignmentsLoading, setGroupAssignmentsLoading] = useState(false);
  const [moveForm, setMoveForm] = useState(null);
  const [moveTargetGroupCode, setMoveTargetGroupCode] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [moveNotes, setMoveNotes] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [assignFormOpen, setAssignFormOpen] = useState(false);
  const [assignWorkerCode, setAssignWorkerCode] = useState("");
  const [assignRestGroupCode, setAssignRestGroupCode] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const [changeLogs, setChangeLogs] = useState([]);
  const [changeLogsSummary, setChangeLogsSummary] = useState(null);
  const [changeLogsLoading, setChangeLogsLoading] = useState(false);
  const [changeLogsWorkerCode, setChangeLogsWorkerCode] = useState("");
  const [changeLogsNewGroupCode, setChangeLogsNewGroupCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [restData, setRestData] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");

  const selections = useMemo(() => {
    return restData?.selections || [];
  }, [restData]);

  function buildParams() {
    const params = {
      year,
    };

    /**
     * SUPER_ADMIN necesita portId si no tiene puerto asignado.
     */
    if (currentUser?.role === "SUPER_ADMIN") {
      params.portId = currentUser?.port?._id || DEFAULT_PORT_ID;
    }

    if (date) {
      params.date = date;
    } else {
      if (fromDate) {
        params.fromDate = fromDate;
      }

      if (toDate) {
        params.toDate = toDate;
      }
    }

    if (workerCode.trim()) {
      params.workerCode = workerCode.trim();
    }

    if (restGroupCode) {
        params.restGroupCode = restGroupCode;
    }

    return params;
  }

  function buildGroupParams() {
    const params = {
        year,
    };

    if (currentUser?.role === "SUPER_ADMIN") {
        params.portId = currentUser?.port?._id || DEFAULT_PORT_ID;
    }

    return params;
  }
 
  async function loadRestGroups() {
    try {
        const result = await getAdminRestGroups(buildGroupParams());

        if (!result.success) {
        throw new Error(
            result.message || "No se pudieron cargar los grupos de descanso"
        );
        }

        setRestGroups(result.data?.groups || []);
    } catch (error) {
        setRestGroups([]);
        setErrorMessage(
        error.response?.data?.message ||
            error.message ||
            "Error cargando grupos de descanso"
        );
    }
  }

  async function loadRestGroupAssignments(groupCode) {
    if (!groupCode) {
      setGroupAssignmentsData(null);
      setSelectedGroupForWorkers("");
      return;
    }

    try {
      setGroupAssignmentsLoading(true);
      setErrorMessage("");
      setSelectedGroupForWorkers(groupCode);

      const params = {
        year,
        restGroupCode: groupCode,
      };

      if (currentUser?.role === "SUPER_ADMIN") {
        params.portId = currentUser?.port?._id || DEFAULT_PORT_ID;
      }

      const result = await getAdminRestGroupAssignments(params);

      if (!result.success) {
        throw new Error(
          result.message ||
            "No se pudieron cargar los trabajadores del grupo"
        );
      }

      setGroupAssignmentsData(result.data);
    } catch (error) {
      setGroupAssignmentsData(null);
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error cargando trabajadores del grupo"
      );
    } finally {
      setGroupAssignmentsLoading(false);
    }
  }

  function openMoveWorkerForm(assignment) {
    setMoveForm(assignment);
    setMoveTargetGroupCode("");
    setMoveReason("");
    setMoveNotes("");
    setSuccessMessage("");
    setErrorMessage("");
  }

  function closeMoveWorkerForm() {
    setMoveForm(null);
    setMoveTargetGroupCode("");
    setMoveReason("");
    setMoveNotes("");
    setMoveLoading(false);
  }

  async function handleMoveWorkerSubmit(event) {
    event.preventDefault();

    if (!moveForm?.worker?.workerCode) {
      setErrorMessage("No se ha seleccionado trabajador");
      return;
    }

    if (!moveTargetGroupCode) {
      setErrorMessage("Selecciona un grupo destino");
      return;
    }

    try {
      setMoveLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = {
        year,
        workerCode: moveForm.worker.workerCode,
        newRestGroupCode: moveTargetGroupCode,
        reason: moveReason,
        notes: moveNotes,
      };

      if (currentUser?.role === "SUPER_ADMIN") {
        payload.portId = currentUser?.port?._id || DEFAULT_PORT_ID;
      }

      const result = await moveWorkerRestGroup(payload);

      if (!result.success) {
        throw new Error(
          result.message || "No se pudo mover el trabajador de grupo"
        );
      }

      setSuccessMessage(result.data?.message || "Trabajador movido correctamente");

      const groupToReload = selectedGroupForWorkers;

      closeMoveWorkerForm();

      await loadRestGroups();

      if (groupToReload) {
        await loadRestGroupAssignments(groupToReload);
      }

      await loadSelections();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error moviendo trabajador de grupo"
      );
    } finally {
      setMoveLoading(false);
    }
  }


  async function handleAssignWorkerSubmit(event) {
    event.preventDefault();

    if (!assignWorkerCode.trim()) {
      setErrorMessage("Introduce el número de trabajador");
      return;
    }

    if (!assignRestGroupCode) {
      setErrorMessage("Selecciona un grupo de descanso");
      return;
    }

    try {
      setAssignLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = {
        year,
        workerCode: assignWorkerCode.trim(),
        restGroupCode: assignRestGroupCode,
        notes: assignNotes,
      };

      if (currentUser?.role === "SUPER_ADMIN") {
        payload.portId = currentUser?.port?._id || DEFAULT_PORT_ID;
      }

      const result = await assignWorkerToRestGroup(payload);

      if (!result.success) {
        throw new Error(
          result.message || "No se pudo asignar el trabajador al grupo"
        );
      }

      setSuccessMessage(
        result.data?.message || "Trabajador asignado correctamente"
      );

      const groupToReload = assignRestGroupCode;

      setAssignWorkerCode("");
      setAssignRestGroupCode("");
      setAssignNotes("");
      setAssignFormOpen(false);

      await loadRestGroups();

      if (groupToReload) {
        await loadRestGroupAssignments(groupToReload);
      }

      await loadSelections();
      await loadChangeLogs();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error asignando trabajador a grupo"
      );
    } finally {
      setAssignLoading(false);
    }
  }

  async function loadSelections() {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getAdminRestSelections(buildParams());

      if (!result.success) {
        throw new Error(
          result.message || "No se pudieron cargar los descansos"
        );
      }

      setRestData(result.data);
    } catch (error) {
      setRestData(null);
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error cargando descansos seleccionados"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadChangeLogs(customFilters = {}) {
    try {
      setChangeLogsLoading(true);
      setErrorMessage("");

      const params = {
        year,
        ...customFilters,
      };

      if (currentUser?.role === "SUPER_ADMIN") {
        params.portId = currentUser?.port?._id || DEFAULT_PORT_ID;
      }

      const result = await getAdminRestGroupChangeLogs(params);

      if (!result.success) {
        throw new Error(
          result.message || "No se pudo cargar la auditoría de cambios"
        );
      }

      setChangeLogs(result.data?.logs || []);
      setChangeLogsSummary(result.data?.summary || null);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error cargando auditoría de cambios"
      );
    } finally {
      setChangeLogsLoading(false);
    }
  }               

  useEffect(() => {
    loadRestGroups();
    loadSelections();
    loadChangeLogs();
  }, []);

  useEffect(() => {
    setSelectedGroupForWorkers("");
    setGroupAssignmentsData(null);
    loadRestGroups();
  }, [year]);

  function handleSubmit(event) {
    event.preventDefault();
    loadSelections();
  }

  function handleToday() {
    setDate(getTodayText());
    setFromDate("");
    setToDate("");
  }

  function handleCurrentMonth() {
    setDate("");
    setFromDate(getMonthStartText());
    setToDate(getMonthEndText());
  }

  function handleClearDates() {
    setDate("");
    setFromDate("");
    setToDate("");
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-100 p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-500">
              Nominadora / Administración
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-950">
              Descansos trabajadores
            </h1>

            <p className="mt-2 max-w-3xl text-slate-600">
              Consulta los descansos seleccionados por los trabajadores. Estos
              descansos ya bloquean al trabajador en el motor de nombramiento.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSelections}
            className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow hover:bg-slate-700"
          >
            Actualizar
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-6">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Año
              </span>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Fecha exacta
              </span>
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  if (event.target.value) {
                    setFromDate("");
                    setToDate("");
                  }
                }}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-900"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Desde
              </span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  if (event.target.value) {
                    setDate("");
                  }
                }}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-900"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Hasta
              </span>
              <input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.target.value);
                  if (event.target.value) {
                    setDate("");
                  }
                }}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-900"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Nº trabajador
              </span>
              <input
                type="text"
                value={workerCode}
                onChange={(event) => setWorkerCode(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-900"
                placeholder="336"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
                Grupo descanso
            </span>

            <select
                value={restGroupCode}
                onChange={(event) => setRestGroupCode(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900"
            >
                <option value="">Todos</option>

                {restGroups.map((group) => (
                <option key={group.code} value={group.code}>
                    {group.name}
                </option>
                ))}
            </select>
          </label>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow hover:bg-slate-700"
            >
              Buscar
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700 hover:bg-slate-200"
            >
              Hoy
            </button>

            <button
              type="button"
              onClick={handleCurrentMonth}
              className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700 hover:bg-slate-200"
            >
              Mes actual
            </button>

            <button
              type="button"
              onClick={handleClearDates}
              className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700 hover:bg-slate-200"
            >
              Todo el año
            </button>
          </div>
        </form>

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

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Descansos seleccionados
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {restData?.summary?.totalSelections || 0}
            </p>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Trabajadores con descanso
            </p>
            <p className="mt-2 text-3xl font-black text-blue-800">
              {restData?.summary?.workersWithRest || 0}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Filtro activo
            </p>
            <p className="mt-2 text-sm font-black text-slate-900">
              {date
                ? `Fecha ${date}`
                : fromDate || toDate
                ? `${fromDate || "inicio"} → ${toDate || "fin"}`
                : `Año ${year}`}

                {restGroupCode && (
                <span className="mt-1 block text-xs font-bold text-slate-500">
                    Grupo: {restGroupCode}
                </span>
                )}

                {workerCode.trim() && (
                <span className="mt-1 block text-xs font-bold text-slate-500">
                    Trabajador: {workerCode.trim()}
                </span>
                )}
            </p>
          </div>
        </div>
        
        

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 font-bold text-slate-500 shadow-sm">
            Cargando descansos seleccionados...
          </div>
        ) : (
          <RestSelectionsTable selections={selections} />
        )}

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-slate-500">
                Administración de grupos
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Grupos de descanso configurados
              </h2>

              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Consulta qué grupos de descanso existen y qué trabajadores tiene cada
                uno asignado. Más adelante aquí podremos mover trabajadores entre
                grupos y regenerar calendarios.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAssignFormOpen(true);
                setSuccessMessage("");
                setErrorMessage("");
              }}
              className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-sm hover:bg-blue-700"
            >
              Añadir trabajador
            </button>

          </div>

          <AssignWorkerGroupForm
            isOpen={assignFormOpen}
            restGroups={restGroups}
            workerCode={assignWorkerCode}
            setWorkerCode={setAssignWorkerCode}
            restGroupCode={assignRestGroupCode}
            setRestGroupCode={setAssignRestGroupCode}
            notes={assignNotes}
            setNotes={setAssignNotes}
            loading={assignLoading}
            onSubmit={handleAssignWorkerSubmit}
            onCancel={() => {
              setAssignFormOpen(false);
              setAssignWorkerCode("");
              setAssignRestGroupCode("");
              setAssignNotes("");
            }}
          />

          <RestGroupCards
            restGroups={restGroups}
            selectedGroupCode={selectedGroupForWorkers}
            onViewWorkers={loadRestGroupAssignments}
          />

          <div className="mt-5">
            <RestGroupAssignmentsTable
              assignments={groupAssignmentsData?.assignments || []}
              loading={groupAssignmentsLoading}
              onMoveWorker={openMoveWorkerForm}
            />

            <MoveWorkerGroupForm
              moveForm={moveForm}
              restGroups={restGroups}
              moveTargetGroupCode={moveTargetGroupCode}
              setMoveTargetGroupCode={setMoveTargetGroupCode}
              moveReason={moveReason}
              setMoveReason={setMoveReason}
              moveNotes={moveNotes}
              setMoveNotes={setMoveNotes}
              moveLoading={moveLoading}
              onSubmit={handleMoveWorkerSubmit}
              onCancel={closeMoveWorkerForm}
            />

            <RestGroupChangeLogsTable
              logs={changeLogs}
              summary={changeLogsSummary}
              loading={changeLogsLoading}
              restGroups={restGroups}
              workerCode={changeLogsWorkerCode}
              setWorkerCode={setChangeLogsWorkerCode}
              newGroupCode={changeLogsNewGroupCode}
              setNewGroupCode={setChangeLogsNewGroupCode}
              onSearch={() => {
                loadChangeLogs({
                  workerCode: changeLogsWorkerCode.trim() || undefined,
                  newRestGroupCode: changeLogsNewGroupCode || undefined,
                });
              }}
              onClear={() => {
                setChangeLogsWorkerCode("");
                setChangeLogsNewGroupCode("");
                loadChangeLogs();
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
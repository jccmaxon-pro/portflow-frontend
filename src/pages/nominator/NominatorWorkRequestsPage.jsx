import React, { useEffect, useMemo, useState } from "react";
import {
  cancelWorkRequest,
  confirmWorkRequest,
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
  CANCELLED: "Cancelada",
};

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "SUBMITTED", label: "Enviadas" },
  { value: "CONFIRMED", label: "Confirmadas" },
  { value: "CHANGEABLE", label: "Susceptibles" },
  { value: "REJECTED", label: "Rechazadas" },
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

    return groups;
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

      const params = {};

      const result = await getWorkRequests(params);

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

  useEffect(() => {
    loadWorkRequests();
  }, []);

  function updateFilter(fieldName, value) {
    setFilters((currentFilters) => ({
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
              susceptibles y rechazos antes del nombramiento.
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
              Confirmadas
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
            <h2 className="text-lg font-black text-slate-900">Filtros</h2>
            <p className="text-sm text-slate-500">
              Filtra por fecha, estado o turno para preparar el nombramiento.
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
            <div className="space-y-6 p-5">
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
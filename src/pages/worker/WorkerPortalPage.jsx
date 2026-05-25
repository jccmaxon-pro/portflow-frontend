import React, { useEffect, useMemo, useState } from "react";
import { getWorkerNominationView } from "../../api/workerNominationApi";
import NominationVisualResult from "../../components/nomination/NominationVisualResult";

const SCOPE_OPTIONS = [
  {
    value: "today",
    label: "De hoy",
  },
  {
    value: "future",
    label: "Hoy en adelante",
  },
  {
    value: "history",
    label: "Histórico",
  },
];

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("es-ES");
}

function formatShift(shiftCode) {
  if (!shiftCode) {
    return "-";
  }

  return shiftCode.replace("_", " A ");
}

function getTodayInputValue() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getFirstDayOfCurrentMonth() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function getLastDayOfCurrentMonth() {
  const today = new Date();

  const year = today.getFullYear();
  const month = today.getMonth();

  const lastDay = new Date(year, month + 1, 0).getDate();
  const safeMonth = String(month + 1).padStart(2, "0");
  const safeDay = String(lastDay).padStart(2, "0");

  return `${year}-${safeMonth}-${safeDay}`;
}

function AssignmentSummaryTable({ assignments }) {
  if (!assignments || assignments.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
        No tienes asignaciones propias en el rango seleccionado. Si hay nombramientos publicados, podrás verlos completos debajo.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-xl font-black text-slate-900">
          Mis asignaciones
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Resumen rápido de tus jornales publicados.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse">
          <thead>
            <tr className="bg-white text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <th className="px-5 py-4">Fecha</th>
              <th className="px-5 py-4">Turno</th>
              <th className="px-5 py-4">Barco</th>
              <th className="px-5 py-4">Muelle</th>
              <th className="px-5 py-4">Puesto</th>
              <th className="px-5 py-4">Tipo</th>
              <th className="px-5 py-4">Observaciones</th>
            </tr>
          </thead>

          <tbody>
            {assignments.map((assignment, index) => (
              <tr
                key={`${assignment.nominationRunId}-${assignment.shiftCode}-${assignment.positionCode}-${assignment.unitNumber}-${index}`}
                className="border-t border-slate-100"
              >
                <td className="px-5 py-4 font-black text-slate-900">
                  {formatDate(assignment.workDate)}
                </td>

                <td className="px-5 py-4 font-black text-slate-800">
                  {formatShift(assignment.shiftCode)}
                </td>

                <td className="px-5 py-4">
                  <div className="font-black text-slate-900">
                    {assignment.shipName || "-"}
                  </div>
                  <div className="text-xs font-bold text-slate-500">
                    {assignment.taskName || assignment.taskCode || ""}
                  </div>
                </td>

                <td className="px-5 py-4 font-bold text-slate-700">
                  {assignment.berthName || assignment.berth?.name || "-"}
                </td>

                <td className="px-5 py-4">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-black text-blue-800">
                    {assignment.positionCode}
                  </span>
                </td>

                <td className="px-5 py-4 text-sm font-bold text-slate-700">
                  {assignment.coverageType || assignment.phase || "-"}
                </td>

                <td className="max-w-xs px-5 py-4 text-sm text-slate-600">
                  {assignment.reason || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PublishedRunCard({ nominationRun, highlightedWorkerCode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">
            Nombramiento publicado
          </p>

          <h3 className="mt-1 text-2xl font-black text-slate-950">
            {nominationRun.windowName}
          </h3>

          <p className="mt-1 text-sm font-bold text-slate-500">
            {formatDate(nominationRun.workDate)} · {nominationRun.windowCode}
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
          PUBLICADO
        </div>
      </div>

      <NominationVisualResult
        simulationResult={nominationRun.result}
        highlightedWorkerCode={highlightedWorkerCode}
        showRestExclusions={false}
      />
    </section>
  );
}

export default function WorkerPortalPage({ currentUser }) {
  const [scope, setScope] = useState("today");
  const [workerView, setWorkerView] = useState(null);
  const [loading, setLoading] = useState(false);

  const [historyFromDate, setHistoryFromDate] = useState(
    getFirstDayOfCurrentMonth()
  );
  const [historyToDate, setHistoryToDate] = useState(
    getLastDayOfCurrentMonth()
  );

  const [errorMessage, setErrorMessage] = useState("");

  const workerCode = workerView?.worker?.workerCode;

  const publishedRuns = useMemo(() => {
    return workerView?.publishedNominationRuns || [];
  }, [workerView]);

  const summaryAssignments = useMemo(() => {
    return workerView?.summaryAssignments || [];
  }, [workerView]);

  async function loadWorkerView(nextScope = scope) {
    try {
      setLoading(true);
      setErrorMessage("");

      const params = {
        scope: nextScope,
      };

      if (nextScope === "history") {
        params.fromDate = historyFromDate;
        params.toDate = historyToDate;
      }

      const result = await getWorkerNominationView(params);

      if (!result.success) {
        throw new Error(result.message || "No se pudo cargar el portal trabajador");
      }

      setWorkerView(result.data);
    } catch (error) {
      setWorkerView(null);
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error cargando vista trabajador"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkerView(scope);
  }, [scope]);

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-100 p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-500">
              Portal trabajador
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-950">
              Mis nombramientos
            </h1>

            <p className="mt-2 text-slate-600">
              {workerView?.worker?.fullName ||
                currentUser?.worker?.fullName ||
                currentUser?.name ||
                "Trabajador"}{" "}
              · Nº{" "}
              {workerView?.worker?.workerCode ||
                currentUser?.worker?.workerCode ||
                "-"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadWorkerView(scope)}
            className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow hover:bg-slate-700"
          >
            Actualizar
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {SCOPE_OPTIONS.map((option) => {
            const isActive = scope === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setScope(option.value)}
                className={`rounded-2xl px-5 py-3 font-black ${
                  isActive
                    ? "bg-slate-950 text-white"
                    : "bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {scope === "history" && (
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div>
                <label className="block text-sm font-black text-slate-700">
                  Desde
                </label>

                <input
                  type="date"
                  value={historyFromDate}
                  onChange={(event) => setHistoryFromDate(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900 outline-none focus:border-slate-950"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700">
                  Hasta
                </label>

                <input
                  type="date"
                  value={historyToDate}
                  onChange={(event) => setHistoryToDate(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900 outline-none focus:border-slate-950"
                />
              </div>

              <button
                type="button"
                onClick={() => loadWorkerView("history")}
                className="rounded-2xl bg-slate-950 px-6 py-3 font-black text-white shadow hover:bg-slate-700"
              >
                Buscar
              </button>
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-500">
              Se mostrarán los nombramientos completos publicados en el rango,
              salgas o no salgas nombrado. Tus asignaciones aparecerán
              resumidas arriba.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 font-bold text-slate-500 shadow-sm">
            Cargando nombramientos publicados...
          </div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Nombramientos publicados
                </p>
                <p className="mt-2 text-3xl font-black text-slate-950">
                  {workerView?.summary?.publishedNominationRuns || 0}
                </p>
              </div>

              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Mis asignaciones
                </p>
                <p className="mt-2 text-3xl font-black text-blue-800">
                  {workerView?.summary?.ownAssignments || 0}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Nº trabajador
                </p>
                <p className="mt-2 text-3xl font-black text-slate-950">
                  {workerCode || currentUser?.worker?.workerCode || "-"}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <AssignmentSummaryTable assignments={summaryAssignments} />
            </div>

            {publishedRuns.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
                No hay nombramientos publicados en este rango.
              </div>
            ) : (
              <div className="space-y-6">
                {publishedRuns.map((nominationRun) => (
                  <PublishedRunCard
                    key={nominationRun._id}
                    nominationRun={nominationRun}
                    highlightedWorkerCode={
                      workerCode || currentUser?.worker?.workerCode
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
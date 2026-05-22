import React, { useEffect, useMemo, useState } from "react";
import {
  getAdminRestGroups,
  getAdminRestSelections,
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

export default function NominatorWorkerRestsPage({ currentUser }) {
  const [year, setYear] = useState(2026);
  const [date, setDate] = useState("");
  const [fromDate, setFromDate] = useState(getMonthStartText());
  const [toDate, setToDate] = useState(getMonthEndText());
  const [workerCode, setWorkerCode] = useState("");
  const [restGroupCode, setRestGroupCode] = useState("");
  const [restGroups, setRestGroups] = useState([]);

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

  useEffect(() => {
    loadRestGroups();
    loadSelections();
  }, []);

  useEffect(() => {
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
      </section>
    </main>
  );
}
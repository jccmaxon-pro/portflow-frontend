import React, { useEffect, useMemo, useState } from "react";
import {
  cancelRestSelection,
  getMyRestCalendar,
  selectRestDay,
} from "../../api/workerRestApi";

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

function getCurrentYear() {
  return new Date().getFullYear();
}

function RestDayButton({ day, savingDayId, onSelect, onCancel }) {
  const isSaving = savingDayId === day._id || savingDayId === day.selection?._id;

  if (day.isSelected) {
    return (
      <button
        type="button"
        disabled={isSaving || !day.isSelectable}
        onClick={() => onCancel(day)}
        className="rounded-2xl bg-blue-600 px-4 py-3 text-left text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="text-sm font-black">{formatDate(day.date)}</div>
        <div className="mt-1 text-xs font-bold text-blue-100">
          Seleccionado
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={isSaving || !day.isSelectable}
      onClick={() => onSelect(day)}
      className={`rounded-2xl px-4 py-3 text-left shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
        day.isSelectable
          ? "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
          : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
      }`}
    >
      <div className="text-sm font-black">{formatDate(day.date)}</div>
      <div className="mt-1 text-xs font-bold">
        {day.deadlineClosed
          ? "Plazo cerrado"
          : day.isLocked
          ? "Bloqueado"
          : "Disponible"}
      </div>
    </button>
  );
}

function RestBlockCard({ block, savingDayId, onSelect, onCancel }) {
  const deadlineClosed = block.deadlineClosed || !block.canModify;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-950">
              {block.blockLabel || "Bloque de descanso"}
            </h3>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {formatDate(block.blockStartDate)} →{" "}
              {formatDate(block.blockEndDate)}
            </p>

            <p className="mt-2 text-xs font-bold text-slate-500">
              Fecha límite para elegir/cambiar:{" "}
              <span className="text-slate-800">
                {formatDateTime(block.selectionDeadlineAt)}
              </span>
            </p>
          </div>

          <div
            className={`rounded-2xl px-4 py-3 text-sm font-black ${
              block.canModify
                ? "bg-emerald-50 text-emerald-800"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {block.canModify ? "Abierto" : "Cerrado"}
          </div>
        </div>
      </header>

      <div className="p-5">
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Días del bloque
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900">
              {block.availableDays || block.days?.length || 0}
            </p>
          </div>

          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Seleccionados
            </p>
            <p className="mt-1 text-2xl font-black text-blue-800">
              {block.selectedDays || 0}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Estado
            </p>
            <p className="mt-1 text-sm font-black text-slate-900">
              {deadlineClosed ? "No modificable" : "Modificable"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {(block.days || []).map((day) => (
            <RestDayButton
              key={day._id}
              day={day}
              savingDayId={savingDayId}
              onSelect={onSelect}
              onCancel={onCancel}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

export default function WorkerRestPage({ currentUser }) {
  const [year, setYear] = useState(2026);
  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingDayId, setSavingDayId] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const blocks = useMemo(() => {
    return calendar?.blocks || [];
  }, [calendar]);

  async function loadCalendar(selectedYear = year) {
    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await getMyRestCalendar({
        year: selectedYear,
      });

      if (!result.success) {
        throw new Error(result.message || "No se pudo cargar el calendario");
      }

      setCalendar(result.data);
    } catch (error) {
      setCalendar(null);
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error cargando descansos"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCalendar(year);
  }, [year]);

  async function handleSelectDay(day) {
    try {
      setSavingDayId(day._id);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await selectRestDay({
        restEntitlementDayId: day._id,
        notes: "Seleccionado desde portal trabajador",
      });

      if (!result.success) {
        throw new Error(result.message || "No se pudo seleccionar el descanso");
      }

      setSuccessMessage("Descanso seleccionado correctamente");
      await loadCalendar(year);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error seleccionando descanso"
      );
    } finally {
      setSavingDayId(null);
    }
  }

  async function handleCancelDay(day) {
    const selectionId = day.selection?._id;

    if (!selectionId) {
      setErrorMessage("No se encontró la selección de descanso");
      return;
    }

    const confirmed = window.confirm(
      `¿Quieres cancelar el descanso del ${formatDate(day.date)}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSavingDayId(selectionId);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await cancelRestSelection(selectionId);

      if (!result.success) {
        throw new Error(result.message || "No se pudo cancelar el descanso");
      }

      setSuccessMessage("Descanso cancelado correctamente");
      await loadCalendar(year);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error cancelando descanso"
      );
    } finally {
      setSavingDayId(null);
    }
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-100 p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-500">
              Portal trabajador
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-950">
              Mis descansos
            </h1>

            <p className="mt-2 text-slate-600">
              {calendar?.worker?.fullName ||
                currentUser?.worker?.fullName ||
                currentUser?.name ||
                "Trabajador"}{" "}
              · Nº{" "}
              {calendar?.worker?.workerCode ||
                currentUser?.worker?.workerCode ||
                "-"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-900"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>

            <button
              type="button"
              onClick={() => loadCalendar(year)}
              className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow hover:bg-slate-700"
            >
              Actualizar
            </button>
          </div>
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

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 font-bold text-slate-500 shadow-sm">
            Cargando descansos...
          </div>
        ) : calendar ? (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Grupo
                </p>
                <p className="mt-2 text-lg font-black text-slate-950">
                  {calendar.restGroup?.name || "-"}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {calendar.restGroup?.code || ""}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Días disponibles
                </p>
                <p className="mt-2 text-3xl font-black text-slate-950">
                  {calendar.summary?.entitlementDays || 0}
                </p>
              </div>

              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Días seleccionados
                </p>
                <p className="mt-2 text-3xl font-black text-blue-800">
                  {calendar.summary?.selectedDays || 0}
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  Bloques abiertos
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-800">
                  {calendar.summary?.openBlocks || 0}
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800">
              Los descansos se eligen por días sueltos, pero la fecha límite se
              aplica al bloque completo. Si un bloque empieza sábado, el último
              cambio será el jueves a las 23:59. Si empieza miércoles, el último
              cambio será el lunes a las 23:59.
            </div>

            {blocks.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
                No hay descansos disponibles para este año.
              </div>
            ) : (
              <div className="space-y-5">
                {blocks.map((block) => (
                  <RestBlockCard
                    key={block.blockCode}
                    block={block}
                    savingDayId={savingDayId}
                    onSelect={handleSelectDay}
                    onCancel={handleCancelDay}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
            No se ha podido cargar el calendario de descansos.
          </div>
        )}
      </section>
    </main>
  );
}
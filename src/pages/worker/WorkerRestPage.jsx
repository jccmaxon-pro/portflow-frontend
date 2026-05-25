import React, { useEffect, useMemo, useState } from "react";

import {
  cancelRestSelection,
  getMyRestCalendar,
  selectRestDay,
} from "../../api/workerRestApi";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

function getCurrentYear() {
  return new Date().getFullYear();
}

function getInitialMonth(year) {
  const today = new Date();
  const currentYear = today.getFullYear();

  if (Number(year) === currentYear) {
    return today.getMonth();
  }

  return 0;
}

function getDateKey(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("es-ES", {
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

function buildMonthGrid({ year, monthIndex, daysByDate }) {
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));

  const totalDaysInMonth = lastDay.getUTCDate();

  /**
   * getUTCDay():
   * domingo = 0
   * lunes = 1
   *
   * Queremos calendario empezando en lunes:
   * lunes = 0
   * martes = 1
   * ...
   * domingo = 6
   */
  const firstWeekDay = firstDay.getUTCDay();
  const leadingEmptyDays = firstWeekDay === 0 ? 6 : firstWeekDay - 1;

  const cells = [];

  for (let i = 0; i < leadingEmptyDays; i += 1) {
    cells.push({
      type: "empty",
      key: `empty-start-${i}`,
    });
  }

  for (let dayNumber = 1; dayNumber <= totalDaysInMonth; dayNumber += 1) {
    const date = new Date(Date.UTC(year, monthIndex, dayNumber));
    const dateKey = date.toISOString().slice(0, 10);

    cells.push({
      type: "day",
      key: dateKey,
      date,
      dateKey,
      dayNumber,
      restDay: daysByDate.get(dateKey) || null,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      type: "empty",
      key: `empty-end-${cells.length}`,
    });
  }

  return cells;
}

function buildDaysByDate(days = []) {
  const map = new Map();

  for (const day of days) {
    const dateKey = getDateKey(day.date);

    if (!dateKey) {
      continue;
    }

    map.set(dateKey, day);
  }

  return map;
}

function getMonthSummary({ calendar, monthIndex, year }) {
  const days = calendar?.days || [];

  const monthDays = days.filter((day) => {
    const date = new Date(day.date);

    return (
      !Number.isNaN(date.getTime()) &&
      date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() === Number(monthIndex)
    );
  });

  const selectable = monthDays.filter((day) => day.isSelectable).length;
  const selected = monthDays.filter((day) => day.isSelected).length;
  const closed = monthDays.filter(
    (day) => day.deadlineClosed || day.isLocked || !day.isSelectable
  ).length;

  return {
    total: monthDays.length,
    selectable,
    selected,
    closed,
  };
}

function getDayButtonClass({ cell }) {
  const restDay = cell.restDay;

  if (!restDay) {
    return "border-slate-100 bg-white text-slate-300";
  }

  if (restDay.isSelected) {
    return "border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-100";
  }

  if (restDay.isLocked || restDay.deadlineClosed || !restDay.isSelectable) {
    return "border-slate-200 bg-slate-100 text-slate-400";
  }

  return "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400";
}

function getDayStatusLabel(restDay) {
  if (!restDay) {
    return "";
  }

  if (restDay.isSelected) {
    return "Elegido";
  }

  if (restDay.isLocked) {
    return "Bloqueado";
  }

  if (restDay.deadlineClosed || !restDay.isSelectable) {
    return "Cerrado";
  }

  return "Disponible";
}

function SummaryCard({
  label,
  value,
  tone = "default",
  valueSize = "normal",
  title = "",
}) {
  const toneClass =
    tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-white text-slate-950";

  const valueClass =
    valueSize === "small"
      ? "text-xl break-words leading-tight"
      : "text-3xl";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p
        title={title || String(value || "")}
        className={`mt-2 font-black ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-xs font-black text-slate-600 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded-lg border border-emerald-300 bg-emerald-50" />
        <span>Disponible</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded-lg border border-blue-500 bg-blue-600" />
        <span>Elegido para descansar</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded-lg border border-slate-200 bg-slate-100" />
        <span>Cerrado o bloqueado</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded-lg border border-slate-100 bg-white" />
        <span>Día normal</span>
      </div>
    </div>
  );
}

function RestDayModal({
  selectedDay,
  savingDayId,
  onClose,
  onSelect,
  onCancel,
}) {
  if (!selectedDay) {
    return null;
  }

  const isSaving =
    savingDayId === selectedDay._id || savingDayId === selectedDay.selection?._id;

  const canSelect =
    selectedDay.isSelectable &&
    !selectedDay.isSelected &&
    !selectedDay.isLocked &&
    !selectedDay.deadlineClosed;

  const canCancel =
    selectedDay.isSelectable &&
    selectedDay.isSelected &&
    selectedDay.selection?._id &&
    !selectedDay.isLocked &&
    !selectedDay.deadlineClosed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Día de descanso
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-950">
                {formatDate(selectedDay.date)}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div
            className={`rounded-2xl p-4 ${
              selectedDay.isSelected
                ? "bg-blue-50 text-blue-800"
                : selectedDay.isSelectable
                ? "bg-emerald-50 text-emerald-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <p className="text-xs font-black uppercase tracking-wide opacity-70">
              Estado actual
            </p>

            <p className="mt-1 text-lg font-black">
              {getDayStatusLabel(selectedDay)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Bloque
              </p>

              <p className="mt-1 font-black text-slate-950">
                {selectedDay.blockLabel || selectedDay.blockCode || "-"}
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                {formatShortDate(selectedDay.blockStartDate)} →{" "}
                {formatShortDate(selectedDay.blockEndDate)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Límite para cambiar
              </p>

              <p className="mt-1 font-black text-slate-950">
                {formatDateTime(selectedDay.selectionDeadlineAt)}
              </p>
            </div>
          </div>

          {selectedDay.isSelected ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
              Este día está elegido para descansar. El motor de nombramiento no
              debe asignarte ningún turno en esta fecha.
            </div>
          ) : selectedDay.isSelectable ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              Este día está disponible para elegir descanso. Si no lo eliges,
              sigues disponible para trabajar normalmente.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-sm font-bold text-slate-600">
              Este día ya no se puede modificar porque está cerrado o bloqueado.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-2xl bg-white px-5 py-3 font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-50"
          >
            No hacer nada
          </button>

          {canSelect && (
            <button
              type="button"
              onClick={() => onSelect(selectedDay)}
              disabled={isSaving}
              className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Confirmar descanso"}
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel(selectedDay)}
              disabled={isSaving}
              className="rounded-2xl bg-red-600 px-5 py-3 font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {isSaving ? "Cancelando..." : "Cancelar descanso"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthlyRestCalendar({
  year,
  monthIndex,
  calendar,
  savingDayId,
  onPreviousMonth,
  onNextMonth,
  onDayClick,
}) {
  const daysByDate = useMemo(() => {
    return buildDaysByDate(calendar?.days || []);
  }, [calendar]);

  const monthCells = useMemo(() => {
    return buildMonthGrid({
      year,
      monthIndex,
      daysByDate,
    });
  }, [year, monthIndex, daysByDate]);

  const monthSummary = useMemo(() => {
    return getMonthSummary({
      calendar,
      monthIndex,
      year,
    });
  }, [calendar, monthIndex, year]);

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Calendario mensual
            </p>

            <h2 className="mt-1 text-3xl font-black text-slate-950">
              {MONTH_NAMES[monthIndex]} {year}
            </h2>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              Pincha en un día disponible para confirmar o cancelar descanso.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onPreviousMonth}
              className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow-sm hover:bg-slate-700"
            >
              ← Mes anterior
            </button>

            <button
              type="button"
              onClick={onNextMonth}
              className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow-sm hover:bg-slate-700"
            >
              Mes siguiente →
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Disponibles este mes"
            value={monthSummary.total}
            tone="green"
          />

          <SummaryCard
            label="Elegidos este mes"
            value={monthSummary.selected}
            tone="blue"
          />

          <SummaryCard
            label="Cerrados / bloqueados"
            value={monthSummary.closed}
            tone="amber"
          />
        </div>
      </div>

      <CalendarLegend />

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {WEEK_DAYS.map((dayName) => (
            <div
              key={dayName}
              className="px-3 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500"
            >
              {dayName}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {monthCells.map((cell) => {
            if (cell.type === "empty") {
              return (
                <div
                  key={cell.key}
                  className="min-h-[110px] border-b border-r border-slate-100 bg-slate-50/60"
                />
              );
            }

            const restDay = cell.restDay;
            const isSaving =
              restDay &&
              (savingDayId === restDay._id ||
                savingDayId === restDay.selection?._id);

            return (
              <button
                key={cell.key}
                type="button"
                disabled={!restDay || isSaving}
                onClick={() => restDay && onDayClick(restDay)}
                className={`min-h-[110px] border-b border-r p-3 text-left transition disabled:cursor-default ${getDayButtonClass(
                  { cell }
                )}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-lg font-black">{cell.dayNumber}</span>

                  {isSaving && (
                    <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black text-slate-700">
                      ...
                    </span>
                  )}
                </div>

                {restDay ? (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-black">
                      {getDayStatusLabel(restDay)}
                    </p>

                    <p className="line-clamp-2 text-[11px] font-semibold opacity-80">
                      {restDay.blockLabel || restDay.blockCode || ""}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] font-semibold text-slate-300">
                    Sin descanso
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BlockDetailSection({ blocks = [] }) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return null;
  }

  return (
    <details className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer text-lg font-black text-slate-950">
        Ver detalle por bloques
      </summary>

      <div className="mt-5 space-y-4">
        {blocks.map((block) => (
          <article
            key={block.blockCode}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-950">
                  {block.blockLabel || block.blockCode || "Bloque"}
                </h3>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {formatShortDate(block.blockStartDate)} →{" "}
                  {formatShortDate(block.blockEndDate)}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  Límite: {formatDateTime(block.selectionDeadlineAt)}
                </p>
              </div>

              <div
                className={`rounded-2xl px-4 py-2 text-sm font-black ${
                  block.canModify
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {block.canModify ? "Abierto" : "Cerrado"}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(block.days || []).map((day) => (
                <span
                  key={day._id}
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${
                    day.isSelected
                      ? "bg-blue-600 text-white"
                      : day.isSelectable
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {formatShortDate(day.date)} · {getDayStatusLabel(day)}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </details>
  );
}

export default function WorkerRestPage({ currentUser }) {
  const [year, setYear] = useState(2026);
  const [monthIndex, setMonthIndex] = useState(getInitialMonth(2026));

  const [calendar, setCalendar] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

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

  function handleYearChange(event) {
    const selectedYear = Number(event.target.value);

    setYear(selectedYear);
    setMonthIndex(getInitialMonth(selectedYear));
  }

  function handlePreviousMonth() {
    if (monthIndex === 0) {
      setYear((previousYear) => previousYear - 1);
      setMonthIndex(11);
      return;
    }

    setMonthIndex((previousMonth) => previousMonth - 1);
  }

  function handleNextMonth() {
    if (monthIndex === 11) {
      setYear((previousYear) => previousYear + 1);
      setMonthIndex(0);
      return;
    }

    setMonthIndex((previousMonth) => previousMonth + 1);
  }

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
      setSelectedDay(null);

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

    try {
      setSavingDayId(selectionId);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await cancelRestSelection(selectionId);

      if (!result.success) {
        throw new Error(result.message || "No se pudo cancelar el descanso");
      }

      setSuccessMessage("Descanso cancelado correctamente");
      setSelectedDay(null);

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
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
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
              onChange={handleYearChange}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-900"
            >
              <option value={2025}>2025</option>
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
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700">
            {successMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 font-bold text-slate-500 shadow-sm">
            Cargando descansos...
          </div>
        ) : calendar ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard
                label="Grupo descanso"
                value={calendar.restGroup?.name || calendar.restGroup?.code || "-"}
                title={calendar.restGroup?.code || calendar.restGroup?.name || "-"}
                valueSize="small"
              />

              <SummaryCard
                label="Días disponibles año"
                value={calendar.summary?.entitlementDays || 0}
              />

              <SummaryCard
                label="Días elegidos año"
                value={calendar.summary?.selectedDays || 0}
                tone="blue"
              />

              <SummaryCard
                label="Bloques abiertos"
                value={calendar.summary?.openBlocks || 0}
                tone="green"
              />
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800">
              Puedes elegir días sueltos, varios días, todo el bloque o ninguno.
              Si no eliges un día disponible, sigues disponible para trabajar.
            </div>

            <MonthlyRestCalendar
              year={year}
              monthIndex={monthIndex}
              calendar={calendar}
              savingDayId={savingDayId}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
              onDayClick={setSelectedDay}
            />

            <BlockDetailSection blocks={blocks} />
          </>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
            No se ha podido cargar el calendario de descansos.
          </div>
        )}

        <RestDayModal
          selectedDay={selectedDay}
          savingDayId={savingDayId}
          onClose={() => setSelectedDay(null)}
          onSelect={handleSelectDay}
          onCancel={handleCancelDay}
        />
      </section>
    </main>
  );
}
import { useEffect, useState } from "react";

import {
  getMyDoubleAvailability,
  createMyDoubleException,
  deleteMyDoubleException,
} from "../../api/workerDoubleApi";

function getTodayInputValue() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDaysToInputDate(dateText, days) {
  const date = new Date(`${dateText}T00:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + days);

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

  return date.toLocaleDateString("es-ES");
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

function SummaryCard({ label, value, tone = "default" }) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "red"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : "border-slate-200 bg-white text-slate-900";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function DefaultStatusBox({ data }) {
  const defaultAvailable = Boolean(data?.defaultAvailableForDouble);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Estado habitual
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950">
            {defaultAvailable ? "Doblas habitualmente" : "No doblas habitualmente"}
          </h2>

          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Este estado habitual lo usará el motor cuando no exista una
            excepción puntual para una fecha concreta. De momento el trabajador
            solo gestiona excepciones; el cambio habitual lo dejamos para
            nominadora/admin.
          </p>
        </div>

        <div
          className={`rounded-3xl px-6 py-5 text-center ${
            defaultAvailable
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          <p className="text-xs font-black uppercase tracking-wide opacity-70">
            Por defecto
          </p>

          <p className="mt-1 text-2xl font-black">
            {defaultAvailable ? "SÍ DOBLA" : "NO DOBLA"}
          </p>
        </div>
      </div>
    </section>
  );
}

function ExceptionForm({
  defaultAvailableForDouble,
  formDate,
  setFormDate,
  formAvailableForDouble,
  setFormAvailableForDouble,
  formNotes,
  setFormNotes,
  onSubmit,
  saving,
}) {
  const oppositeLabel = defaultAvailableForDouble
    ? "Ese día NO quiero doblar"
    : "Ese día SÍ quiero doblar";

  const defaultLabel = defaultAvailableForDouble
    ? "Ese día mantengo que SÍ doblo"
    : "Ese día mantengo que NO doblo";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-950">
          Añadir excepción puntual
        </h2>

        <p className="mt-1 text-sm font-semibold text-slate-600">
          La excepción cambia tu disponibilidad de doblaje solo para el día
          elegido. Si guardas el mismo estado que tu habitual, se eliminará la
          excepción de ese día.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_1fr_auto] lg:items-end">
        <div>
          <label className="block text-sm font-black text-slate-700">
            Fecha
          </label>

          <input
            type="date"
            value={formDate}
            onChange={(event) => setFormDate(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900 outline-none focus:border-slate-950"
          />
        </div>

        <div>
          <label className="block text-sm font-black text-slate-700">
            Estado ese día
          </label>

          <select
            value={String(formAvailableForDouble)}
            onChange={(event) =>
              setFormAvailableForDouble(event.target.value === "true")
            }
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900 outline-none focus:border-slate-950"
          >
            <option value={String(!defaultAvailableForDouble)}>
              {oppositeLabel}
            </option>

            <option value={String(defaultAvailableForDouble)}>
              {defaultLabel}
            </option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-black text-slate-700">
            Notas
          </label>

          <input
            type="text"
            value={formNotes}
            onChange={(event) => setFormNotes(event.target.value)}
            placeholder="Opcional"
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-900 outline-none focus:border-slate-950"
          />
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="rounded-2xl bg-slate-950 px-6 py-3 font-black text-white shadow hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>

      <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
        Las excepciones deben registrarse con tiempo. Para viernes, sábado,
        domingo y lunes, el límite operativo queda en el jueves anterior por la
        noche. Para el resto de días, mínimo dos días antes por la noche.
      </div>
    </section>
  );
}

function ExceptionsTable({ exceptions, onDelete }) {
  if (!Array.isArray(exceptions) || exceptions.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-black text-slate-950">
          No tienes excepciones activas
        </h2>

        <p className="mt-2 text-sm font-semibold text-slate-600">
          Se aplicará tu estado habitual de doblaje para todos los días.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Excepciones activas
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-600">
            Si borras una excepción, ese día volverá a aplicarse tu estado
            habitual.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Total
          </p>

          <p className="text-2xl font-black text-slate-950">
            {exceptions.length}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Notas</th>
              <th className="px-4 py-3">Plazo límite</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {exceptions.map((item) => {
              const available = Boolean(item.availableForDouble);

              return (
                <tr key={item._id}>
                  <td className="px-4 py-3 font-black text-slate-950">
                    {formatDate(item.date)}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        available
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {available
                        ? "Disponible para doblar"
                        : "No disponible para doblar"}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-semibold text-slate-600">
                    {item.notes || "-"}
                  </td>

                  <td className="px-4 py-3 font-semibold text-slate-600">
                    {formatDateTime(item.deadlineAt)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {item.canDelete ? (
                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="rounded-xl bg-red-50 px-4 py-2 text-xs font-black text-red-700 hover:bg-red-100"
                      >
                        Borrar
                      </button>
                    ) : (
                      <span className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-500">
                        Plazo cerrado
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function WorkerDoublePage() {
  const [doubleData, setDoubleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const initialDate = addDaysToInputDate(getTodayInputValue(), 3);

  const [formDate, setFormDate] = useState(initialDate);
  const [formAvailableForDouble, setFormAvailableForDouble] = useState(false);
  const [formNotes, setFormNotes] = useState("");

  async function loadDoubleAvailability() {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getMyDoubleAvailability();

      if (!result.success) {
        throw new Error(result.message || "No se pudo cargar la gestión de doblajes");
      }

      setDoubleData(result.data);

      const defaultAvailable = Boolean(
        result.data?.defaultAvailableForDouble
      );

      setFormAvailableForDouble(!defaultAvailable);
    } catch (error) {
      setDoubleData(null);
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error cargando gestión de doblajes"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateException() {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await createMyDoubleException({
        date: formDate,
        availableForDouble: formAvailableForDouble,
        notes: formNotes,
      });

      if (!result.success) {
        throw new Error(result.message || "No se pudo guardar la excepción");
      }

      setSuccessMessage(result.message || "Excepción guardada correctamente");
      setFormNotes("");

      await loadDoubleAvailability();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error guardando excepción"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteException(item) {
    const confirmed = window.confirm(
      `¿Seguro que quieres borrar la excepción del ${formatDate(item.date)}? Ese día volverá a aplicarse tu estado habitual.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await deleteMyDoubleException(item._id);

      if (!result.success) {
        throw new Error(result.message || "No se pudo borrar la excepción");
      }

      setSuccessMessage(result.message || "Excepción eliminada correctamente");

      await loadDoubleAvailability();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error borrando excepción"
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadDoubleAvailability();
  }, []);

  const defaultAvailableForDouble = Boolean(
    doubleData?.defaultAvailableForDouble
  );

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-100 p-8">
     <section className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-950">
              Gestión de doblajes
            </h1>

            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Consulta tu estado habitual de doblaje y gestiona excepciones
              puntuales para fechas concretas.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDoubleAvailability}
            disabled={loading}
            className="rounded-2xl bg-white px-5 py-3 font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-bold text-red-800">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-bold text-emerald-800">
          {successMessage}
        </div>
      )}

      {loading && !doubleData && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center font-bold text-slate-600 shadow-sm">
          Cargando gestión de doblajes...
        </div>
      )}

      {doubleData && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              label="Estado habitual"
              value={defaultAvailableForDouble ? "Sí" : "No"}
              tone={defaultAvailableForDouble ? "green" : "default"}
            />

            <SummaryCard
              label="Excepciones"
              value={doubleData.summary?.totalExceptions || 0}
              tone="blue"
            />

            <SummaryCard
              label="No dobla / Sí dobla"
              value={`${doubleData.summary?.notAvailableExceptions || 0} / ${
                doubleData.summary?.availableExceptions || 0
              }`}
            />
          </div>

          <DefaultStatusBox data={doubleData} />

          <ExceptionForm
            defaultAvailableForDouble={defaultAvailableForDouble}
            formDate={formDate}
            setFormDate={setFormDate}
            formAvailableForDouble={formAvailableForDouble}
            setFormAvailableForDouble={setFormAvailableForDouble}
            formNotes={formNotes}
            setFormNotes={setFormNotes}
            onSubmit={handleCreateException}
            saving={saving}
          />

          <ExceptionsTable
            exceptions={doubleData.exceptions || []}
            onDelete={handleDeleteException}
          />
        </>
      )}
    </section>
   </main>
  );
}
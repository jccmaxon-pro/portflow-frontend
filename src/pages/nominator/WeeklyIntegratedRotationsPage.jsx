import React, { useEffect, useMemo, useState } from "react";
import {
  disableWeeklyIntegratedRotation,
  enableWeeklyIntegratedRotation,
  getWeeklyIntegratedRotationsByPort,
  updateWeeklyIntegratedRotation,
} from "../../api/weeklyIntegratedRotationApi";

const MALAGA_PORT_ID = "69f210fe5417a1641d23188d";

function getPortId(currentUser) {
  return (
    currentUser?.port?._id ||
    currentUser?.port ||
    currentUser?.company?.port?._id ||
    currentUser?.company?.port ||
    MALAGA_PORT_ID
  );
}

function getRotationTitle(rotation) {
  if (rotation.mainRotationListCode === "GRUISTAS_PRINCIPAL") {
    return "Gruistas";
  }

  if (rotation.mainRotationListCode === "REACH_STACKER_PRINCIPAL") {
    return "Reach stacker";
  }

  return rotation.name || rotation.mainRotationListCode;
}

function RotationCard({ rotation, onToggle, onEdit }) {
  const currentCodes = rotation.currentWeek?.substituteWorkerCodes || [];
  const nextCodes = rotation.nextWeek?.substituteWorkerCodes || [];
  const slots = rotation.insertionSlots || [];

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div
            className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
              rotation.isEnabled
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {rotation.isEnabled ? "Activa" : "Desactivada"}
          </div>

          <h2 className="text-2xl font-black text-slate-900">
            {getRotationTitle(rotation)}
          </h2>

          <p className="mt-1 text-sm font-bold text-slate-500">
            {rotation.mainRotationListCode} +{" "}
            {rotation.substituteRotationListCode}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(rotation)}
            className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => onToggle(rotation)}
            className={`rounded-2xl px-4 py-2 text-sm font-black ${
              rotation.isEnabled
                ? "bg-red-50 text-red-700 hover:bg-red-100"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {rotation.isEnabled ? "Desactivar" : "Activar"}
          </button>

        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
            Semana actual
          </h3>

          <p className="mt-1 text-sm font-bold text-slate-700">
            {rotation.currentWeek?.startDateKey} →{" "}
            {rotation.currentWeek?.endDateKey}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {currentCodes.length === 0 ? (
              <span className="text-sm font-bold text-slate-400">
                Sin suplentes configurados
              </span>
            ) : (
              currentCodes.map((workerCode, index) => (
                <span
                  key={`${workerCode}-${index}`}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white"
                >
                  {workerCode}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
            Próxima semana
          </h3>

          <p className="mt-1 text-sm font-bold text-slate-700">
            {rotation.nextWeek?.startDateKey} → {rotation.nextWeek?.endDateKey}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {nextCodes.length === 0 ? (
              <span className="text-sm font-bold text-slate-400">
                Sin suplentes configurados
              </span>
            ) : (
              nextCodes.map((workerCode, index) => (
                <span
                  key={`${workerCode}-${index}`}
                  className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm"
                >
                  {workerCode}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 p-4">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
          Posiciones de inserción
        </h3>

        <div className="mt-4 space-y-2">
          {slots.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
              No hay posiciones configuradas.
            </div>
          ) : (
            slots
              .slice()
              .sort((a, b) => Number(a.slotIndex) - Number(b.slotIndex))
              .map((slot) => {
                const weeklyWorker =
                  currentCodes[Number(slot.slotIndex) - 1] || "—";

                return (
                  <div
                    key={slot.slotIndex}
                    className="flex items-center justify-center gap-4 rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <span className="w-28 text-right text-sm font-black text-slate-700">
                      después de {slot.insertAfterWorkerCode}
                    </span>

                    <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-800">
                      {weeklyWorker}
                    </span>

                    <span className="w-32 text-sm font-bold text-slate-500">
                      suplente {slot.slotIndex}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      </div>

      <div className="mt-4 text-xs font-bold text-slate-400">
        Cambio semanal: {rotation.weeklyStartDay} · Suplentes por semana:{" "}
        {rotation.substitutesPerWeek}
      </div>
    </article>
  );
}

export default function WeeklyIntegratedRotationsPage({ currentUser }) {
  const [rotations, setRotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingRotation, setEditingRotation] = useState(null);

  const portId = useMemo(() => getPortId(currentUser), [currentUser]);

  async function loadRotations() {
    try {
      setLoading(true);
      setErrorMessage("");

      if (!portId) {
        throw new Error("No se pudo determinar el puerto del usuario");
      }

      const result = await getWeeklyIntegratedRotationsByPort(portId);

      if (!result.success) {
        throw new Error(result.message || "No se pudieron cargar rotaciones");
      }

      setRotations(result.data || []);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error cargando rotaciones semanales"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRotations();
  }, [portId]);

  async function handleToggle(rotation) {
    try {
      setSavingId(rotation.rotationId);
      setErrorMessage("");

      const confirmed = window.confirm(
        rotation.isEnabled
          ? `¿Desactivar la rotación semanal de ${getRotationTitle(rotation)}?`
          : `¿Activar la rotación semanal de ${getRotationTitle(rotation)}?`
      );

      if (!confirmed) {
        return;
      }

      const result = rotation.isEnabled
        ? await disableWeeklyIntegratedRotation(rotation.rotationId)
        : await enableWeeklyIntegratedRotation(rotation.rotationId);

      if (!result.success) {
        throw new Error(result.message || "No se pudo actualizar la rotación");
      }

      await loadRotations();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error actualizando rotación"
      );
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveRotationConfig(event) {
    event.preventDefault();

    if (!editingRotation) {
      return;
    }

    try {
      setSavingId(editingRotation.rotationId);
      setErrorMessage("");

      const payload = {
        substitutesPerWeek: Number(editingRotation.substitutesPerWeek) || 1,
        weeklyStartDay: editingRotation.weeklyStartDay || "THURSDAY",
        insertionSlots: (editingRotation.insertionSlots || []).map((slot) => ({
          slotIndex: Number(slot.slotIndex),
          insertAfterWorkerCode: String(slot.insertAfterWorkerCode || "").trim(),
        })),
      };

      const result = await updateWeeklyIntegratedRotation(
        editingRotation.rotationId,
        payload
      );

      if (!result.success) {
        throw new Error(result.message || "No se pudo guardar la configuración");
      }

      setEditingRotation(null);
      await loadRotations();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error guardando configuración"
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-100 p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">
            Nombramiento
          </p>

          <h1 className="mt-1 text-3xl font-black text-slate-950">
            Suplentes semanales
          </h1>

          <p className="mt-2 max-w-4xl text-slate-600">
            Seguimiento de suplentes integrados temporalmente en listas
            principales. Si una rotación se desactiva, el motor usará la lista
            principal normal y los suplentes solo entrarán como suplentes al
            final.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl bg-white p-8 font-black text-slate-700 shadow-sm">
            Cargando rotaciones semanales...
          </div>
        ) : rotations.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-slate-600 shadow-sm">
            No hay rotaciones semanales configuradas todavía.
          </div>
        ) : (
          <div className="grid gap-5">
            {rotations.map((rotation) => (
              <RotationCard
                key={rotation.rotationId}
                rotation={rotation}
                saving={savingId === rotation.rotationId}
                onToggle={handleToggle}
                onEdit={setEditingRotation}
              />
            ))}
          </div>
        )}

        {editingRotation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <form
              onSubmit={handleSaveRotationConfig}
              className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Editar rotación
                  </h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {editingRotation.mainRotationListCode}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingRotation(null)}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Suplentes por semana
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={editingRotation.substitutesPerWeek}
                    onChange={(event) =>
                      setEditingRotation((current) => ({
                        ...current,
                        substitutesPerWeek: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Día de cambio semanal
                  </span>
                  <select
                    value={editingRotation.weeklyStartDay}
                    onChange={(event) =>
                      setEditingRotation((current) => ({
                        ...current,
                        weeklyStartDay: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                  >
                    <option value="MONDAY">Lunes</option>
                    <option value="TUESDAY">Martes</option>
                    <option value="WEDNESDAY">Miércoles</option>
                    <option value="THURSDAY">Jueves</option>
                    <option value="FRIDAY">Viernes</option>
                    <option value="SATURDAY">Sábado</option>
                    <option value="SUNDAY">Domingo</option>
                  </select>
                </label>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
                  Posiciones de inserción
                </h3>

                <div className="mt-4 space-y-3">
                  {(editingRotation.insertionSlots || []).map((slot, index) => (
                    <div
                      key={`${slot.slotIndex}-${index}`}
                      className="grid gap-3 md:grid-cols-[120px_1fr]"
                    >
                      <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">
                        Suplente {slot.slotIndex}
                      </div>

                      <label className="block">
                        <input
                          value={slot.insertAfterWorkerCode}
                          onChange={(event) =>
                            setEditingRotation((current) => ({
                              ...current,
                              insertionSlots: current.insertionSlots.map(
                                (currentSlot, currentIndex) =>
                                  currentIndex === index
                                    ? {
                                        ...currentSlot,
                                        insertAfterWorkerCode: event.target.value,
                                      }
                                    : currentSlot
                              ),
                            }))
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                          placeholder="Insertar después del trabajador..."
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingRotation(null)}
                  className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingId === editingRotation.rotationId}
                  className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {savingId === editingRotation.rotationId
                    ? "Guardando..."
                    : "Guardar configuración"}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
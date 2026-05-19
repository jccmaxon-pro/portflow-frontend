import React, { useEffect, useMemo, useState } from "react";
import {
  cancelWorkRequest,
  createWorkRequest,
  getWorkRequests,
  updateWorkRequest,
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

const SHIFT_OPTIONS = [
  { value: "02_08", label: "02 A 08" },
  { value: "08_14", label: "08 A 14" },
  { value: "08_18", label: "08 A 18" },
  { value: "14_20", label: "14 A 20" },
  { value: "18_24", label: "18 A 24" },
  { value: "20_02", label: "20 A 02" },
];

const QUICK_TEMPLATES = [
  {
    id: "CONT_1",
    name: "Contenedores - 1 mano",
    taskCode: "CONT",
    taskName: "Contenedores",
    requiredPositions: [
      { positionCode: "JEFE_PARCELA", quantity: 1, notes: "" },
      { positionCode: "CAPATAZ", quantity: 1, notes: "" },
      { positionCode: "ANOTADOR", quantity: 1, notes: "" },
      { positionCode: "GRUA", quantity: 1, notes: "" },
      { positionCode: "REACH_STACKER", quantity: 2, notes: "" },
      { positionCode: "TRAILER", quantity: 4, notes: "" },
      { positionCode: "BORDO", quantity: 1, notes: "" },
      { positionCode: "TIERRA", quantity: 2, notes: "" },
      { positionCode: "TRINCA", quantity: 4, notes: "" },
    ],
  },
  {
    id: "CONT_2",
    name: "Contenedores - 2 manos",
    taskCode: "CONT",
    taskName: "Contenedores",
    requiredPositions: [
      { positionCode: "JEFE_PARCELA", quantity: 1, notes: "" },
      { positionCode: "CAPATAZ", quantity: 2, notes: "" },
      { positionCode: "ANOTADOR", quantity: 2, notes: "" },
      { positionCode: "GRUA", quantity: 3, notes: "" },
      { positionCode: "REACH_STACKER", quantity: 5, notes: "" },
      { positionCode: "TRAILER", quantity: 8, notes: "" },
      { positionCode: "BORDO", quantity: 2, notes: "" },
      { positionCode: "TIERRA", quantity: 4, notes: "" },
      { positionCode: "TRINCA", quantity: 8, notes: "" },
    ],
  },
  {
    id: "CONT_3",
    name: "Contenedores - 3 manos",
    taskCode: "CONT",
    taskName: "Contenedores",
    requiredPositions: [
      { positionCode: "JEFE_PARCELA", quantity: 1, notes: "" },
      { positionCode: "CAPATAZ", quantity: 3, notes: "" },
      { positionCode: "ANOTADOR", quantity: 3, notes: "" },
      { positionCode: "GRUA", quantity: 5, notes: "" },
      { positionCode: "REACH_STACKER", quantity: 8, notes: "" },
      { positionCode: "TRAILER", quantity: 12, notes: "" },
      { positionCode: "BORDO", quantity: 3, notes: "" },
      { positionCode: "TIERRA", quantity: 6, notes: "" },
      { positionCode: "TRINCA", quantity: 12, notes: "" },
    ],
  },
  {
    id: "RORO",
    name: "RO-RO / MAFI",
    taskCode: "BARCO_RO-RO",
    taskName: "Barco RO-RO",
    requiredPositions: [
      { positionCode: "CAPATAZ", quantity: 1, notes: "" },
      { positionCode: "MAFI", quantity: 3, notes: "" },
    ],
  },
];

const DEFAULT_FORM = {
  shipName: "",
  workDate: "",
  shiftCode: "14_20",
  taskCode: "CONT",
  taskName: "Contenedores",
  berthCode: "M9",
  berthName: "Muelle 9",
  berthOrder: 2,
  observations: "",
  templateId: "CONT_2",
  requiredPositions: QUICK_TEMPLATES[1].requiredPositions,
  isChangeable: false,
};

function formatDate(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toISOString().slice(0, 10);
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "Sin estado";
}

function canCompanyEditRequest(workRequest) {
  return ["DRAFT", "SUBMITTED", "REVIEWED"].includes(workRequest?.status);
}

function canShiftBeChangeable(shiftCode) {
  return ["08_14", "08_18"].includes(shiftCode);
}

function buildRequestPayload(form) {
  const shouldBeChangeable =
    form.isChangeable && canShiftBeChangeable(form.shiftCode);

  return {
    shipName: form.shipName,
    workDate: form.workDate,
    shiftCode: form.shiftCode,
    taskCode: form.taskCode,
    taskName: form.taskName,
    berth: {
      code: form.berthCode,
      name: form.berthName,
      number: null,
      order: Number(form.berthOrder || 999),
    },
    shipContinuity: "NEW_SHIP",
    keepPreviousWorkersIfPossible: false,

    /**
     * Si la empresa marca susceptible y el turno lo permite,
     * la solicitud nace como CHANGEABLE.
     *
     * Esto permite al motor nombrarla al final.
     */
    status: shouldBeChangeable ? "CHANGEABLE" : "SUBMITTED",

    /**
     * Aunque sea CHANGEABLE, de momento no la hacemos visible a trabajadores
     * desde el portal de empresa. La visibilidad real la controlará nominación.
     */
    visibleToWorkers: false,

    requiredPositions: form.requiredPositions,
    observations: form.observations,
  };
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

  return <span className={`${baseClass} ${statusClass}`}>{getStatusLabel(status)}</span>;
}

export default function CompanyWorkRequestsPage({ currentUser }) {
  const [workRequests, setWorkRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const [editingRequest, setEditingRequest] = useState(null);
  const [editObservations, setEditObservations] = useState("");

  const sortedWorkRequests = useMemo(() => {
    return [...workRequests].sort((a, b) => {
      const dateA = new Date(a.workDate).getTime();
      const dateB = new Date(b.workDate).getTime();

      if (dateA !== dateB) return dateB - dateA;

      return String(a.shiftCode || "").localeCompare(String(b.shiftCode || ""));
    });
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

  useEffect(() => {
    loadWorkRequests();
  }, []);

  function handleTemplateChange(templateId) {
    const template = QUICK_TEMPLATES.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      templateId,
      taskCode: template.taskCode,
      taskName: template.taskName,
      requiredPositions: template.requiredPositions,
    }));
  }

  function updateRequiredPositionQuantity(positionCode, quantity) {
    setForm((currentForm) => ({
      ...currentForm,
      requiredPositions: currentForm.requiredPositions.map((position) => {
        if (position.positionCode !== positionCode) {
          return position;
        }

        return {
          ...position,
          quantity: Number(quantity || 0),
        };
      }),
    }));
  }

  async function handleCreateWorkRequest(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!form.shipName.trim()) {
        throw new Error("Debes indicar el nombre del barco");
      }

      if (!form.workDate) {
        throw new Error("Debes indicar la fecha de trabajo");
      }

      const payload = buildRequestPayload(form);

      const result = await createWorkRequest(payload);

      if (!result.success) {
        throw new Error(result.message || "No se pudo crear la solicitud");
      }

      setSuccessMessage("Solicitud creada correctamente");
      setShowForm(false);
      setForm(DEFAULT_FORM);

      await loadWorkRequests();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error creando solicitud"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingRequest) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await updateWorkRequest(editingRequest._id, {
        observations: editObservations,
      });

      if (!result.success) {
        throw new Error(result.message || "No se pudo actualizar la solicitud");
      }

      setSuccessMessage("Solicitud actualizada correctamente");
      setEditingRequest(null);
      setEditObservations("");

      await loadWorkRequests();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error actualizando solicitud"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelRequest(workRequest) {
    const confirmed = window.confirm(
      `¿Seguro que quieres cancelar la solicitud de ${workRequest.shipName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await cancelWorkRequest(workRequest._id);

      if (!result.success) {
        throw new Error(result.message || "No se pudo cancelar la solicitud");
      }

      setSuccessMessage("Solicitud cancelada correctamente");

      await loadWorkRequests();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error cancelando solicitud"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-100 p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-500">
              Portal empresa
            </p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">
              Mis solicitudes de trabajo
            </h1>
            <p className="mt-2 text-slate-600">
              {currentUser?.company?.name || "Empresa"} puede crear, revisar y
              modificar sus solicitudes mientras no estén confirmadas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow hover:bg-slate-700"
          >
            {showForm ? "Cerrar formulario" : "Nueva solicitud"}
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

        {showForm && (
          <form
            onSubmit={handleCreateWorkRequest}
            className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Nueva solicitud rápida
                </h2>
                <p className="text-sm text-slate-500">
                  Elige una plantilla y ajusta cantidades si hace falta.
                </p>
              </div>

              <select
                value={form.templateId}
                onChange={(event) => handleTemplateChange(event.target.value)}
                className="rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-900"
              >
                {QUICK_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Barco
                </span>
                <input
                  value={form.shipName}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      shipName: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                  placeholder="MSC..."
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Fecha
                </span>
                <input
                  type="date"
                  value={form.workDate}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      workDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Turno
                </span>
                <select
                    value={form.shiftCode}
                    onChange={(event) => {
                        const nextShiftCode = event.target.value;

                        setForm((currentForm) => ({
                            ...currentForm,
                            shiftCode: nextShiftCode,
                            isChangeable: canShiftBeChangeable(nextShiftCode)
                                ? currentForm.isChangeable
                                : false,
                        }));
                    }}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                >
                  {SHIFT_OPTIONS.map((shift) => (
                    <option key={shift.value} value={shift.value}>
                      {shift.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <label className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        checked={form.isChangeable}
                        disabled={!canShiftBeChangeable(form.shiftCode)}
                        onChange={(event) =>
                            setForm((currentForm) => ({
                                ...currentForm,
                                isChangeable: event.target.checked,
                            }))
                        }
                        className="mt-1 h-5 w-5"
                    />

                    <div>
                        <div className="font-black text-amber-900">
                            Solicitud susceptible de cambio
                        </div>

                        <p className="mt-1 text-sm text-amber-800">
                            Úsalo para trabajos de mañana que pueden confirmarse, modificarse o
                            anularse más tarde según avance el barco. Normalmente aplica a 08_14 y
                            08_18.
                        </p>

                        {!canShiftBeChangeable(form.shiftCode) && (
                            <p className="mt-2 text-sm font-bold text-amber-900">
                                Este turno no admite susceptible de cambio desde el portal de empresa.
                            </p>
                        )}
                    </div>
                </label>
            </div>      
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Muelle
                </span>
                <input
                  value={form.berthName}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      berthName: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Código muelle
                </span>
                <input
                  value={form.berthCode}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      berthCode: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Orden muelle
                </span>
                <input
                  type="number"
                  value={form.berthOrder}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      berthOrder: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                />
              </label>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <h3 className="mb-3 font-black text-slate-900">
                Puestos solicitados
              </h3>

              <div className="grid gap-3 md:grid-cols-3">
                {form.requiredPositions.map((position) => (
                  <label
                    key={position.positionCode}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3"
                  >
                    <span className="text-sm font-black text-slate-700">
                      {position.positionCode}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={position.quantity}
                      onChange={(event) =>
                        updateRequiredPositionQuantity(
                          position.positionCode,
                          event.target.value
                        )
                      }
                      className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-right font-black text-slate-900"
                    />
                  </label>
                ))}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Observaciones
              </span>
              <textarea
                value={form.observations}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    observations: event.target.value,
                  }))
                }
                className="min-h-24 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                placeholder="Comentarios para nombramiento..."
              />
            </label>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Crear solicitud"}
              </button>
            </div>
          </form>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-black text-slate-900">
              Solicitudes registradas
            </h2>
          </div>

          {loading ? (
            <div className="p-8 font-bold text-slate-600">
              Cargando solicitudes...
            </div>
          ) : sortedWorkRequests.length === 0 ? (
            <div className="p-8 text-slate-600">
              Todavía no hay solicitudes vinculadas a esta empresa.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4">Turno</th>
                    <th className="px-5 py-4">Barco</th>
                    <th className="px-5 py-4">Trabajo</th>
                    <th className="px-5 py-4">Muelle</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedWorkRequests.map((workRequest) => {
                    const editable = canCompanyEditRequest(workRequest);

                    return (
                      <tr
                        key={workRequest._id}
                        className="border-t border-slate-100"
                      >
                        <td className="px-5 py-4 text-sm font-bold text-slate-800">
                          {formatDate(workRequest.workDate)}
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-800">
                          {workRequest.shiftCode}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-black text-slate-900">
                            {workRequest.shipName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {workRequest.requestingCompany?.name ||
                              workRequest.requestingCompanyName}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {workRequest.taskName}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {workRequest.berth?.name || "-"}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={workRequest.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={!editable}
                              onClick={() => {
                                setEditingRequest(workRequest);
                                setEditObservations(
                                  workRequest.observations || ""
                                );
                              }}
                              className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              disabled={!editable}
                              onClick={() => handleCancelRequest(workRequest)}
                              className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Cancelar
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
        </div>

        {editingRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
              <h2 className="text-xl font-black text-slate-900">
                Editar solicitud
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {editingRequest.shipName} · {formatDate(editingRequest.workDate)} ·{" "}
                {editingRequest.shiftCode}
              </p>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Observaciones
                </span>
                <textarea
                  value={editObservations}
                  onChange={(event) => setEditObservations(event.target.value)}
                  className="min-h-32 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                />
              </label>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingRequest(null);
                    setEditObservations("");
                  }}
                  className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700 hover:bg-slate-200"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveEdit}
                  className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
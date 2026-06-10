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

const BERTH_OPTIONS = [
  { id: "M1", code: "M1", name: "Muelle 1", order: 1 },
  { id: "M2", code: "M2", name: "Muelle 2", order: 2 },
  { id: "M3", code: "M3", name: "Muelle 3", order: 3 },
  { id: "M4", code: "M4", name: "Muelle 4", order: 4 },
  { id: "M5", code: "M5", name: "Muelle 5", order: 5 },
  { id: "M6", code: "M6", name: "Muelle 6", order: 6 },
  { id: "M7", code: "M7", name: "Muelle 7", order: 7 },
  { id: "M8", code: "M8", name: "Muelle 8", order: 8 },
  { id: "M9_1", code: "M9.1", name: "Muelle 9.1", order: 9.1 },
  { id: "M9_2", code: "M9.2", name: "Muelle 9.2", order: 9.2 },
  { id: "M9_3", code: "M9.3", name: "Muelle 9.3", order: 9.3 },
  { id: "M9_4", code: "M9.4", name: "Muelle 9.4", order: 9.4 },
];

const QUICK_TEMPLATES = [
  {
    id: "CONT_REMOCION",
    name: "Contenedores - Remocion",
    taskCode: "CONT",
    taskName: "Contenedores",
    requiredPositions: [
      { positionCode: "JEFE_PARCELA", quantity: 1, notes: "" },
      { positionCode: "REACH_STACKER", quantity: 3, notes: "" },
    ],
  },
  {
    id: "CONT_REMOCION_MAFIS",
    name: "Contenedores - Remocion y mafis",
    taskCode: "CONT",
    taskName: "Contenedores",
    requiredPositions: [
      { positionCode: "JEFE_PARCELA", quantity: 1, notes: "" },
      { positionCode: "REACH_STACKER", quantity: 3, notes: "" },
      { positionCode: "TRAILER", quantity: 2, notes: "" },
    ],
  },
  {
    id: "CONT_1",
    name: "Contenedores - 1 mano",
    taskCode: "CONT",
    taskName: "Contenedores",
    requiredPositions: [
      { positionCode: "JEFE_PARCELA", quantity: 1, notes: "" },
      { positionCode: "REACH_STACKER", quantity: 2, notes: "" },
      { positionCode: "CAPATAZ", quantity: 1, notes: "" },
      { positionCode: "ANOTADOR", quantity: 1, notes: "" },
      { positionCode: "GRUA", quantity: 1, notes: "" },
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
      { positionCode: "REACH_STACKER", quantity: 5, notes: "" },
      { positionCode: "CAPATAZ", quantity: 2, notes: "" },
      { positionCode: "ANOTADOR", quantity: 2, notes: "" },
      { positionCode: "GRUA", quantity: 3, notes: "" },
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
      { positionCode: "REACH_STACKER", quantity: 8, notes: "" },
      { positionCode: "CAPATAZ", quantity: 3, notes: "" },
      { positionCode: "ANOTADOR", quantity: 3, notes: "" },
      { positionCode: "GRUA", quantity: 5, notes: "" },
      { positionCode: "TRAILER", quantity: 12, notes: "" },
      { positionCode: "BORDO", quantity: 3, notes: "" },
      { positionCode: "TIERRA", quantity: 6, notes: "" },
      { positionCode: "TRINCA", quantity: 12, notes: "" },
    ],
  },
    {
    id: "BARCO_COCHES",
    name: "BARCO COCHES",
    taskCode: "BARCO_COCHES",
    taskName: "Barco Coches",
    requiredPositions: [
      { positionCode: "CAPATAZ", quantity: 1, notes: "" },
      { positionCode: "ANOTADOR", quantity: 1, notes: "" },
      { positionCode: "CONDUCTORES", quantity: 16, notes: "" },
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
  {
    id: "GRANEL",
    name: "Granel básico",
    taskCode: "GRANEL",
    taskName: "Granel",
    requiredPositions: [
      { positionCode: "CAPATAZ", quantity: 1, notes: "" },
      { positionCode: "GRUA", quantity: 1, notes: "" },
      { positionCode: "AYUDANTE_GRUA", quantity: 1, notes: "" },
      { positionCode: "PALA", quantity: 1, notes: "" },
      { positionCode: "BORDO", quantity: 1, notes: "" },
    ],
  },
];

const createEmptyPlanLine = ({
  workDate = "",
  shiftCode = "14_20",
  templateId = "CONT_2",
} = {}) => {
  return {
    id: crypto.randomUUID(),
    workDate,
    shiftCode,
    templateId,
    requiredPositions: cloneTemplatePositions(templateId),
    isChangeable: false,
    observations: "",
  };
};

const DEFAULT_FORM = {
  shipName: "",
  berthId: "M9_1",
  berthCode: "M9.1",
  berthName: "Muelle 9.1",
  berthOrder: 9.1,
  generalObservations: "",
  lines: [
    createEmptyPlanLine({
      shiftCode: "14_20",
      templateId: "CONT_2",
    }),
  ],
};

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

function canCompanyEditRequest(workRequest) {
  return ["DRAFT", "SUBMITTED", "REVIEWED"].includes(workRequest?.status);
}

function canShiftBeChangeable(shiftCode) {
  return ["08_14", "08_18"].includes(shiftCode);
}

function getTemplateById(templateId) {
  return (
    QUICK_TEMPLATES.find((template) => template.id === templateId) ||
    QUICK_TEMPLATES[1]
  );
}

function cloneTemplatePositions(templateId) {
  const template = getTemplateById(templateId);

  return template.requiredPositions.map((position) => ({
    ...position,
    quantity: Number(position.quantity) || 0,
  }));
}

function cloneRequiredPositions(requiredPositions) {
  return (requiredPositions || []).map((position) => ({
    positionCode: position.positionCode,
    quantity: Number(position.quantity || 0),
    notes: position.notes || "",
  }));
}

function buildRequestPayloadFromLine({ form, line }) {
  const template = getTemplateById(line.templateId);

  const shouldBeChangeable =
    line.isChangeable && canShiftBeChangeable(line.shiftCode);

  const observationsParts = [];

  if (form.generalObservations?.trim()) {
    observationsParts.push(form.generalObservations.trim());
  }

  if (line.observations?.trim()) {
    observationsParts.push(line.observations.trim());
  }

  return {
    shipName: form.shipName,
    workDate: line.workDate,
    shiftCode: line.shiftCode,
    taskCode: template.taskCode,
    taskName: template.taskName,
    berth: {
      code: form.berthCode,
      name: form.berthName,
      number: null,
      order: Number(form.berthOrder || 999),
    },
    shipContinuity: "NEW_SHIP",
    keepPreviousWorkersIfPossible: false,
    status: shouldBeChangeable ? "CHANGEABLE" : "SUBMITTED",
    visibleToWorkers: false,
    requiredPositions: cloneRequiredPositions(
      line.requiredPositions || template.requiredPositions
    ).filter((position) => position.quantity > 0),
    observations: observationsParts.join(" | "),
  };
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
      const shipCompare = String(a.shipName || "").localeCompare(
        String(b.shipName || "")
      );

      if (shipCompare !== 0) {
        return shipCompare;
      }

      const berthCompare = String(a.berth?.name || "").localeCompare(
        String(b.berth?.name || "")
      );

      if (berthCompare !== 0) {
        return berthCompare;
      }

      const dateA = new Date(a.workDate).getTime();
      const dateB = new Date(b.workDate).getTime();

      if (dateA !== dateB) {
        return dateA - dateB;
      }

      return getShiftSortOrder(a.shiftCode) - getShiftSortOrder(b.shiftCode);
    });
  }, [workRequests]);

  const groupedWorkRequests = useMemo(() => {
    const groups = [];

    for (const workRequest of sortedWorkRequests) {
      const key = [
        workRequest.shipName || "SIN_BARCO",
        workRequest.berth?.name || "SIN_MUELLE",
      ].join("|");

      let group = groups.find((item) => item.key === key);

      if (!group) {
        group = {
          key,
          shipName: workRequest.shipName || "Sin barco",
          berthName: workRequest.berth?.name || "-",
          berthCode: workRequest.berth?.code || "-",
          items: [],
        };

        groups.push(group);
      }

      group.items.push(workRequest);
    }

    return groups.map((group) => {
      const dates = group.items
        .map((item) => formatDate(item.workDate))
        .filter((date, index, array) => array.indexOf(date) === index);

      const statusSummary = group.items.reduce((acc, item) => {
        const status = item.status || "SIN_ESTADO";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      return {
        ...group,
        dates,
        statusSummary,
      };
    });
  }, [sortedWorkRequests]);

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

  function updateFormField(fieldName, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value,
    }));
  }

  function updateSelectedBerth(berthId) {
    const selectedBerth =
      BERTH_OPTIONS.find((berth) => berth.id === berthId) || BERTH_OPTIONS[0];

    setForm((currentForm) => ({
      ...currentForm,
      berthId: selectedBerth.id,
      berthCode: selectedBerth.code,
      berthName: selectedBerth.name,
      berthOrder: selectedBerth.order,
    }));
  }

  function updatePlanLine(lineId, changes) {
    setForm((currentForm) => ({
      ...currentForm,
      lines: currentForm.lines.map((line) => {
        if (line.id !== lineId) {
          return line;
        }

        const nextLine = {
          ...line,
          ...changes,
        };

        if (
          Object.prototype.hasOwnProperty.call(changes, "shiftCode") &&
          !canShiftBeChangeable(changes.shiftCode)
        ) {
          nextLine.isChangeable = false;
        }

        return nextLine;
      }),
    }));
  }

  function updatePlanLinePositionQuantity(lineId, positionCode, quantity) {
    const safeQuantity = Math.max(0, Number(quantity) || 0);

    setForm((currentForm) => ({
      ...currentForm,
      lines: currentForm.lines.map((line) => {
        if (line.id !== lineId) {
          return line;
        }

        return {
          ...line,
          requiredPositions: (line.requiredPositions || []).map((position) => {
            if (position.positionCode !== positionCode) {
              return position;
            }

            return {
              ...position,
              quantity: safeQuantity,
            };
          }),
        };
      }),
    }));
  }

  function addPlanLine() {
    setForm((currentForm) => {
      const lastLine = currentForm.lines[currentForm.lines.length - 1];

      const nextLine = createEmptyPlanLine({
        workDate: lastLine?.workDate || "",
        shiftCode: lastLine?.shiftCode || "14_20",
        templateId: lastLine?.templateId || "CONT_2",
      });

      return {
        ...currentForm,
        lines: [...currentForm.lines, nextLine],
      };
    });
  }

  function removePlanLine(lineId) {
    setForm((currentForm) => {
      if (currentForm.lines.length <= 1) {
        return currentForm;
      }

      return {
        ...currentForm,
        lines: currentForm.lines.filter((line) => line.id !== lineId),
      };
    });
  }

  async function handleCreateWorkRequests(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!form.shipName.trim()) {
        throw new Error("Debes indicar el nombre del barco");
      }

      if (!form.berthName.trim()) {
        throw new Error("Debes indicar el muelle");
      }

      if (!Array.isArray(form.lines) || form.lines.length === 0) {
        throw new Error("Debes añadir al menos una línea de trabajo");
      }

      for (const line of form.lines) {
        if (!line.workDate) {
          throw new Error("Todas las líneas deben tener fecha de trabajo");
        }

        if (!line.shiftCode) {
          throw new Error("Todas las líneas deben tener turno");
        }

        if (!line.templateId) {
          throw new Error("Todas las líneas deben tener plantilla");
        }
      }

      const createdResults = [];

      for (const line of form.lines) {
        const payload = buildRequestPayloadFromLine({
          form,
          line,
        });

        const result = await createWorkRequest(payload);

        if (!result.success) {
          throw new Error(
            result.message ||
              `No se pudo crear la solicitud ${line.workDate} ${line.shiftCode}`
          );
        }

        createdResults.push(result.data);
      }

      setSuccessMessage(
        `Planificación creada correctamente: ${createdResults.length} solicitud/es enviadas`
      );

      setShowForm(false);
      setForm({
        ...DEFAULT_FORM,
        lines: [
          createEmptyPlanLine({
            shiftCode: "14_20",
            templateId: "CONT_2",
          }),
        ],
      });

      await loadWorkRequests();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error creando planificación"
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
      `¿Seguro que quieres cancelar la solicitud de ${workRequest.shipName} ${workRequest.shiftCode}?`
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
              {currentUser?.company?.name || "Empresa"} puede crear una
              planificación por barco y añadir varios turnos de trabajo de una
              sola vez.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow hover:bg-slate-700"
          >
            {showForm ? "Cerrar planificación" : "Nueva planificación por barco"}
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
            onSubmit={handleCreateWorkRequests}
            className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900">
                Nueva planificación por barco
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Introduce el barco una sola vez y añade tantas líneas de trabajo
                como necesites: 14_20, 20_02, 02_08, 08_14, etc.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Barco
                </span>
                <input
                  value={form.shipName}
                  onChange={(event) =>
                    updateFormField("shipName", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                  placeholder="MSC..."
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Muelle
                </span>
                <select
                  value={form.berthId}
                  onChange={(event) => updateSelectedBerth(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                >
                  {BERTH_OPTIONS.map((berth) => (
                    <option key={berth.id} value={berth.id}>
                      {berth.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs font-bold text-slate-400">
                  Código interno: {form.berthCode} · orden {form.berthOrder}
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Observaciones generales
                </span>
                <input
                  value={form.generalObservations}
                  onChange={(event) =>
                    updateFormField("generalObservations", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                  placeholder="Observaciones comunes..."
                />
              </label>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Líneas de trabajo
                  </h3>
                  <p className="text-sm text-slate-500">
                    Cada línea creará una solicitud independiente para el mismo
                    barco.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addPlanLine}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-100"
                >
                  + Añadir línea
                </button>
              </div>

              <div className="space-y-4">
                {form.lines.map((line, index) => {
                  const template = getTemplateById(line.templateId);
                  const shiftAllowsChangeable = canShiftBeChangeable(
                    line.shiftCode
                  );

                  return (
                    <div
                      key={line.id}
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="font-black text-slate-900">
                          Línea {index + 1}
                        </div>

                        <button
                          type="button"
                          disabled={form.lines.length <= 1}
                          onClick={() => removePlanLine(line.id)}
                          className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Eliminar
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-4">
                        <label className="block">
                          <span className="mb-2 block text-sm font-bold text-slate-700">
                            Fecha
                          </span>
                          <input
                            type="date"
                            value={line.workDate}
                            onChange={(event) =>
                              updatePlanLine(line.id, {
                                workDate: event.target.value,
                              })
                            }
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-bold text-slate-700">
                            Turno
                          </span>
                          <select
                            value={line.shiftCode}
                            onChange={(event) =>
                              updatePlanLine(line.id, {
                                shiftCode: event.target.value,
                              })
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

                        <label className="block md:col-span-2">
                          <span className="mb-2 block text-sm font-bold text-slate-700">
                            Plantilla
                          </span>
                          <select
                            value={line.templateId}
                            onChange={(event) => {
                              const nextTemplateId = event.target.value;

                              updatePlanLine(line.id, {
                                templateId: nextTemplateId,
                                requiredPositions: cloneTemplatePositions(nextTemplateId),
                              });
                            }}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                          >
                            {QUICK_TEMPLATES.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={line.isChangeable}
                            disabled={!shiftAllowsChangeable}
                            onChange={(event) =>
                              updatePlanLine(line.id, {
                                isChangeable: event.target.checked,
                              })
                            }
                            className="mt-1 h-5 w-5"
                          />

                          <div>
                            <div className="font-black text-amber-900">
                              Susceptible de cambio
                            </div>

                            <p className="mt-1 text-sm text-amber-800">
                              Normalmente solo aplica a trabajos de mañana:
                              08_14 y 08_18. Se nombrarán al final y podrán
                              gestionarse según avance el barco.
                            </p>

                            {!shiftAllowsChangeable && (
                              <p className="mt-2 text-sm font-bold text-amber-900">
                                Este turno no admite susceptible de cambio desde
                                el portal de empresa.
                              </p>
                            )}
                          </div>
                        </label>
                      </div>

                      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                        <div className="mb-2 text-sm font-black text-slate-700">
                          Puestos de la plantilla
                        </div>

                        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                          {(line.requiredPositions || template.requiredPositions).map((position) => (
                            <label
                              key={position.positionCode}
                              className="rounded-2xl bg-white p-3 shadow-sm"
                            >
                              <span className="mb-2 block text-xs font-black text-slate-600">
                                {position.positionCode}
                              </span>

                              <input
                                type="number"
                                min="0"
                                value={position.quantity}
                                onChange={(event) =>
                                  updatePlanLinePositionQuantity(
                                    line.id,
                                    position.positionCode,
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900"
                              />
                            </label>
                          ))}
                        </div>
                      </div>

                      <label className="mt-4 block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">
                          Observaciones de esta línea
                        </span>
                        <input
                          value={line.observations}
                          onChange={(event) =>
                            updatePlanLine(line.id, {
                              observations: event.target.value,
                            })
                          }
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                          placeholder="Comentario específico para este turno..."
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {saving ? "Creando..." : "Crear planificación"}
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
            <div className="space-y-5 p-5">
              {groupedWorkRequests.map((group) => (
                <div
                  key={group.key}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-5 py-4">
                    <div>
                      <div className="text-lg font-black text-slate-900">
                        {group.shipName}
                      </div>
                      <div className="text-sm text-slate-500">
                        {group.berthName} · {group.berthCode}
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        Fechas: {group.dates.join(", ")}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {Object.entries(group.statusSummary).map(
                        ([status, count]) => (
                          <div
                            key={status}
                            className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm"
                          >
                            {getStatusLabel(status)}: {count}
                          </div>
                        )
                      )}

                      <div className="rounded-full bg-slate-900 px-3 py-1 text-sm font-black text-white shadow-sm">
                        {group.items.length} solicitud/es
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] border-collapse">
                      <thead>
                        <tr className="bg-white text-left text-xs font-black uppercase tracking-wide text-slate-500">
                          <th className="px-5 py-4">Fecha</th>
                          <th className="px-5 py-4">Turno</th>
                          <th className="px-5 py-4">Trabajo</th>
                          <th className="px-5 py-4">Estado</th>
                          <th className="px-5 py-4">Observaciones</th>
                          <th className="px-5 py-4 text-right">Acciones</th>
                        </tr>
                      </thead>

                      <tbody>
                        {group.items.map((workRequest) => {
                          const editable = canCompanyEditRequest(workRequest);

                          return (
                            <tr
                              key={workRequest._id}
                              className="border-t border-slate-100"
                            >
                              <td className="px-5 py-4 text-sm font-bold text-slate-800">
                                {formatDate(workRequest.workDate)}
                              </td>

                              <td className="px-5 py-4 text-sm font-black text-slate-800">
                                {workRequest.shiftCode}
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
                                    onClick={() =>
                                      handleCancelRequest(workRequest)
                                    }
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
                </div>
              ))}
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
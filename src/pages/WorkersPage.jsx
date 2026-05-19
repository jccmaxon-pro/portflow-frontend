import React, { useEffect, useMemo, useState } from "react";
import {
  getWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
} from "../api/workersApi";

import {
  getWorkerAvailabilityByWorker,
  getWorkerAvailabilityByPort,
  createWorkerAvailability,
  updateWorkerAvailability,
  deleteWorkerAvailability,
} from "../api/workerAvailabilityApi";

const PROFESSIONAL_GROUPS = [
  "CAPATACES",
  "CONTROLADORES",
  "GRUISTAS",
  "ESTIBA",
  "BOLSA",
  "PALISTAS",
  "REACH_STACKER",
];

const POSITION_CODES = [
  "CAPATAZ",
  "ANOTADOR",
  "JEFE_PARCELA",
  "GRUA",
  "AYUDANTE_GRUA",
  "TRAILER",
  "BORDO",
  "TIERRA",
  "TRINCA",
  "PALA",
  "PALA_CARRETILLA",
  "MAFI",
  "REACH_STACKER",
];

const QUALIFICATION_TYPES = ["PRIMARY", "SUBSTITUTE"];

const ROTATION_LISTS = [
  "CAPATACES_PRINCIPAL",
  "CAPATAZ_SUPLENTES",
  "CONTROLADORES_PRINCIPAL",
  "ANOTADORES_SUPLENTES",
  "GRUISTAS_PRINCIPAL",
  "GRUISTAS_SUPLENTES",
  "ESTIBA_PRINCIPAL",
  "BOLSA_PRINCIPAL",
  "PALISTAS_PRINCIPAL",
  "REACH_STACKER_PRINCIPAL",
];

const GROUP_ORDER = [
  "JEFE_PARCELA",
  "CAPATACES",
  "CONTROLADORES",
  "ANOTADORES",
  "GRUISTAS",
  "REACH_STACKER",
  "PALISTAS",
  "PALA",
  "ESTIBA",
  "BOLSA",
];

const PORT_ID = "69f210fe5417a1641d23188d";

const SHIFT_OPTIONS = [
  { value: "", label: "Todo el día" },
  { value: "02_08", label: "02:00 a 08:00" },
  { value: "08_14", label: "08:00 a 14:00" },
  { value: "08_18", label: "08:00 a 18:00" },
  { value: "14_20", label: "14:00 a 20:00" },
  { value: "18_24", label: "18:00 a 24:00" },
  { value: "20_02", label: "20:00 a 02:00" },
];

const AVAILABILITY_REASONS = [
  { value: "NO_DOUBLE", label: "No quiere doblar" },
  { value: "MEDICAL", label: "Cita médica" },
  { value: "VACATION", label: "Vacaciones" },
  { value: "REST", label: "Descanso" },
  { value: "FAMILY", label: "Asunto familiar" },
  { value: "OTHER", label: "Otro motivo" },
];

const emptyWorker = {
  workerCode: "",
  fullName: "",
  mainProfessionalGroup: "ESTIBA",
  mainRotationOrder: 0,
  status: "ACTIVE",
  isActive: true,
  wantsDoubleShift: false,
  notes: "",
  qualifications: [],
};

const emptyQualification = {
  positionCode: "BORDO",
  qualificationType: "PRIMARY",
  rotationListCode: "ESTIBA_PRINCIPAL",
  rotationOrder: 0,
  priority: 0,
  validFrom: null,
  validTo: null,
  isActive: true,
};

const emptyAvailabilityForm = {
  startDate: "2026-05-04",
  endDate: "2026-05-04",
  shiftCode: "",
  blocksNormalAssignment: false,
  blocksDoubleAssignment: true,
  reason: "NO_DOUBLE",
  notes: "",
};

function normalizeGroup(group) {
  return String(group || "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
}

function getGroupSortIndex(group) {
  const normalizedGroup = normalizeGroup(group);
  const index = GROUP_ORDER.indexOf(normalizedGroup);

  return index === -1 ? 999 : index;
}

function getMainRotationOrder(worker) {
  const directOrder = Number(worker.mainRotationOrder);

  if (!Number.isNaN(directOrder) && directOrder > 0) {
    return directOrder;
  }

  const mainGroup = normalizeGroup(worker.mainProfessionalGroup);
  const qualifications = worker.qualifications || [];

  const mainQualification = qualifications.find((qualification) => {
    const listCode = normalizeGroup(qualification.rotationListCode);
    const positionCode = normalizeGroup(qualification.positionCode);

    if (mainGroup === "CAPATACES") {
      return positionCode === "CAPATAZ" || listCode === "CAPATACES_PRINCIPAL";
    }

    if (mainGroup === "CONTROLADORES" || mainGroup === "ANOTADORES") {
      return (
        positionCode === "ANOTADOR" ||
        listCode === "CONTROLADORES_PRINCIPAL"
      );
    }

    if (mainGroup === "GRUISTAS") {
      return positionCode === "GRUA" || listCode === "GRUISTAS_PRINCIPAL";
    }

    if (mainGroup === "REACH_STACKER") {
      return (
        positionCode === "REACH_STACKER" ||
        listCode === "REACH_STACKER_PRINCIPAL"
      );
    }

    if (mainGroup === "PALISTAS" || mainGroup === "PALA") {
      return (
        positionCode === "PALA" ||
        positionCode === "PALA_CARRETILLA" ||
        listCode === "PALISTAS_PRINCIPAL"
      );
    }

    if (mainGroup === "ESTIBA") {
      return listCode === "ESTIBA_PRINCIPAL";
    }

    if (mainGroup === "BOLSA") {
      return listCode === "BOLSA_PRINCIPAL";
    }

    return false;
  });

  const qualificationOrder = Number(mainQualification?.rotationOrder);

  if (!Number.isNaN(qualificationOrder) && qualificationOrder > 0) {
    return qualificationOrder;
  }

  return 999999;
}

function getWorkerCodeAsNumber(worker) {
  const code = Number(worker.workerCode);
  return Number.isNaN(code) ? 999999 : code;
}

function sortWorkersForList(workers) {
  return [...workers].sort((a, b) => {
    const groupA = getGroupSortIndex(a.mainProfessionalGroup);
    const groupB = getGroupSortIndex(b.mainProfessionalGroup);

    if (groupA !== groupB) {
      return groupA - groupB;
    }

    const orderA = getMainRotationOrder(a);
    const orderB = getMainRotationOrder(b);

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const codeA = getWorkerCodeAsNumber(a);
    const codeB = getWorkerCodeAsNumber(b);

    if (codeA !== codeB) {
      return codeA - codeB;
    }

    return String(a.fullName || "").localeCompare(String(b.fullName || ""));
  });
}

function getGroupLabel(group) {
  const labels = {
    CAPATACES: "Capataces",
    CONTROLADORES: "Controladores",
    GRUISTAS: "Gruistas",
    ESTIBA: "Estiba",
    BOLSA: "Bolsa",
    PALISTAS: "Palistas",
    REACH_STACKER: "Reach Stacker",
  };

  return labels[group] || group;
}

function getQualificationLabel(qualification) {
  const type =
    qualification.qualificationType === "PRIMARY" ? "Titular" : "Suplente";

  return `${qualification.positionCode} · ${type} · ${
    qualification.rotationListCode || "sin lista"
  } · orden ${qualification.rotationOrder ?? 0}`;
}

function formatAvailabilityDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateForInput(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function buildStartOfDay(dateString) {
  return `${dateString}T00:00:00.000Z`;
}

function buildEndOfDay(dateString) {
  return `${dateString}T23:59:59.999Z`;
}

function getAvailabilityReasonLabel(reason) {
  const found = AVAILABILITY_REASONS.find((item) => item.value === reason);
  return found?.label || reason || "Sin motivo";
}

function getShiftLabel(shiftCode) {
  const found = SHIFT_OPTIONS.find((item) => item.value === (shiftCode || ""));
  return found?.label || shiftCode || "Todo el día";
}

function getWorkerAvailabilitySummaryLabel(summary) {
  if (!summary || summary.count === 0) {
    return null;
  }

  if (summary.hasNormalBlock && summary.hasDoubleBlock) {
    return "No trabaja";
  }

  if (summary.hasNormalBlock) {
    return "Trabajo bloqueado";
  }

  if (summary.hasDoubleBlock) {
    return "No dobla";
  }

  return "Restricción";
}

function getWorkerAvailabilityBadgeClass(summary) {
  if (!summary || summary.count === 0) {
    return "";
  }

  if (summary.hasNormalBlock && summary.hasDoubleBlock) {
    return "bg-red-100 text-red-700 border-red-200";
  }

  if (summary.hasNormalBlock) {
    return "bg-orange-100 text-orange-700 border-orange-200";
  }

  if (summary.hasDoubleBlock) {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("TODOS");
  const [searchText, setSearchText] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [formData, setFormData] = useState(emptyWorker);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [workerAvailability, setWorkerAvailability] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilitySummaryByWorker, setAvailabilitySummaryByWorker] =
    useState({});

  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState(null);
  const [availabilityForm, setAvailabilityForm] = useState(emptyAvailabilityForm);

  async function loadWorkers() {
    try {
      setLoading(true);

      const result = await getWorkers();

      const list = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

      setWorkers(list);
    } catch (error) {
      console.error("Error cargando trabajadores:", error);
      alert("No se pudieron cargar los trabajadores.");
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkerAvailability(workerId) {
    if (!workerId) {
      setWorkerAvailability([]);
      return;
    }

    try {
      setLoadingAvailability(true);

      const result = await getWorkerAvailabilityByWorker(workerId);

      const list = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

      const activeList = list.filter((item) => item?.isActive !== false);

      setWorkerAvailability(activeList);
    } catch (error) {
      console.error("Error cargando disponibilidad del trabajador:", error);
      alert("No se pudieron cargar las restricciones del trabajador.");
    } finally {
      setLoadingAvailability(false);
    }
  }

  async function loadAvailabilitySummary() {
    try {
      const result = await getWorkerAvailabilityByPort(PORT_ID);

      const list = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

      const activeList = list.filter((item) => item?.isActive !== false);

      const summary = activeList.reduce((accumulator, item) => {
        const workerId =
          typeof item.worker === "string" ? item.worker : item.worker?._id;

        if (!workerId) {
          return accumulator;
        }

        if (!accumulator[workerId]) {
          accumulator[workerId] = {
            count: 0,
            hasNormalBlock: false,
            hasDoubleBlock: false,
          };
        }

        accumulator[workerId].count += 1;

        if (item.blocksNormalAssignment) {
          accumulator[workerId].hasNormalBlock = true;
        }

        if (item.blocksDoubleAssignment) {
          accumulator[workerId].hasDoubleBlock = true;
        }

        return accumulator;
      }, {});

      setAvailabilitySummaryByWorker(summary);
    } catch (error) {
      console.error("Error cargando resumen de restricciones:", error);
    }
  }

  async function refreshAvailabilityData(workerId = selectedWorker?._id) {
    await loadAvailabilitySummary();

    if (workerId) {
      await loadWorkerAvailability(workerId);
    }
  }

  useEffect(() => {
    loadWorkers();
    loadAvailabilitySummary();
  }, []);

  const filteredWorkers = useMemo(() => {
    const filtered = workers
      .filter((worker) => {
        if (selectedGroup !== "TODOS") {
          return (
            normalizeGroup(worker.mainProfessionalGroup) ===
            normalizeGroup(selectedGroup)
          );
        }

        return true;
      })
      .filter((worker) => {
        const text = searchText.trim().toLowerCase();

        if (!text) return true;

        return (
          String(worker.workerCode || "").toLowerCase().includes(text) ||
          String(worker.fullName || "").toLowerCase().includes(text) ||
          String(worker.mainProfessionalGroup || "").toLowerCase().includes(text)
        );
      });

    return sortWorkersForList(filtered);
  }, [workers, selectedGroup, searchText]);

  function startCreateWorker() {
    setSelectedWorker(null);
    setWorkerAvailability([]);
    setShowAvailabilityForm(false);
    setEditingAvailability(null);
    setAvailabilityForm(emptyAvailabilityForm);

    setFormData({
      ...emptyWorker,
      qualifications: [],
    });
  }

  function startEditWorker(worker) {
    setSelectedWorker(worker);
    setShowAvailabilityForm(false);
    setEditingAvailability(null);
    setAvailabilityForm(emptyAvailabilityForm);

    setFormData({
      workerCode: worker.workerCode || "",
      fullName: worker.fullName || "",
      mainProfessionalGroup: worker.mainProfessionalGroup || "ESTIBA",
      mainRotationOrder: worker.mainRotationOrder ?? 0,
      status: worker.status || "ACTIVE",
      isActive: worker.isActive ?? true,
      wantsDoubleShift: worker.wantsDoubleShift ?? false,
      notes: worker.notes || "",
      qualifications: worker.qualifications || [],
    });

    loadWorkerAvailability(worker._id);
  }

  function updateField(field, value) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateAvailabilityField(field, value) {
    setAvailabilityForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function addQualification() {
    setFormData((current) => ({
      ...current,
      qualifications: [
        ...current.qualifications,
        {
          ...emptyQualification,
          rotationOrder: Number(current.workerCode) || 0,
        },
      ],
    }));
  }

  function updateQualification(index, field, value) {
    setFormData((current) => {
      const updatedQualifications = [...current.qualifications];

      updatedQualifications[index] = {
        ...updatedQualifications[index],
        [field]: value,
      };

      return {
        ...current,
        qualifications: updatedQualifications,
      };
    });
  }

  function removeQualification(index) {
    setFormData((current) => ({
      ...current,
      qualifications: current.qualifications.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  async function handleSave() {
    if (!formData.workerCode.trim()) {
      alert("El número del trabajador es obligatorio.");
      return;
    }

    if (!formData.fullName.trim()) {
      alert("El nombre del trabajador es obligatorio.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...formData,
        mainRotationOrder: Number(formData.mainRotationOrder) || 0,
        qualifications: formData.qualifications.map((qualification) => ({
          ...qualification,
          rotationOrder: Number(qualification.rotationOrder) || 0,
          priority: Number(qualification.priority) || 0,
          isActive: qualification.isActive ?? true,
        })),
      };

      if (selectedWorker?._id) {
        await updateWorker(selectedWorker._id, payload);
      } else {
        await createWorker(payload);
      }

      await loadWorkers();

      alert("Trabajador guardado correctamente.");
    } catch (error) {
      console.error("Error guardando trabajador:", error);
      console.error(
        "Respuesta backend completa:",
        JSON.stringify(error.response?.data, null, 2)
      );
      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Error guardando trabajador"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedWorker?._id) return;

    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar o desactivar al trabajador ${selectedWorker.workerCode}?`
    );

    if (!confirmed) return;

    try {
      await deleteWorker(selectedWorker._id);
      setSelectedWorker(null);
      setFormData(emptyWorker);
      setWorkerAvailability([]);
      setShowAvailabilityForm(false);
      setEditingAvailability(null);
      await loadWorkers();
      await loadAvailabilitySummary();
    } catch (error) {
      console.error("Error eliminando trabajador:", error);
      alert("No se pudo eliminar el trabajador.");
    }
  }

  function handleCreateAvailability() {
    if (!selectedWorker?._id) {
      alert("Primero selecciona un trabajador.");
      return;
    }

    setEditingAvailability(null);
    setAvailabilityForm({
      ...emptyAvailabilityForm,
      startDate: "2026-05-04",
      endDate: "2026-05-04",
    });
    setShowAvailabilityForm(true);
  }

  function handleEditAvailability(availability) {
    setEditingAvailability(availability);

    setAvailabilityForm({
      startDate: formatDateForInput(availability.startDate),
      endDate: formatDateForInput(availability.endDate),
      shiftCode: availability.shiftCode || "",
      blocksNormalAssignment: availability.blocksNormalAssignment ?? false,
      blocksDoubleAssignment: availability.blocksDoubleAssignment ?? false,
      reason: availability.reason || "OTHER",
      notes: availability.notes || "",
    });

    setShowAvailabilityForm(true);
  }

  function handleCancelAvailabilityForm() {
    setShowAvailabilityForm(false);
    setEditingAvailability(null);
    setAvailabilityForm(emptyAvailabilityForm);
  }

  async function handleSaveAvailability() {
    if (!selectedWorker?._id) {
      alert("Primero selecciona un trabajador.");
      return;
    }

    if (!availabilityForm.startDate) {
      alert("La fecha de inicio es obligatoria.");
      return;
    }

    if (!availabilityForm.endDate) {
      alert("La fecha de fin es obligatoria.");
      return;
    }

    if (
      !availabilityForm.blocksNormalAssignment &&
      !availabilityForm.blocksDoubleAssignment
    ) {
      alert("Debes bloquear trabajo normal, dobles o ambos.");
      return;
    }

    try {
      setSavingAvailability(true);

      const payload = {
        port: PORT_ID,
        worker: selectedWorker._id,
        startDate: buildStartOfDay(availabilityForm.startDate),
        endDate: buildEndOfDay(availabilityForm.endDate),
        shiftCode: availabilityForm.shiftCode || null,
        blocksNormalAssignment: Boolean(availabilityForm.blocksNormalAssignment),
        blocksDoubleAssignment: Boolean(availabilityForm.blocksDoubleAssignment),
        reason: availabilityForm.reason,
        notes: availabilityForm.notes,
        isActive: true,
      };

      if (editingAvailability?._id) {
        await updateWorkerAvailability(editingAvailability._id, payload);
      } else {
        await createWorkerAvailability(payload);
      }

      setShowAvailabilityForm(false);
      setEditingAvailability(null);
      setAvailabilityForm(emptyAvailabilityForm);

      await refreshAvailabilityData(selectedWorker._id);

      alert("Restricción guardada correctamente.");
    } catch (error) {
      console.error("Error guardando restricción:", error);
      console.error(
        "Respuesta backend completa:",
        JSON.stringify(error.response?.data, null, 2)
      );
      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Error guardando restricción"
      );
    } finally {
      setSavingAvailability(false);
    }
  }

  async function handleDeleteAvailability(availability) {
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar esta restricción de ${selectedWorker?.workerCode}?`
    );

    if (!confirmed) return;

    try {
      await deleteWorkerAvailability(availability._id);
      await refreshAvailabilityData(selectedWorker._id);

      if (editingAvailability?._id === availability._id) {
        handleCancelAvailabilityForm();
      }

      alert("Restricción eliminada correctamente.");
    } catch (error) {
      console.error("Error eliminando restricción:", error);
      console.error(
        "Respuesta backend completa:",
        JSON.stringify(error.response?.data, null, 2)
      );
      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "No se pudo eliminar la restricción"
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-lg md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">
              Portflow
            </p>
            <h1 className="mt-1 text-3xl font-black">
              Gestión provisional de personal
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Añade trabajadores reales, edita sus listas y prueba el nombramiento con datos más fieles.
            </p>
          </div>

          <button
            type="button"
            onClick={startCreateWorker}
            className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow hover:bg-sky-400"
          >
            + Nuevo trabajador
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-2xl bg-white p-4 shadow">
            <div className="mb-4">
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Buscar
              </label>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Número o nombre..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Grupo
              </label>
              <select
                value={selectedGroup}
                onChange={(event) => setSelectedGroup(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
              >
                <option value="TODOS">Todos</option>
                {PROFESSIONAL_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {getGroupLabel(group)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">
                Trabajadores
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {filteredWorkers.length}
              </span>
            </div>

            <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
              {loading ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Cargando trabajadores...
                </p>
              ) : filteredWorkers.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  No hay trabajadores con esos filtros.
                </p>
              ) : (
                filteredWorkers.map((worker) => {
                  const active = selectedWorker?._id === worker._id;
                  const summary = availabilitySummaryByWorker[worker._id];
                  const summaryLabel = getWorkerAvailabilitySummaryLabel(summary);

                  return (
                    <button
                      key={worker._id}
                      type="button"
                      onClick={() => startEditWorker(worker)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-sky-500 bg-sky-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {worker.workerCode} · {worker.fullName}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {getGroupLabel(worker.mainProfessionalGroup)}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-bold text-white">
                            {worker.qualifications?.length || 0}
                          </span>

                          {summaryLabel && (
                            <span
                              className={`rounded-full border px-2 py-1 text-[10px] font-black ${getWorkerAvailabilityBadgeClass(
                                summary
                              )}`}
                            >
                              {summaryLabel}
                              {summary?.count > 1 ? ` · ${summary.count}` : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {(worker.qualifications || [])
                          .slice(0, 3)
                          .map((qualification, index) => (
                            <span
                              key={`${qualification.positionCode}-${index}`}
                              className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600"
                            >
                              {qualification.positionCode}
                            </span>
                          ))}

                        {(worker.qualifications || []).length > 3 && (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                            +{worker.qualifications.length - 3}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {selectedWorker ? "Editar trabajador" : "Nuevo trabajador"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Define grupo principal, número, cualificaciones y restricciones para el nombramiento.
                </p>
              </div>

              {selectedWorker && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                >
                  Eliminar
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Número
                </label>
                <input
                  value={formData.workerCode}
                  onChange={(event) =>
                    updateField("workerCode", event.target.value)
                  }
                  placeholder="Ej: 421"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Nombre
                </label>
                <input
                  value={formData.fullName}
                  onChange={(event) =>
                    updateField("fullName", event.target.value)
                  }
                  placeholder="Ej: Juan Pérez"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Grupo principal
                </label>
                <select
                  value={formData.mainProfessionalGroup}
                  onChange={(event) =>
                    updateField("mainProfessionalGroup", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                >
                  {PROFESSIONAL_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {getGroupLabel(group)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Orden principal
                </label>
                <input
                  type="number"
                  value={formData.mainRotationOrder}
                  onChange={(event) =>
                    updateField("mainRotationOrder", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  rows={3}
                  placeholder="Ej: Gruista con suplencia de controlador..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Cualificaciones
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Aquí defines si entra como titular, suplente, en qué puesto y en qué lista.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addQualification}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700"
                >
                  + Añadir cualificación
                </button>
              </div>

              <div className="space-y-3">
                {formData.qualifications.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Este trabajador todavía no tiene cualificaciones.
                  </div>
                ) : (
                  formData.qualifications.map((qualification, index) => (
                    <div
                      key={qualification._id || index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-black text-slate-900">
                          {getQualificationLabel(qualification)}
                        </p>

                        <button
                          type="button"
                          onClick={() => removeQualification(index)}
                          className="rounded-lg bg-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-200"
                        >
                          Quitar
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-5">
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                            Puesto
                          </label>
                          <select
                            value={qualification.positionCode || ""}
                            onChange={(event) =>
                              updateQualification(
                                index,
                                "positionCode",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                          >
                            {POSITION_CODES.map((positionCode) => (
                              <option key={positionCode} value={positionCode}>
                                {positionCode}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                            Tipo
                          </label>
                          <select
                            value={qualification.qualificationType || "PRIMARY"}
                            onChange={(event) =>
                              updateQualification(
                                index,
                                "qualificationType",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                          >
                            {QUALIFICATION_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type === "PRIMARY" ? "Titular" : "Suplente"}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                            Lista
                          </label>
                          <select
                            value={qualification.rotationListCode || ""}
                            onChange={(event) =>
                              updateQualification(
                                index,
                                "rotationListCode",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                          >
                            <option value="">Sin lista</option>
                            {ROTATION_LISTS.map((listCode) => (
                              <option key={listCode} value={listCode}>
                                {listCode}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                            Orden
                          </label>
                          <input
                            type="number"
                            value={qualification.rotationOrder ?? 0}
                            onChange={(event) =>
                              updateQualification(
                                index,
                                "rotationOrder",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                            Prioridad
                          </label>
                          <input
                            type="number"
                            value={qualification.priority ?? 0}
                            onChange={(event) =>
                              updateQualification(
                                index,
                                "priority",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Disponibilidad / restricciones
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Restricciones activas que el motor tendrá en cuenta al simular el nombramiento.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreateAvailability}
                  disabled={!selectedWorker}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Añadir restricción
                </button>
              </div>

              {showAvailabilityForm && (
                <div className="mb-4 rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-black text-slate-900">
                        {editingAvailability
                          ? "Editar restricción"
                          : "Nueva restricción"}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Configura si bloquea trabajo normal, dobles o ambos.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCancelAvailabilityForm}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                        Desde
                      </label>
                      <input
                        type="date"
                        value={availabilityForm.startDate}
                        onChange={(event) =>
                          updateAvailabilityField("startDate", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                        Hasta
                      </label>
                      <input
                        type="date"
                        value={availabilityForm.endDate}
                        onChange={(event) =>
                          updateAvailabilityField("endDate", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                        Turno
                      </label>
                      <select
                        value={availabilityForm.shiftCode}
                        onChange={(event) =>
                          updateAvailabilityField("shiftCode", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                      >
                        {SHIFT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                        Motivo
                      </label>
                      <select
                        value={availabilityForm.reason}
                        onChange={(event) =>
                          updateAvailabilityField("reason", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                      >
                        {AVAILABILITY_REASONS.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={availabilityForm.blocksNormalAssignment}
                        onChange={(event) =>
                          updateAvailabilityField(
                            "blocksNormalAssignment",
                            event.target.checked
                          )
                        }
                      />
                      <span className="text-sm font-bold text-slate-700">
                        Bloquea trabajo normal
                      </span>
                    </label>

                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={availabilityForm.blocksDoubleAssignment}
                        onChange={(event) =>
                          updateAvailabilityField(
                            "blocksDoubleAssignment",
                            event.target.checked
                          )
                        }
                      />
                      <span className="text-sm font-bold text-slate-700">
                        Bloquea dobles
                      </span>
                    </label>

                    <div className="md:col-span-3">
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                        Notas
                      </label>
                      <textarea
                        value={availabilityForm.notes}
                        onChange={(event) =>
                          updateAvailabilityField("notes", event.target.value)
                        }
                        rows={3}
                        placeholder="Ej: El trabajador trabaja normal, pero no quiere doblar este día."
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCancelAvailabilityForm}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveAvailability}
                      disabled={savingAvailability}
                      className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white hover:bg-sky-500 disabled:opacity-60"
                    >
                      {savingAvailability
                        ? "Guardando..."
                        : editingAvailability
                          ? "Guardar cambios"
                          : "Crear restricción"}
                    </button>
                  </div>
                </div>
              )}

              {!selectedWorker ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                  Selecciona un trabajador para ver o añadir restricciones.
                </div>
              ) : loadingAvailability ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                  Cargando restricciones...
                </div>
              ) : workerAvailability.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                  Este trabajador no tiene restricciones activas.
                </div>
              ) : (
                <div className="space-y-3">
                  {workerAvailability.map((availability) => (
                    <div
                      key={availability._id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {getAvailabilityReasonLabel(availability.reason)}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {formatAvailabilityDate(availability.startDate)}
                            {" - "}
                            {formatAvailabilityDate(availability.endDate)}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-600">
                            Turno: {getShiftLabel(availability.shiftCode)}
                          </p>
                        </div>

                        <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                          Activa
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Bloquea trabajo normal
                          </p>
                          <p className="mt-1 text-sm font-black text-slate-900">
                            {availability.blocksNormalAssignment ? "Sí" : "No"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Bloquea dobles
                          </p>
                          <p className="mt-1 text-sm font-black text-slate-900">
                            {availability.blocksDoubleAssignment ? "Sí" : "No"}
                          </p>
                        </div>
                      </div>

                      {availability.notes && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Notas
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {availability.notes}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditAvailability(availability)}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAvailability(availability)}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={startCreateWorker}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-sky-600 px-6 py-3 text-sm font-black text-white shadow hover:bg-sky-500 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar trabajador"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
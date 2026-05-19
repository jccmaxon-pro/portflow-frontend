export const POSITION_ORDER = [
  "JEFE_PARCELA",
  "REACH_STACKER",
  "CAPATAZ",
  "ANOTADOR",
  "GRUA",
  "AYUDANTE DE GRUAS",
  "MAFI",
  "TRAILER",
  "BORDO",
  "TIERRA",
  "TRINCA",
  "PALAS / CARRETILLA",
];

export const SHIFT_LABELS = {
  "02_08": "02 A 08",
  "08_18": "08 A 18",
  "08_14": "08 A 14",
  "14_20": "14 A 20",
  "18_24": "18 A 24",
  "20_02": "20 A 02",
};

export const SHIFT_ORDER = {
  "02_08": 10,
  "08_18": 20,
  "08_14": 30,
  "14_20": 40,
  "18_24": 50,
  "20_02": 60,
};


export function formatDateOnly(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toISOString().slice(0, 10);
}

export function formatBlockLabel(workDate, shiftCode) {
  return `${formatDateOnly(workDate)} ${SHIFT_LABELS[shiftCode] || shiftCode}`;
}

export function getCoverageInfo(assignment) {
  const coverageType = assignment.coverageType || "";
  const qualificationType = assignment.qualificationType || "";
  const phase = assignment.phase || "";
  const group = assignment.mainProfessionalGroup || "";

  if (coverageType === "PRIMARY" && qualificationType === "PRIMARY") {
    return {
      label: "Titular",
      type: "primary",
      description: "Trabajador asignado por su lista principal"
    };
  }

  if (coverageType === "SUBSTITUTE" || qualificationType === "SUBSTITUTE") {
    return {
      label: "Suplente",
      type: "substitute",
      description: "Trabajador asignado como suplente"
    };
  }

  if (coverageType === "BOLSA" || phase === "BOLSA" || group === "BOLSA") {
    return {
      label: "Bolsa",
      type: "bolsa",
      description: "Trabajador asignado desde bolsa"
    };
  }

  if (coverageType === "TRAILER_ESTIBA" || phase === "TRAILER_ESTIBA") {
    return {
      label: "Estiba",
      type: "estiba",
      description: "Tráiler cubierto desde estiba"
    };
  }

  if (
    coverageType === "TRAILER_MACHINE_SURPLUS" ||
    phase === "TRAILER_MACHINE_SURPLUS"
  ) {
    return {
      label: "Maquinaria",
      type: "machine",
      description: "Tráiler cubierto por sobrante de maquinaria"
    };
  }

  if (phase === "ESTIBA" || group === "ESTIBA") {
    return {
      label: "Estiba",
      type: "estiba",
      description: "Trabajador asignado desde estiba"
    };
  }

  return {
    label: "Otro",
    type: "other",
    description: "Asignación no clasificada"
  };
}

export function getPositionSortIndex(positionCode) {
  const index = POSITION_ORDER.indexOf(positionCode);
  return index === -1 ? 999 : index;
}

export function groupAssignmentsByWorkRequest(simulationData) {
  const workRequests = simulationData?.workRequests || [];
  const assignments = simulationData?.assignments || [];
  const uncoveredPositions = simulationData?.uncoveredPositions || [];

  const workRequestMap = new Map();

  for (const workRequest of workRequests) {
    workRequestMap.set(workRequest._id, {
      workRequest,
      assignmentsByPosition: {},
      uncoveredByPosition: {},

      nominationWindowCode: null,
      nominationWindowLabel: null,
      nominationWindowOrder: 999,
      nominationWindowIsContinuous: false,
      workRequestOrderInWindow: 999,
    });
  }

  for (const assignment of assignments) {
    const entry = workRequestMap.get(assignment.workRequestId);
    if (!entry) continue;

    if (!entry.assignmentsByPosition[assignment.positionCode]) {
      entry.assignmentsByPosition[assignment.positionCode] = [];
    }

    entry.assignmentsByPosition[assignment.positionCode].push(assignment);

    if (assignment.nominationWindowCode) {
      entry.nominationWindowCode = assignment.nominationWindowCode;
      entry.nominationWindowLabel = assignment.nominationWindowLabel;
      entry.nominationWindowOrder = assignment.nominationWindowOrder ?? 999;
      entry.nominationWindowIsContinuous =
        assignment.nominationWindowIsContinuous || false;
      entry.workRequestOrderInWindow =
        assignment.workRequestOrderInWindow ?? 999;
    }
  }

  for (const uncovered of uncoveredPositions) {
    const entry = workRequestMap.get(uncovered.workRequestId);
    if (!entry) continue;

    if (!entry.uncoveredByPosition[uncovered.positionCode]) {
      entry.uncoveredByPosition[uncovered.positionCode] = [];
    }

    entry.uncoveredByPosition[uncovered.positionCode].push(uncovered);

    if (uncovered.nominationWindowCode) {
      entry.nominationWindowCode = uncovered.nominationWindowCode;
      entry.nominationWindowLabel = uncovered.nominationWindowLabel;
      entry.nominationWindowOrder = uncovered.nominationWindowOrder ?? 999;
      entry.nominationWindowIsContinuous =
        uncovered.nominationWindowIsContinuous || false;
      entry.workRequestOrderInWindow =
        uncovered.workRequestOrderInWindow ?? 999;
    }
  }

  return Array.from(workRequestMap.values());
}

export function sortWorkRequests(entries) {
  return [...entries].sort((a, b) => {
    const wrA = a.workRequest;
    const wrB = b.workRequest;

    const dateA = new Date(wrA.workDate).getTime();
    const dateB = new Date(wrB.workDate).getTime();

    if (dateA !== dateB) return dateA - dateB;

    const windowOrderA = a.nominationWindowOrder ?? 999;
    const windowOrderB = b.nominationWindowOrder ?? 999;

    if (windowOrderA !== windowOrderB) {
      return windowOrderA - windowOrderB;
    }

    const requestOrderA = a.workRequestOrderInWindow ?? 999;
    const requestOrderB = b.workRequestOrderInWindow ?? 999;

    if (requestOrderA !== requestOrderB) {
      return requestOrderA - requestOrderB;
    }

    const shiftOrderA = SHIFT_ORDER[wrA.shiftCode] ?? 999;
    const shiftOrderB = SHIFT_ORDER[wrB.shiftCode] ?? 999;

    if (shiftOrderA !== shiftOrderB) {
      return shiftOrderA - shiftOrderB;
    }

    const berthOrderA = wrA.berth?.order ?? 999;
    const berthOrderB = wrB.berth?.order ?? 999;

    if (berthOrderA !== berthOrderB) {
      return berthOrderA - berthOrderB;
    }

    return String(wrA.shipName || "").localeCompare(String(wrB.shipName || ""));
  });
}

function getEntryNominationWindowOrder(entry) {
  const allAssignments = Object.values(entry.assignmentsByPosition || {}).flat();

  const firstAssignment = allAssignments[0];

  if (!firstAssignment) return 999;

  const code = firstAssignment.nominationWindowCode;

  if (code === "EARLY_02_14") return 10;
  if (code === "AFTERNOON_14_20") return 20;
  if (code === "NIGHT_18_02") return 30;

  return 999;
}

function getEntryWorkRequestOrderInWindow(entry) {
  const allAssignments = Object.values(entry.assignmentsByPosition || {}).flat();

  const firstAssignment = allAssignments[0];

  return firstAssignment?.workRequestOrderInWindow ?? 999;
}


const isProvisionesWorkRequest = (workRequest) => {
  const taskCode = String(workRequest?.taskCode || "").trim().toUpperCase();
  const taskName = String(workRequest?.taskName || "").trim().toUpperCase();

  const text = `${taskCode} ${taskName}`;

  return text.includes("PROVISIONES");
};

const getDisplayPositionCode = ({ positionCode, workRequest }) => {
  if (
    isProvisionesWorkRequest(workRequest) &&
    positionCode === "BORDO"
  ) {
    return "ARRUMBO";
  }

  return positionCode;
};

const getDisplayPositionOrder = ({ positionCode, workRequest }) => {
  if (isProvisionesWorkRequest(workRequest)) {
    const provisionesOrder = {
      CAPATAZ: 1,
      ANOTADOR: 2,
      PALA: 3,
      PALA_CARRETILLA: 3,
      MAFI: 3,
      TIERRA: 4,
      BORDO: 5,
      ARRUMBO: 5,
      TRAILER: 6,
      TRINCA: 7,
      AYUDANTE_GRUA:8,
      
    };

    return provisionesOrder[positionCode] || 999;
  }

  const defaultOrder = {
    JEFE_PARCELA: 1,
    REACH_STACKER: 2,
    CAPATAZ: 3,
    ANOTADOR: 4,
    GRUA: 5,
    AYUDANTE_GRUA: 6,
    PALA: 7,
    PALA_CARRETILLA: 7,
    MAFI: 7,
    TRAILER: 8,
    BORDO: 9,
    TIERRA: 10,
    TRINCA: 11,
    
  };

  return defaultOrder[positionCode] || 999;
};

function isProvisionWorkRequest(workRequest) {
  const taskCode = String(workRequest?.taskCode || "").trim().toUpperCase();
  const taskName = String(workRequest?.taskName || "").trim().toUpperCase();

  const text = `${taskCode} ${taskName}`;

  return text.includes("PROVISIONES");
}

export function buildPositionRows(entry) {
  const requiredPositions = entry.workRequest.requiredPositions || [];

  const rows = [...requiredPositions].map((requiredPosition) => {
    const positionCode = requiredPosition.positionCode;
    const quantity = requiredPosition.quantity;

    const assigned = (
      entry.assignmentsByPosition[positionCode] || []
    ).sort((a, b) => (a.unitNumber || 0) - (b.unitNumber || 0));

    const uncovered = (
      entry.uncoveredByPosition[positionCode] || []
    ).sort((a, b) => (a.unitNumber || 0) - (b.unitNumber || 0));

    return {
      positionCode: getDisplayPositionCode({
        positionCode,
        workRequest: entry.workRequest,
      }),
      originalPositionCode: positionCode,
      quantity,
      assigned,
      uncovered,
    };
  });

  rows.sort((a, b) => {
    const orderA = getDisplayPositionOrder({
      positionCode: a.originalPositionCode,
      workRequest: entry.workRequest,
    });

    const orderB = getDisplayPositionOrder({
      positionCode: b.originalPositionCode,
      workRequest: entry.workRequest,
    });

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return String(a.originalPositionCode).localeCompare(
      String(b.originalPositionCode)
    );
  });

  console.log(
    "ORDEN FINAL FILAS:",
    rows.map((row) => row.originalPositionCode)
  );

  return rows;
}


export function groupEntriesByBlock(simulationData) {
  const entries = sortWorkRequests(groupAssignmentsByWorkRequest(simulationData));

  const blockMap = new Map();

  for (const entry of entries) {
    const workRequest = entry.workRequest;

    const blockLabel = formatBlockLabel(
      workRequest.workDate,
      workRequest.shiftCode
    );

    const blockKey = `${formatDateOnly(workRequest.workDate)}-${entry.nominationWindowOrder}-${entry.workRequestOrderInWindow}-${workRequest.shiftCode}`;

    if (!blockMap.has(blockKey)) {
      blockMap.set(blockKey, {
        blockLabel,
        nominationWindowLabel: entry.nominationWindowLabel,
        nominationWindowOrder: entry.nominationWindowOrder,
        nominationWindowIsContinuous: entry.nominationWindowIsContinuous,
        entries: [],
      });
    }

    blockMap.get(blockKey).entries.push(entry);
  }

  return Array.from(blockMap.values());
}
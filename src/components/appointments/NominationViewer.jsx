import React from "react";

import {
  groupEntriesByBlock,
  buildPositionRows,
  getCoverageInfo,
} from "../../utils/nominationFormatter";


const formatDate = (dateValue) => {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("es-ES");
};




function getCoverageClass(type) {
  const classes = {
    primary: "bg-emerald-50 text-emerald-800 border-emerald-200",
    substitute: "bg-amber-50 text-amber-800 border-amber-200",
    bolsa: "bg-purple-50 text-purple-800 border-purple-200",
    estiba: "bg-sky-50 text-sky-800 border-sky-200",
    machine: "bg-blue-50 text-blue-800 border-blue-200",
    uncovered: "bg-red-50 text-red-800 border-red-200",
    other: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return classes[type] || classes.other;
}

function getCoverageDotClass(type) {
  const classes = {
    primary: "bg-emerald-500",
    substitute: "bg-amber-500",
    bolsa: "bg-purple-500",
    estiba: "bg-sky-500",
    machine: "bg-blue-500",
    uncovered: "bg-red-500",
    other: "bg-slate-400",
  };

  return classes[type] || classes.other;
}

function SummaryCard({ label, value, tone = "default" }) {
  const valueClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "danger"
      ? "text-red-700"
      : "text-slate-950";

  return (
    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function PositionSummaryChip({ positionCode, data }) {
  const completed = Number(data?.uncovered || 0) === 0;

  return (
    <div
      className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm border ${
        completed
          ? "bg-slate-50 border-slate-100"
          : "bg-red-50 border-red-200"
      }`}
    >
      <span className="font-black text-slate-900">{positionCode}</span>
      <span className={completed ? "text-slate-600" : "text-red-700 font-bold"}>
        {data?.assigned || 0}/{data?.requested || 0}
      </span>
    </div>
  );
}

function WorkerChip({ assignment }) {
  const coverageInfo = getCoverageInfo(assignment);
  const className = getCoverageClass(coverageInfo.type);

  return (
    <div
      title={coverageInfo.description}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${className}`}
    >
      <span className="font-black">{assignment.workerCode}</span>
      {/*<span className="hidden sm:inline">{assignment.workerName}</span>
      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] uppercase tracking-wide">
        {coverageInfo.label}
      </span>*/}
    </div>
  );
}

function UncoveredChip() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800">
      <span className="font-black">X</span>
      <span>Sin cubrir</span>
    </div>
  );
}

function LegendItem({ type, label }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
      <span className={`h-3 w-3 rounded-full ${getCoverageDotClass(type)}`} />
      <span>{label}</span>
    </div>
  );
}

function WorkRequestCard({ entry }) {
  const workRequest = entry.workRequest;

  const rows = buildPositionRows(entry);

  const assigned = rows.reduce(
    (total, row) => total + row.assigned.length,
    0
  );

  const uncovered = rows.reduce(
    (total, row) => total + row.uncovered.length,
    0
  );

  const coverageCounters = rows
    .flatMap((row) => row.assigned)
    .reduce(
      (acc, assignment) => {
        const info = getCoverageInfo(assignment);
        acc[info.type] = (acc[info.type] || 0) + 1;
        return acc;
      },
      {
        primary: 0,
        substitute: 0,
        bolsa: 0,
        estiba: 0,
        machine: 0,
        other: 0,
      }
    );

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black text-slate-950">
                {workRequest.shipName || "SIN BARCO"}
              </h3>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  workRequest.status === "CONFIRMED"
                    ? "bg-emerald-100 text-emerald-800"
                    : workRequest.status === "CHANGEABLE"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {workRequest.status || "SIN ESTADO"}
              </span>
            </div>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {workRequest.requestingCompanyName || "SIN EMPRESA"} ·{" "}
              {workRequest.berth?.name || workRequest.berth?.code || "Sin muelle"}
            </p>

            <p className="mt-2 text-sm font-bold text-slate-800">
              {workRequest.taskName || workRequest.taskCode || "Sin tarea"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase text-slate-400">
                Asignados
              </p>
              <p className="text-lg font-black text-slate-950">{assigned}</p>
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase text-slate-400">
                Sin cubrir
              </p>
              <p
                className={`text-lg font-black ${
                  uncovered > 0 ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {uncovered}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase text-slate-400">
                Titulares
              </p>
              <p className="text-lg font-black text-emerald-700">
                {coverageCounters.primary || 0}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase text-slate-400">
                Suplentes
              </p>
              <p className="text-lg font-black text-amber-700">
                {coverageCounters.substitute || 0}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase text-slate-400">
                Bolsa
              </p>
              <p className="text-lg font-black text-purple-700">
                {coverageCounters.bolsa || 0}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase text-slate-400">
                Estiba/Maq.
              </p>
              <p className="text-lg font-black text-blue-700">
                {(coverageCounters.estiba || 0) + (coverageCounters.machine || 0)}
              </p>
            </div>
          </div>
        </div>

        {workRequest.observations && (
          <div className="mt-4 rounded-xl border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {workRequest.observations}
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {rows.map((row) => {
          const totalCovered = row.assigned.length;
          const totalUncovered = row.uncovered.length;

          return (
            <div
              key={`${row.originalPositionCode || row.positionCode}-${row.positionCode}`}
              className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[190px_1fr_130px]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
                  {row.quantity}
                </span>

                <div>
                  <p className="font-black text-slate-950">
                    {row.positionCode}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    {totalCovered}/{row.quantity} cubiertos
                    {totalUncovered > 0 ? ` · ${totalUncovered} sin cubrir` : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {row.assigned.map((assignment) => (
                  <WorkerChip
                    key={`${assignment.workerId}-${assignment.positionCode}-${assignment.unitNumber}`}
                    assignment={assignment}
                  />
                ))}

                {row.uncovered.map((item) => (
                  <UncoveredChip
                    key={`${item.workRequestId}-${item.positionCode}-${item.unitNumber}`}
                  />
                ))}
              </div>

              <div className="flex items-center lg:justify-end">
                <div
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    totalUncovered > 0
                      ? "bg-red-100 text-red-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {totalUncovered > 0 ? "Incompleto" : "Completo"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function RestExclusionsBox({ restExclusions = [] }) {
  if (!Array.isArray(restExclusions) || restExclusions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Trabajadores excluidos por descanso anual
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-600">
            Estos trabajadores tenían descanso seleccionado y el motor no los ha nombrado.
          </p>
        </div>

        <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Excluidos
          </p>

          <p className="text-3xl font-black text-blue-700">
            {restExclusions.length}
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-blue-100 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Trabajador</th>
              <th className="px-4 py-3">Grupo profesional</th>
              <th className="px-4 py-3">Grupo descanso</th>
              <th className="px-4 py-3">Bloque</th>
              <th className="px-4 py-3">Motivo</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {restExclusions.map((item, index) => (
              <tr key={`${item.workerId || "worker"}-${item.date || "date"}-${index}`}>
                <td className="px-4 py-3 font-black text-slate-950">
                  {formatDate(item.date)}
                </td>

                <td className="px-4 py-3">
                  <div className="font-black text-slate-950">
                    {item.workerCode || "-"} · {item.fullName || "-"}
                  </div>
                </td>

                <td className="px-4 py-3 font-bold text-slate-700">
                  {item.mainProfessionalGroup || "-"}
                </td>

                <td className="px-4 py-3 font-bold text-slate-700">
                  {item.restGroupCode || "-"}
                </td>

                <td className="px-4 py-3 font-semibold text-slate-600">
                  {item.blockLabel || item.blockCode || "-"}
                </td>

                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
                    Descanso anual
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function NominationViewer({ simulationData, data }) {
  const result =
  simulationData?.data?.result ||
  simulationData?.data ||
  simulationData?.result ||
  simulationData;

  if (!result) {
    return (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
         <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
             ⚓
            </div>

            <h2 className="text-2xl font-black text-slate-900">
            No hay simulación cargada
            </h2>

            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
            Pulsa en{" "}
            <span className="font-bold text-slate-900">
                Simular nombramiento
            </span>{" "}
            para generar el nombramiento y ver los turnos agrupados por bloque,
            barco, muelle y puesto.
            </p>

            <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Paso 1
                </p>
                <p className="mt-1 font-bold text-slate-900">Generar bloque</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Paso 2
                </p>
                <p className="mt-1 font-bold text-slate-900">
                Asignar trabajadores
                </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Paso 3
                </p>
                <p className="mt-1 font-bold text-slate-900">
                Visualizar resultado
                </p>
            </div>
            </div>
        </div>
        </section>
    );
    
  }

  const summary = result.summary || {};
  const blocks = groupEntriesByBlock(result);
  const byPosition = summary.byPosition || {};

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              Simulación de nombramiento
            </h2>

            <p className="mt-2 text-sm font-semibold text-slate-600">
              {summary.strategyCode || "SIN ESTRATEGIA"} ·{" "}
              {summary.strategyName || "Estrategia no indicada"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Puerto: {summary.portId || "-"}
            </p>

            <div
              className={`mt-4 inline-flex items-center rounded-full px-4 py-2 text-sm font-black ${
                Number(summary.uncoveredPositions || 0) === 0
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {Number(summary.uncoveredPositions || 0) === 0
                ? "Todo cubierto"
                : `${summary.uncoveredPositions} puestos sin cubrir`}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:min-w-[520px]">
            <SummaryCard label="Trabajos" value={summary.workRequests || 0} />
            <SummaryCard label="Puestos" value={summary.positionsToCover || 0} />
            <SummaryCard
              label="Asignados"
              value={summary.assignedPositions || 0}
              tone="success"
            />
            <SummaryCard
              label="Sin cubrir"
              value={summary.uncoveredPositions || 0}
              tone={Number(summary.uncoveredPositions || 0) > 0 ? "danger" : "success"}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(byPosition).map(([positionCode, positionData]) => (
            <PositionSummaryChip
              key={positionCode}
              positionCode={positionCode}
              data={positionData}
            />
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
            Leyenda
          </p>

          <div className="flex flex-wrap gap-4">
            <LegendItem type="primary" label="Titular" />
            <LegendItem type="substitute" label="Suplente" />
            <LegendItem type="bolsa" label="Bolsa" />
            <LegendItem type="estiba" label="Estiba" />
            <LegendItem type="machine" label="Maquinaria" />
            <LegendItem type="uncovered" label="Sin cubrir" />
          </div>
        </div>
      </div>

      <RestExclusionsBox restExclusions={result?.restExclusions || []} />

      {blocks.map((block,index) => (
        <div key={`${block.blockLabel}-${index}`} className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              Bloque {block.blockLabel}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {block.entries.length} trabajos en este bloque
            </p>
          </div>

          <div className="space-y-5">
            {block.entries.map((entry) => (
              <WorkRequestCard
                key={entry.workRequest._id}
                entry={entry}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
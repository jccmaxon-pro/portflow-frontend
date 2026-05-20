import React from "react";
import {
  buildPositionRows,
  groupEntriesByBlock,
} from "../../utils/nominationFormatter";

function sameHighlightedWorker({ assignment, highlightedWorkerCode }) {
  if (!assignment || !highlightedWorkerCode) {
    return false;
  }

  return String(assignment.workerCode) === String(highlightedWorkerCode);
}

function WorkerBadge({ assignment, highlightedWorkerCode }) {
  if (!assignment) {
    return null;
  }

  const isDouble =
    assignment.isDouble ||
    String(assignment.coverageType || "").includes("DOUBLE") ||
    String(assignment.phase || "").includes("DOUBLE");

  const isHighlighted = sameHighlightedWorker({
    assignment,
    highlightedWorkerCode,
  });

  if (isHighlighted) {
    return (
      <span
        className="inline-flex min-w-12 justify-center rounded-lg bg-blue-600 px-3 py-1 text-sm font-black text-white ring-2 ring-blue-300"
        title={assignment.reason || "Tu asignación"}
      >
        {assignment.workerCode}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex min-w-10 justify-center rounded-lg px-2.5 py-1 text-sm font-black ${
        isDouble
          ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
          : "bg-slate-100 text-slate-900 ring-1 ring-slate-200"
      }`}
      title={assignment.reason || ""}
    >
      {assignment.workerCode}
    </span>
  );
}

function MissingBadge() {
  return (
    <span className="inline-flex rounded-lg bg-red-100 px-2.5 py-1 text-sm font-black text-red-800 ring-1 ring-red-200">
      SIN CUBRIR
    </span>
  );
}

function PositionLine({ row, highlightedWorkerCode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 border-t border-slate-100 px-4 py-2.5 first:border-t-0">
      <div>
        <div className="text-sm font-black text-slate-900">
          {row.positionCode}
        </div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {row.quantity} puesto/s
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {row.assigned.map((assignment, index) => (
          <WorkerBadge
            key={`${assignment.workerId}-${assignment.positionCode}-${assignment.unitNumber}-${index}`}
            assignment={assignment}
            highlightedWorkerCode={highlightedWorkerCode}
          />
        ))}

        {row.uncovered.map((uncovered, index) => (
          <MissingBadge
            key={`${uncovered.positionCode}-${uncovered.unitNumber}-${index}`}
          />
        ))}

        {row.assigned.length === 0 && row.uncovered.length === 0 && (
          <span className="text-sm font-bold text-slate-400">—</span>
        )}
      </div>
    </div>
  );
}

function WorkRequestSheet({ entry, highlightedWorkerCode }) {
  const workRequest = entry.workRequest;
  const rows = buildPositionRows(entry);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-black uppercase tracking-tight text-slate-950">
              {workRequest.shipName || "SIN BARCO"}
            </h4>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {workRequest.berth?.name || "Sin muelle"} ·{" "}
              {workRequest.taskName || workRequest.taskCode || "Trabajo"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 px-3 py-2 text-right text-white">
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Turno
            </div>
            <div className="text-sm font-black">{workRequest.shiftCode}</div>
          </div>
        </div>
      </header>

      <div className="bg-slate-50/70">
        {rows.map((row) => (
          <PositionLine
            key={row.originalPositionCode}
            row={row}
            highlightedWorkerCode={highlightedWorkerCode}
          />
        ))}
      </div>
    </article>
  );
}

function BlockSheet({ block, highlightedWorkerCode }) {
  return (
    <section className="rounded-3xl border border-slate-300 bg-slate-100 p-4 shadow-sm">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950 px-5 py-4 text-white">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            Bloque de nombramiento
          </p>

          <h3 className="mt-1 text-2xl font-black tracking-tight">
            {block.blockLabel}
          </h3>

          {block.nominationWindowLabel && (
            <p className="mt-1 text-sm font-bold text-slate-300">
              {block.nominationWindowLabel}
            </p>
          )}
        </div>

        {block.nominationWindowIsContinuous && (
          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-800">
            Corrido
          </span>
        )}
      </header>

      <div className="grid gap-4">
        {block.entries.map((entry) => (
          <WorkRequestSheet
            key={entry.workRequest._id}
            entry={entry}
            highlightedWorkerCode={highlightedWorkerCode}
          />
        ))}
      </div>
    </section>
  );
}

function Legend({ highlightedWorkerCode }) {
  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-10 rounded-lg bg-slate-100 ring-1 ring-slate-200" />
        <span className="font-bold text-slate-600">Normal</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-10 rounded-lg bg-amber-100 ring-1 ring-amber-200" />
        <span className="font-bold text-slate-600">Doble</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-10 rounded-lg bg-red-100 ring-1 ring-red-200" />
        <span className="font-bold text-slate-600">Sin cubrir</span>
      </div>

      {highlightedWorkerCode && (
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-10 rounded-lg bg-blue-600 ring-2 ring-blue-300" />
          <span className="font-bold text-slate-600">
            Tú: {highlightedWorkerCode}
          </span>
        </div>
      )}
    </div>
  );
}

export default function NominationVisualResult({
  simulationResult,
  highlightedWorkerCode = null,
}) {
  if (!simulationResult) {
    return null;
  }

  const blocks = groupEntriesByBlock(simulationResult);
  const summary = simulationResult.summary || {};

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-500">
              Nombramiento publicado
            </p>

            <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              Vista tipo hoja de nombramiento
            </h2>

            <p className="mt-2 text-sm font-bold text-slate-500">
              Puestos {summary.positionsToCover || 0} · Asignados{" "}
              {summary.assignedPositions || 0} · Sin cubrir{" "}
              {summary.uncoveredPositions || 0} · Trabajos{" "}
              {summary.workRequests || 0}
            </p>
          </div>

          <Legend highlightedWorkerCode={highlightedWorkerCode} />
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-500">
          No hay bloques de nombramiento para mostrar.
        </div>
      ) : (
        blocks.map((block) => (
          <BlockSheet
            key={`${block.blockLabel}-${block.nominationWindowOrder}`}
            block={block}
            highlightedWorkerCode={highlightedWorkerCode}
          />
        ))
      )}
    </div>
  );
}
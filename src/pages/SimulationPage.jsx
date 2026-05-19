import { useState } from "react";
import { simulateAppointmentBlock } from "../api/appointmentSimulationApi";
import NominationViewer from "../components/appointments/NominationViewer";
import "./SimulationPage.css";

function SimulationPage() {
  const [simulationData, setSimulationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Activa/desactiva la estrategia especial de controladores Málaga.
   *
   * Si está desactivado, el backend debe nombrar como hasta ahora.
   * Si está activado, más adelante el backend usará la estrategia:
   * MALAGA_CONTROLLERS_NIGHT_PRIORITY
   */
  const [useSpecialControllersNomination, setUseSpecialControllersNomination] =
    useState(false);

  async function handleRunSimulation() {
    try {
      setLoading(true);
      setErrorMessage("");

      const payload = {
        portId: "69f210fe5417a1641d23188d",
        strategyCode: "MALAGA_DEFAULT",

        /**
         * Opciones especiales de simulación.
         *
         * De momento solo preparamos la opción.
         * El backend todavía puede ignorarla sin romper nada.
         */
        simulationOptions: {
          specialNominationStrategies: useSpecialControllersNomination
            ? {
                CONTROLADORES: "MALAGA_CONTROLLERS_NIGHT_PRIORITY",
              }
            : {},
        },

        doorStartByRotationList: {
          CONTROLADORES_PRINCIPAL: "733",
          CAPATACES_PRINCIPAL: "230",
          REACH_STACKER_PRINCIPAL: "111",
          GRUISTAS_PRINCIPAL: "336",
          ESTIBA_PRINCIPAL: "404",
          PALISTAS_PRINCIPAL: "352",
          ANOTADORES_SUPLENTES: "211",
        },

        /**
         * Simulamos dos días completos:
         *
         * - 2026-05-04
         * - 2026-05-05
         *
         * Esto nos sirve para comprobar si los trabajadores que doblan
         * quedan bloqueados por descanso y vuelven a estar disponibles
         * cuando la tabla de descansos permite reincorporarse.
         */
        blockItems: [
          // Día 1
          {
            workDate: "2026-05-04",
            shiftCode: "02_08",
          },
          {
            workDate: "2026-05-04",
            shiftCode: "08_18",
          },
          {
            workDate: "2026-05-04",
            shiftCode: "08_14",
          },
          {
            workDate: "2026-05-04",
            shiftCode: "14_20",
          },
          {
            workDate: "2026-05-04",
            shiftCode: "18_24",
          },
          {
            workDate: "2026-05-04",
            shiftCode: "20_02",
          },

          // Día 2
          {
            workDate: "2026-05-05",
            shiftCode: "02_08",
          },
          {
            workDate: "2026-05-05",
            shiftCode: "08_18",
          },
          {
            workDate: "2026-05-05",
            shiftCode: "08_14",
          },
          {
            workDate: "2026-05-05",
            shiftCode: "14_20",
          },
          {
            workDate: "2026-05-05",
            shiftCode: "18_24",
          },
          {
            workDate: "2026-05-05",
            shiftCode: "20_02",
          },
        ],
      };

      console.log("PAYLOAD SIMULACIÓN:", payload);

      const result = await simulateAppointmentBlock(payload);

      if (!result.success) {
        throw new Error(result.message || "No se pudo generar la simulación");
      }

      setSimulationData(result.data);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error generando la simulación"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="simulation-page">
      <header className="simulation-header">
        <div>
          <h1>Simulación de nombramiento</h1>
          <p>
            Visualiza el resultado del nombramiento agrupado por turno, barco,
            muelle y puesto.
          </p>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "16px",
              fontWeight: 700,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={useSpecialControllersNomination}
              onChange={(event) =>
                setUseSpecialControllersNomination(event.target.checked)
              }
            />

            <span>Activar nombramiento especial de controladores Málaga</span>
          </label>

          <p
            style={{
              marginTop: "6px",
              fontSize: "13px",
              color: "#64748b",
              maxWidth: "720px",
            }}
          >
            Si está desactivado, el motor nombra como hasta ahora. Si está
            activado, se enviará la opción para priorizar titulares de
            controladores en turnos nocturnos.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={handleRunSimulation}
          disabled={loading}
        >
          {loading ? "Simulando..." : "Simular nombramiento"}
        </button>
      </header>

      {errorMessage && <div className="error-box">{errorMessage}</div>}

      {!simulationData && !loading && (
        <section className="empty-box">
          Pulsa <strong>Simular nombramiento</strong> para obtener una visual
          parecida a la hoja de nombramiento.
        </section>
      )}

      {loading && (
        <section className="empty-box">Generando simulación...</section>
      )}

      <NominationViewer simulationData={simulationData} />
    </main>
  );
}

export default SimulationPage;
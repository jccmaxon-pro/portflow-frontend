import React, { useEffect, useMemo, useState } from "react";
import SimulationPage from "./pages/SimulationPage";
import WorkersPage from "./pages/WorkersPage";
import CompanyWorkRequestsPage from "./pages/company/CompanyWorkRequestsPage";
import {
  clearAuthToken,
  getAuthToken,
  getMe,
  loginUser,
  saveAuthToken,
} from "./api/authApi";

const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  PORT_ADMIN: "PORT_ADMIN",
  NOMINATOR: "NOMINATOR",
  COMPANY_USER: "COMPANY_USER",
  WORKER: "WORKER",
};

function getUserDisplayName(user) {
  if (!user) {
    return "";
  }

  return user.name || user.email || "Usuario";
}

function getRoleLabel(role) {
  const labels = {
    SUPER_ADMIN: "Super administrador",
    PORT_ADMIN: "Administrador de puerto",
    NOMINATOR: "Empresa nominadora",
    COMPANY_USER: "Empresa solicitante",
    WORKER: "Trabajador",
  };

  return labels[role] || role || "Sin rol";
}

function buildMenuForUser(user) {
  const role = user?.role;

  if (!role) {
    return [];
  }

  if (
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.PORT_ADMIN ||
    role === ROLES.NOMINATOR
  ) {
    return [
      {
        key: "dashboard",
        label: "Dashboard",
      },
      {
        key: "simulation",
        label: "Simulación",
      },
      {
        key: "workers",
        label: "Gestión de personal",
      },
      {
        key: "workRequests",
        label: "Solicitudes de trabajo",
      },
      {
        key: "companies",
        label: "Empresas",
      },
    ];
  }

  if (role === ROLES.COMPANY_USER) {
    return [
      {
        key: "companyDashboard",
        label: "Dashboard empresa",
      },
      {
        key: "companyWorkRequests",
        label: "Mis solicitudes",
      },
      {
        key: "companyTemplates",
        label: "Plantillas de trabajo",
      },
    ];
  }

  if (role === ROLES.WORKER) {
    return [
      {
        key: "workerDashboard",
        label: "Mi panel",
      },
      {
        key: "workerAppointments",
        label: "Mi nombramiento",
      },
    ];
  }

  return [];
}

function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("terminales@portflow.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setErrorMessage("");

      const result = await loginUser({
        email,
        password,
      });

      if (!result.success) {
        throw new Error(result.message || "No se pudo iniciar sesión");
      }

      const token = result.token || result.data?.token;

      if (!token) {
        throw new Error("El backend no devolvió token");
      }

      saveAuthToken(token);

      const meResult = await getMe();

      if (!meResult.success) {
        throw new Error(meResult.message || "No se pudo cargar el usuario");
      }

      onLoginSuccess(meResult.data);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Error iniciando sesión"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl">
          <div className="mb-12 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-200">
            PORTFLOW
          </div>

          <h1 className="mb-5 text-4xl font-black leading-tight">
            Plataforma profesional de solicitudes y nombramientos portuarios
          </h1>

          <p className="max-w-2xl text-lg text-slate-300">
            Empresas solicitantes, empresa nominadora y trabajadores en una
            única plataforma segura, con permisos por rol y motor de
            nombramiento integrado.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-2xl font-black">01</p>
              <p className="mt-2 text-sm text-slate-300">
                Solicitud rápida de trabajo
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-2xl font-black">02</p>
              <p className="mt-2 text-sm text-slate-300">
                Control por horarios y estados
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-2xl font-black">03</p>
              <p className="mt-2 text-sm text-slate-300">
                Motor de nombramiento
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl"
        >
          <h2 className="text-2xl font-black text-slate-900">
            Iniciar sesión
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Entra con un usuario de empresa, nominador o administrador.
          </p>

          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="usuario@empresa.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Contraseña
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                placeholder="••••••••"
              />
            </label>
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full rounded-2xl bg-slate-950 px-5 py-3 font-black text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="mt-5 text-xs text-slate-500">
            Para pruebas, puedes usar el usuario de empresa que acabamos de
            crear: terminales@portflow.com
          </p>
        </form>
      </section>
    </main>
  );
}

function PlaceholderPage({ title, description }) {
  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-100 p-8">
      <section className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">
          Portflow
        </p>
        <h1 className="text-3xl font-black text-slate-900">{title}</h1>
        <p className="mt-3 max-w-3xl text-slate-600">{description}</p>
      </section>
    </main>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [initialLoading, setInitialLoading] = useState(true);

  const menuItems = useMemo(() => {
    return buildMenuForUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    async function loadSession() {
      try {
        const token = getAuthToken();

        if (!token) {
          setInitialLoading(false);
          return;
        }

        const result = await getMe();

        if (result.success) {
          setCurrentUser(result.data);

          const firstMenuItem = buildMenuForUser(result.data)[0];

          if (firstMenuItem) {
            setCurrentPage(firstMenuItem.key);
          }
        }
      } catch (error) {
        clearAuthToken();
        setCurrentUser(null);
      } finally {
        setInitialLoading(false);
      }
    }

    loadSession();
  }, []);

  useEffect(() => {
    if (!currentUser || menuItems.length === 0) {
      return;
    }

    const currentPageAllowed = menuItems.some((item) => {
      return item.key === currentPage;
    });

    if (!currentPageAllowed) {
      setCurrentPage(menuItems[0].key);
    }
  }, [currentUser, currentPage, menuItems]);

  function handleLoginSuccess(user) {
    setCurrentUser(user);

    const firstMenuItem = buildMenuForUser(user)[0];

    if (firstMenuItem) {
      setCurrentPage(firstMenuItem.key);
    }
  }

  function handleLogout() {
    clearAuthToken();
    setCurrentUser(null);
    setCurrentPage("dashboard");
  }

  if (initialLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl bg-white px-8 py-6 font-black text-slate-800 shadow">
          Cargando Portflow...
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xl font-black tracking-tight text-slate-950">
              PORTFLOW
            </div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {getRoleLabel(currentUser.role)}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {menuItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setCurrentPage(item.key)}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${
                  currentPage === item.key
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-black text-slate-900">
                {getUserDisplayName(currentUser)}
              </div>
              <div className="text-xs text-slate-500">
                {currentUser.company?.name ||
                  currentUser.port?.name ||
                  "Plataforma"}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      {currentPage === "dashboard" && (
        <PlaceholderPage
          title="Dashboard operativo"
          description="Aquí pondremos el resumen de solicitudes, trabajos pendientes, nombramientos y avisos del puerto."
        />
      )}

      {currentPage === "simulation" && <SimulationPage />}

      {currentPage === "workers" && <WorkersPage />}

      {currentPage === "workRequests" && (
        <PlaceholderPage
          title="Solicitudes de trabajo"
          description="Panel de la empresa nominadora para revisar, confirmar, marcar como susceptible o rechazar solicitudes."
        />
      )}

      {currentPage === "companies" && (
        <PlaceholderPage
          title="Empresas"
          description="Gestión de empresas solicitantes, usuarios de empresa y permisos."
        />
      )}

      {currentPage === "companyDashboard" && (
        <PlaceholderPage
          title="Dashboard empresa"
          description="Resumen de solicitudes enviadas, confirmadas, rechazadas y próximas ventanas límite."
        />
      )}

      {currentPage === "companyWorkRequests" && (
        <CompanyWorkRequestsPage currentUser={currentUser} />
      )}

      {currentPage === "companyTemplates" && (
        <PlaceholderPage
          title="Plantillas de trabajo"
          description="Aquí guardaremos trabajos típicos: contenedores 1 mano, 2 manos, RO-RO, granel, provisiones, etc."
        />
      )}

      {currentPage === "workerDashboard" && (
        <PlaceholderPage
          title="Mi panel de trabajador"
          description="Aquí el trabajador verá su nombramiento, descansos, restricciones e informe mensual."
        />
      )}

      {currentPage === "workerAppointments" && (
        <PlaceholderPage
          title="Mi nombramiento"
          description="Vista diaria del trabajo asignado al trabajador."
        />
      )}
    </div>
  );
}
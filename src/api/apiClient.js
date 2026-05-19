import axios from "axios";
import { DEV_TOKEN } from "../config/devToken";

const apiClient = axios.create({
  baseURL: "http://localhost:5001/api",
});

/**
 * Cliente API centralizado.
 *
 * Prioridad de token:
 * 1. Token real guardado tras login en localStorage.
 * 2. DEV_TOKEN solo como fallback de desarrollo.
 *
 * Esto permite seguir usando tus pruebas antiguas,
 * pero también entrar como COMPANY_USER real.
 */
apiClient.interceptors.request.use((config) => {
  const storedToken = localStorage.getItem("portflow_token");

  const token = storedToken || DEV_TOKEN;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default apiClient;
import apiClient from "./apiClient";

export async function loginUser({ email, password }) {
  const response = await apiClient.post("/auth/login", {
    email,
    password,
  });

  return response.data;
}

export async function getMe() {
  const response = await apiClient.get("/auth/me");

  return response.data;
}

export function saveAuthToken(token) {
  localStorage.setItem("portflow_token", token);
}

export function getAuthToken() {
  return localStorage.getItem("portflow_token");
}

export function clearAuthToken() {
  localStorage.removeItem("portflow_token");
}
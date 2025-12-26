import api from "./axiosClient";

export const login = (email, password) =>
  api.post("/admin/auth/login", { email, password });

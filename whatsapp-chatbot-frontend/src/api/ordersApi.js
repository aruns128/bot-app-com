import api from "./axiosClient";

export const listOrders = (params = {}) => api.get("/admin/orders", { params });
export const getOrder = (phone) => api.get(`/admin/orders/${phone}`);
export const resendInvoice = (phone) => api.post(`/admin/orders/${phone}/resend-invoice`);

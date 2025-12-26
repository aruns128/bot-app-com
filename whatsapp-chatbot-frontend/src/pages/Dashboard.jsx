import { useEffect, useState } from "react";
import api from "../api/axiosClient";

function StatCard({ title, value, color }) {
  return (
    <div className="bg-white rounded shadow p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    invoiced: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);

useEffect(() => {
  async function load() {
    const res = await api.get("/admin/orders");
    const ordersObj = res.data.orders?.[0] || {};
    
    // Convert object to array
    const orders = Object.values(ordersObj).filter(o => o.phone !== "undefined");

    const total = orders.length;
    const pending = orders.filter(o => o.state === "PAYMENT_PENDING").length;
    const paid = orders.filter(o => o.state === "PAID").length;
    const invoiced = orders.filter(o => o.state === "INVOICED").length;

    setStats({ total, pending, paid, invoiced });
    setRecentOrders(orders.slice(0, 5));
  }

  load();
}, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-gray-800">
        Dashboard
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={stats.total} color="text-gray-800" />
        <StatCard title="Pending Payment" value={stats.pending} color="text-orange-500" />
        <StatCard title="Paid" value={stats.paid} color="text-blue-600" />
        <StatCard title="Invoiced" value={stats.invoiced} color="text-green-600" />
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded shadow">
        <div className="p-4 border-b font-medium">
          Recent Orders
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Total</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={o.phone} className="border-t">
                <td className="p-3">{o.phone}</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded text-xs bg-gray-200">
                    {o.state}
                  </span>
                </td>
                <td className="p-3">
                  ₹{o.context?.total || 0}
                </td>
                <td className="p-3">
                  <a
                    href={`/orders/${o.phone}`}
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}

            {recentOrders.length === 0 && (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

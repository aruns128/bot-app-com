import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listOrders } from "../api/ordersApi";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");

  const load = async () => {
    const res = await listOrders({ state: state || undefined, phone: phone || undefined });
    setOrders(res.data.orders || []);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Orders</h1>
        <button onClick={load} className="px-3 py-2 rounded bg-gray-900 text-white">
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded shadow flex gap-3 flex-wrap">
        <input
          className="border rounded px-3 py-2"
          placeholder="Search phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="">All</option>
          <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
          <option value="PAID">PAID</option>
          <option value="INVOICED">INVOICED</option>
        </select>

        <button onClick={load} className="px-3 py-2 rounded bg-blue-600 text-white">
          Apply
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">State</th>
              <th className="p-3 text-left">Total</th>
              <th className="p-3 text-left">Order ID</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.phone} className="border-t">
                <td className="p-3">{o.phone}</td>
                <td className="p-3">{o.state}</td>
                <td className="p-3">₹{o.context?.total || 0}</td>
                <td className="p-3">{o.context?.orderId || "-"}</td>
                <td className="p-3">
                  <Link className="text-blue-600 hover:underline" to={`/orders/${o.phone}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  No orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

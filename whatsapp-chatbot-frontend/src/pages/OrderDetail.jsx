import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getOrder, resendInvoice } from "../api/ordersApi";

export default function OrderDetail() {
  const { phone } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const res = await getOrder(phone);
    setOrder(res.data);
  };

  useEffect(() => { load(); }, [phone]);

  const onResend = async () => {
    setMsg("");
    setLoading(true);
    try {
      const res = await resendInvoice(phone);
      setMsg(`✅ Invoice resent: ${res.data.invoiceUrl}`);
      await load();
    } catch (e) {
      setMsg(e?.response?.data?.error || "Failed to resend invoice");
    } finally {
      setLoading(false);
    }
  };

  if (!order) return <div>Loading...</div>;

  const orderId = order.context?.orderId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Order: {phone}</h1>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-3 py-2 rounded bg-gray-900 text-white"
          >
            Refresh
          </button>
          <button
            onClick={onResend}
            disabled={loading}
            className={`px-3 py-2 rounded text-white ${
              loading ? "bg-blue-300" : "bg-blue-600"
            }`}
          >
            {loading ? "Resending..." : "Resend Invoice"}
          </button>
        </div>
      </div>

      {msg && (
        <div className="bg-white border rounded p-3 text-sm">
          {msg}
        </div>
      )}

      {orderId && (
        <a
          className="text-blue-600 hover:underline"
          href={`http://localhost:3000/invoice/${orderId}.pdf`}
          target="_blank"
          rel="noreferrer"
        >
          Download Invoice PDF
        </a>
      )}

      <div className="bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-2">Raw Order Data</h2>
        <pre className="text-xs overflow-auto">{JSON.stringify(order, null, 2)}</pre>
      </div>
    </div>
  );
}

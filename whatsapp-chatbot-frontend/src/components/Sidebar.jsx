import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 text-white p-4">
      <h2 className="text-xl font-bold mb-6">Bakery Admin</h2>
      <nav className="space-y-3">
        <Link to="/" className="block">Dashboard</Link>
        <Link to="/orders" className="block">Orders</Link>
      </nav>
    </div>
  );
}

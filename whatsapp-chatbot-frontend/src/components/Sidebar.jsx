import { Link, useLocation } from "react-router-dom";
import { MdChat, MdDashboard, MdShoppingCart } from "react-icons/md";

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="w-64 bg-gray-900 text-white p-4 h-screen overflow-hidden">
      <h2 className="text-xl font-bold mb-6">Admin Panel</h2>

      <div className="flex flex-col justify-between h-full">
        <nav className="flex flex-col space-y-3">
          <Link 
            to="/" 
            className={`flex items-center gap-2 py-2 rounded transition ${
              isActive("/") ? "bg-blue-600 border-blue-400" : "hover:bg-gray-800"
            }`}
          >
            <MdDashboard /> Dashboard
          </Link>
          <Link 
            to="/orders" 
            className={`flex items-center gap-2 py-2 rounded transition ${
              isActive("/orders") ? "bg-blue-600 border-blue-400" : "hover:bg-gray-800"
            }`}
          >
            <MdShoppingCart /> Orders
          </Link>
          <Link 
            to="/chatbot" 
            className={`flex items-center gap-2 py-2 rounded transition ${
              isActive("/chatbot") ? "bg-blue-600 border-blue-400" : "hover:bg-gray-800"
            }`}
          >
            <MdChat /> Chatbot
          </Link>
        </nav>
      </div>
    </div>
  );
}

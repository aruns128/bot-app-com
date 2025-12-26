import { Link, useLocation } from "react-router-dom";
import { MdDashboard, MdShoppingCart } from "react-icons/md";

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="w-64 bg-gray-900 text-white p-4">
     <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
  
    <div className="flex flex-col justify-center h-full">
      <nav className="flex flex-col space-y-3 justify-center">
       
        <Link 
          to="/" 
          className={`flex items-center gap-2 py-2 rounded transition ${
            isActive("/") ? "bg-blue-600  border-blue-400" : "hover:bg-gray-800"
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
      </nav>
    </div>
      </div>
  );
}

import { useAuth } from "../auth/useAuth";
import { useNavigate } from "react-router-dom";

export default function Topbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="h-14 bg-white border-b flex items-center justify-between px-6 shadow-sm">
      {/* Left: Title */}
      <div className="text-lg font-semibold text-gray-800">
        WhatsApp Bakery Admin
      </div>

      {/* Right: User + Logout */}
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600">
          Admin
        </div>

        <button
          onClick={handleLogout}
          className="text-sm px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

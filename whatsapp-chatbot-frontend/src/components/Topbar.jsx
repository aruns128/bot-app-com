import { useAuth } from "../auth/useAuth";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Topbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleDropdown = () => {
    setDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="h-14 bg-white border-b flex items-center justify-between px-6 shadow-sm">
      {/* Left: Title */}
      <div className="text-lg font-semibold text-gray-800">
        WhatsApp Admin
      </div>

      {/* Right: User Profile */}
      <div className="relative flex items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={toggleDropdown}>
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold">
            A
          </div>
          <div className="text-sm text-gray-600">Admin</div>
        </div>

        {isDropdownOpen && (
          <div className="absolute -left-24 mt-30 w-48 bg-white border rounded-lg shadow-lg transition-transform max-h-60 overflow-auto">
            <div className="px-4 py-2 text-gray-800 font-semibold">Admin</div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-100 rounded-lg"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

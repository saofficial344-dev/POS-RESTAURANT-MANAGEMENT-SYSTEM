import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ORDER_TYPES = [
  { value: "WalkIn",   label: "Walk-In",  icon: "🚶", desc: "Counter service — no table" },
  { value: "DineIn",   label: "Dine-In",  icon: "🪑", desc: "Seated table service"        },
  { value: "Delivery", label: "Delivery", icon: "🛵", desc: "Home delivery order"          },
];

const POSEntry = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">

      {/* Back */}
      <div className="w-full max-w-md mb-8 flex items-center gap-3">
        <button
          onClick={() => navigate("/pos/dashboard")}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-900">New Order</h1>
          <p className="text-sm text-gray-500">Select order type to begin</p>
        </div>
      </div>

      {/* Type tiles */}
      <div className="w-full max-w-md space-y-3">
        {ORDER_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => navigate("/pos/menu")}
            className="w-full flex items-center gap-5 px-6 py-5 bg-white border border-gray-200 rounded-2xl hover:border-gray-400 hover:shadow-md transition-all text-left"
          >
            <span className="text-4xl">{type.icon}</span>
            <div className="flex-1">
              <p className="text-base font-bold text-gray-900">{type.label}</p>
              <p className="text-sm text-gray-400 mt-0.5">{type.desc}</p>
            </div>
            <span className="text-gray-300 text-lg">→</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default POSEntry;

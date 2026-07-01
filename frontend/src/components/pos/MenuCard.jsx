const MenuCard = ({ item, quantity = 0, onAdd }) => {
  const unavailable = item.available === false;

  return (
    <button
      type="button"
      onClick={() => !unavailable && onAdd(item)}
      disabled={unavailable}
      className={`
        group text-left w-full rounded-2xl border-2 overflow-hidden transition-all duration-200
        ${quantity > 0 ? 'border-black shadow-md' : 'border-gray-100 hover:border-gray-300 hover:shadow-sm'}
        ${unavailable ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
      `}
    >
      {/* Image */}
      {item.image ? (
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-24 object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div className="w-full h-24 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <span className="text-3xl opacity-50">🍽️</span>
        </div>
      )}

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 flex-1">
            {item.name}
          </p>
          {quantity > 0 && (
            <span className="shrink-0 text-[11px] bg-black text-white px-1.5 py-0.5 rounded-full font-bold leading-none">
              ×{quantity}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">Rs. {item.price}</span>
          {unavailable ? (
            <span className="text-[10px] font-semibold text-red-500">Unavailable</span>
          ) : (
            <span className="text-[10px] font-semibold text-emerald-500">
              {quantity > 0 ? '+ Add more' : 'Available'}
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{item.description}</p>
        )}
      </div>
    </button>
  );
};

export default MenuCard;

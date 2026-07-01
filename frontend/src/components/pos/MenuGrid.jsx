import MenuCard from './MenuCard';

const MenuGrid = ({ items, onAdd, getCartQty, loading = false, cols = '2' }) => {
  const gridClass = {
    '2': 'grid-cols-2',
    '3': 'grid-cols-2 sm:grid-cols-3',
    '4': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  }[cols] ?? 'grid-cols-2 sm:grid-cols-3';

  if (loading) {
    return (
      <div className={`grid ${gridClass} gap-3`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-44 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-sm font-semibold text-gray-400">No items found</p>
        <p className="text-xs text-gray-300 mt-1">Try a different category or search term</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridClass} gap-3`}>
      {items.map((item) => (
        <MenuCard
          key={item._id}
          item={item}
          quantity={getCartQty(item._id)}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
};

export default MenuGrid;

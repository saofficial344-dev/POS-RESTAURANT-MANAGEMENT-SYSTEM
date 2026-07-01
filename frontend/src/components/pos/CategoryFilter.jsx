const CategoryFilter = ({ categories, activeId, onSelect, className = '' }) => (
  <div className={`flex gap-2 overflow-x-auto pb-1 ${className}`} style={{ scrollbarWidth: 'none' }}>
    <button
      onClick={() => onSelect('all')}
      className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        activeId === 'all'
          ? 'bg-black text-white'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      All Items
    </button>

    {categories.map((cat) => (
      <button
        key={cat._id}
        onClick={() => onSelect(cat._id)}
        className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          activeId === cat._id
            ? 'bg-black text-white'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
      >
        {cat.name}
      </button>
    ))}
  </div>
);

export default CategoryFilter;

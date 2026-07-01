import { Search, X } from 'lucide-react';

const SearchBar = ({ value, onChange, placeholder = 'Search items…', className = '' }) => (
  <div className={`relative ${className}`}>
    <Search
      size={14}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
    />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-9 pr-8 h-10 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 bg-white transition-colors"
    />
    {value && (
      <button
        onClick={() => onChange('')}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
      >
        <X size={14} />
      </button>
    )}
  </div>
);

export default SearchBar;

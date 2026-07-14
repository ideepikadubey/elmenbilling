import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { CatalogProduct } from '../types/invoice';

interface SearchableSelectProps {
  options: CatalogProduct[];
  value: string;
  onSelect: (product: CatalogProduct) => void;
  placeholder?: string;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onSelect,
  placeholder = 'Select product...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between glass-input text-left pr-3 focus:ring-1 focus:ring-elmen-orange focus:border-elmen-orange"
      >
        <span className={value ? 'text-elmen-text' : 'text-gray-500'}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 glass-card bg-elmen-charcoal border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          {/* Search Box */}
          <div className="flex items-center px-3 border-b border-white/5 bg-black/30">
            <Search size={16} className="text-gray-500 mr-2 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              className="w-full bg-transparent border-0 text-white text-sm py-2.5 outline-none placeholder-gray-500"
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredOptions.length > 0) {
                  onSelect(filteredOptions[0]);
                  setIsOpen(false);
                  setSearch('');
                  e.preventDefault();
                }
              }}
            />
          </div>

          {/* Options List */}
          <ul className="max-h-60 overflow-y-auto py-1 text-sm">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(product);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-elmen-orange/10 hover:text-elmen-orange transition-colors duration-150 ${
                      value === product.name ? 'bg-elmen-orange/20 text-elmen-orange font-medium' : 'text-gray-300'
                    }`}
                  >
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Base Price: ₹{product.defaultPrice} | GST: {product.gstPercent}%
                    </div>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-gray-500 text-center">No products found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function Combobox({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select...", 
  label,
  className = "",
  icon
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter(option => 
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  // Find selected label
  const selectedLabel = options.find(opt => opt.value === value)?.label || "";

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && (
        <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">
          {label}
        </label>
      )}
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          // Focus search input when opening
          if (!isOpen) {
             setSearchQuery("");
             // setTimeout to allow render
             setTimeout(() => {
                const input = dropdownRef.current?.querySelector('input');
                if (input) input.focus();
             }, 0);
          }
        }}
        className={`
          w-full h-10 px-3 bg-white border rounded-md text-sm text-left
          flex items-center justify-between
          transition-all duration-200
          ${isOpen 
            ? "border-primary ring-2 ring-primary/10" 
            : "border-gray-200 hover:border-gray-300"
          }
          ${!value ? "text-gray-500" : "text-ink"}
        `}
      >
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          {icon}
          <span className="truncate">
            {selectedLabel || placeholder}
          </span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top"
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100 flex items-center gap-2 sticky top-0 bg-white">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 text-sm outline-none text-ink placeholder:text-gray-400 bg-transparent"
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button 
                onClick={(e) => {
                   e.stopPropagation();
                   setSearchQuery("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value === value ? "" : option.value); // Toggle off if clicked again
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className={`
                    w-full px-3 py-2 text-sm text-left flex items-center justify-between
                    hover:bg-primary/5 transition-colors
                    ${option.value === value ? "bg-primary/5 text-primary font-medium" : "text-ink"}
                  `}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))
            ) : (
               <div className="px-3 py-4 text-center text-xs text-gray-400">
                 No options found.
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

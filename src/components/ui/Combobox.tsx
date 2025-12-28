import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, X, Search } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: ComboboxOption[];
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  searchable?: boolean;
  multiple?: boolean;
}

export function Combobox({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select...", 
  className = "",
  icon,
  searchable = true,
  multiple = false
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search && !searchable) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search, searchable]);

  const selectedValues = useMemo(() => 
    Array.isArray(value) ? value : value ? [value] : []
  , [value]);

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange(newValues);
      // multiple selection doesn't close dropdown
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
    setSearch("");
  };

  const removeValue = (valToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
        onChange(selectedValues.filter(v => v !== valToRemove));
    } else {
        onChange("");
    }
  };

  // derived label for display
  const displayLabel = useMemo(() => {
    if (selectedValues.length === 0) return placeholder;
    
    if (multiple) {
        if (selectedValues.length === 1) {
            return options.find(o => o.value === selectedValues[0])?.label || selectedValues[0];
        }
        return `${selectedValues.length} selected`;
    } else {
        return options.find((o) => o.value === value)?.label || placeholder;
    }
  }, [selectedValues, options, placeholder, multiple, value]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all hover:bg-gray-50"
      >
        <div className="flex items-center gap-2 truncate">
            {icon && <span className="text-gray-400">{icon}</span>}
            <span className={`${selectedValues.length === 0 ? "text-gray-500" : "text-gray-900"}`}>
                {displayLabel}
            </span>
        </div>
        <div className="flex items-center gap-1">
            {!multiple && selectedValues.length > 0 && (
                <div
                    role="button"
                    onClick={(e) => removeValue(selectedValues[0], e)}
                    className="p-0.5 hover:bg-gray-200 rounded-full transition-colors mr-1"
                >
                    <X className="w-3 h-3 text-gray-400" />
                </div>
            )}
            <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 origin-top">
          {searchable && (
            <div className="p-2 border-b border-gray-100 flex items-center gap-2 sticky top-0 bg-white">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                type="text"
                className="w-full text-sm focus:outline-none placeholder:text-gray-400"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                />
            </div>
          )}
          
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">No results found</div>
            ) : (
                filteredOptions.map((option) => {
                    const isSelected = selectedValues.includes(option.value);
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSelect(option.value)}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between transition-colors
                                ${isSelected ? "bg-primary/5 text-primary font-medium" : "text-gray-700 hover:bg-gray-50"}
                            `}
                        >
                            <span className="truncate">{option.label}</span>
                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </button>
                    );
                })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export interface FilterChipProps {
  label: string;
  value: string;
  isSelected?: boolean;
  onClick?: (value: string) => void;
}

export function FilterChip({ label, value, isSelected = false, onClick }: FilterChipProps) {
  const baseStyles = "inline-flex items-center px-4 py-2 rounded-md text-small font-medium transition-all duration-150 cursor-pointer";
  const defaultStyles = "bg-gray-100 text-gray-500 hover:bg-gray-200";
  const selectedStyles = "bg-primary text-white";

  return (
    <button
      onClick={() => onClick?.(value)}
      className={`${baseStyles} ${isSelected ? selectedStyles : defaultStyles}`}
      aria-pressed={isSelected}
    >
      {label}
    </button>
  );
}

export interface FilterBarProps {
  categories: { label: string; value: string }[];
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
}

export function FilterBar({ categories, selectedCategory, onCategoryChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2 pb-2">
      <FilterChip label="All" value="" isSelected={selectedCategory === ""} onClick={onCategoryChange} />
      {categories.map((category) => (
        <FilterChip
          key={category.value}
          label={category.label}
          value={category.value}
          isSelected={selectedCategory === category.value}
          onClick={onCategoryChange}
        />
      ))}
    </div>
  );
}

export default FilterChip;

export interface FilterChipProps {
  label: string;
  value: string;
  isSelected?: boolean;
  onClick?: (value: string) => void;
}

export function FilterChip({ label, value, isSelected = false, onClick }: FilterChipProps) {
  return (
    <button
      onClick={() => onClick?.(value)}
      className={isSelected ? "chip-selected" : "chip-default"}
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
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
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

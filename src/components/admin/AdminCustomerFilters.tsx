import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import Button from '../ui/Button';

interface AdminCustomerFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  planFilter: string;
  onPlanFilterChange: (val: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (val: string) => void;
  isLoading?: boolean;
}

export default function AdminCustomerFilters({
  search,
  onSearchChange,
  planFilter,
  onPlanFilterChange,
  sourceFilter,
  onSourceFilterChange,
  isLoading = false,
}: AdminCustomerFiltersProps) {
  const [localSearch, setLocalSearch] = useState(search);

  // Debounce search update by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);

  const hasActiveFilters = Boolean(localSearch || planFilter || sourceFilter);

  const handleClear = () => {
    setLocalSearch('');
    onSearchChange('');
    onPlanFilterChange('');
    onSourceFilterChange('');
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[240px] max-w-md">
        <Search
          size={14}
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
            isLoading ? 'text-accent animate-pulse' : 'text-text-muted'
          }`}
        />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search customers by name or email..."
          className="w-full pl-9 pr-8 py-2 text-xs bg-surface-2 border border-border/70 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
        />
        {localSearch && (
          <button
            type="button"
            onClick={() => {
              setLocalSearch('');
              onSearchChange('');
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded-full"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={planFilter}
          onChange={(e) => onPlanFilterChange(e.target.value)}
          aria-label="Filter by Plan"
          className="px-3 py-2 text-xs bg-surface-2 border border-border/70 rounded-xl text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="">All Plans</option>
          <option value="agency">Agency</option>
          <option value="pro">Pro</option>
          <option value="creator">Creator</option>
          <option value="free">Free</option>
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => onSourceFilterChange(e.target.value)}
          aria-label="Filter by Access Source"
          className="px-3 py-2 text-xs bg-surface-2 border border-border/70 rounded-xl text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="">All Sources</option>
          <option value="admin_grant">Admin Granted</option>
          <option value="stripe">Stripe Paid</option>
          <option value="free">Free Fallback</option>
        </select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs text-text-muted hover:text-text-primary h-8 px-2"
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

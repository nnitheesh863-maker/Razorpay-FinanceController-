// src/components/ui/Pagination.tsx
import { Button } from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  pageSize?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  pageSize = 20,
}: PaginationProps) {
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const handlePrev = () => {
    if (canPrev) onPageChange(currentPage - 1);
  };
  const handleNext = () => {
    if (canNext) onPageChange(currentPage + 1);
  };

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={handlePrev} disabled={!canPrev} aria-label="Previous page">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <Button variant="outline" size="sm" onClick={handleNext} disabled={!canNext} aria-label="Next page">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      {onPageSizeChange && (
        <div className="flex items-center space-x-2">
          <span className="text-sm">Rows per page:</span>
          <select
            className="border border-border-subtle rounded p-1 text-sm"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

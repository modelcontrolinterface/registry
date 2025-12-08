"use client";

import {
  Pagination as PaginationRoot,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationContent,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination = ({ page, totalPages, onPageChange }: PaginationProps) => {
  return (
    <PaginationRoot>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => page > 1 && onPageChange(page - 1)}
            className={
              page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
            }
          />
        </PaginationItem>

        {[...Array(totalPages)].map((_, i) => {
          const pageNumber = i + 1;
          const isRelevantPage =
            pageNumber === 1 ||
            pageNumber === totalPages ||
            (pageNumber >= page - 1 && pageNumber <= page + 1);
          const shouldShowEllipsis =
            totalPages > 5 &&
            (pageNumber === page - 2 || pageNumber === page + 2);

          if (shouldShowEllipsis && !isRelevantPage) {
            if (
              i > 0 &&
              ((i + 1 === page - 2 && page - 2 > 1) ||
                (i === totalPages - 2 && page + 2 < totalPages))
            ) {
              return (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }
            return null;
          }

          if (isRelevantPage) {
            return (
              <PaginationItem key={i}>
                <PaginationLink
                  isActive={pageNumber === page}
                  onClick={() => onPageChange(pageNumber)}
                  className="cursor-pointer"
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            );
          }
          return null;
        })}

        {totalPages > 5 && page + 1 < totalPages && page < totalPages - 2 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        <PaginationItem>
          <PaginationNext
            onClick={() => page < totalPages && onPageChange(page + 1)}
            className={
              page === totalPages
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  );
};

export default Pagination;

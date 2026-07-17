import { cn } from "@/lib/utils";
import {
  Table as BaseTable,
  TableBody as BaseTableBody,
  TableCaption as BaseTableCaption,
  TableCell as BaseTableCell,
  TableFooter as BaseTableFooter,
  TableHead as BaseTableHead,
  TableHeader as BaseTableHeader,
  TableRow as BaseTableRow,
} from "@/components/ui/table";
import {
  forwardRef,
  type CSSProperties,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";

export const Table = BaseTable;
export const TableBody = BaseTableBody;
export const TableHeader = BaseTableHeader;
export const TableRow = BaseTableRow;
export const TableFooter = BaseTableFooter;
export const TableCaption = BaseTableCaption;

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  minWidth?: number | string;
  maxWidth?: number | string;
  truncate?: boolean;
  lineClamp?: number;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  (
    { minWidth, maxWidth, truncate, lineClamp, className, children, style, ...props },
    ref,
  ) => {
    const computedStyle: CSSProperties = {
      ...style,
      minWidth: typeof minWidth === "number" ? `${minWidth}px` : minWidth,
      maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
    };

    const content = lineClamp ? (
      <span className={cn(`line-clamp-${lineClamp}`)}>{children}</span>
    ) : truncate ? (
      <span className="block truncate">{children}</span>
    ) : (
      children
    );

    return (
      <BaseTableCell ref={ref} className={className} style={computedStyle} {...props}>
        {content}
      </BaseTableCell>
    );
  },
);
TableCell.displayName = "TableCell";

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  minWidth?: number | string;
  maxWidth?: number | string;
}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ minWidth, maxWidth, className, style, ...props }, ref) => {
    const computedStyle: CSSProperties = {
      ...style,
      minWidth: typeof minWidth === "number" ? `${minWidth}px` : minWidth,
      maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
    };

    return (
      <BaseTableHead ref={ref} className={className} style={computedStyle} {...props} />
    );
  },
);
TableHead.displayName = "TableHead";

import { MouseEvent } from "react";
import { Chip } from "@mui/material";
import { ChevronDown } from "lucide-react";

export const getProjectStatusLabel = (isActive: boolean | null | undefined): string => {
  if (isActive === true) {
    return "Active";
  }

  if (isActive === false) {
    return "Inactive";
  }

  return "—";
};

interface ProjectStatusChipProps {
  isActive: boolean | null | undefined;
  clickable?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

export function ProjectStatusChip({ isActive, clickable = false, onClick }: ProjectStatusChipProps) {
  const isInteractive = clickable && typeof onClick === "function";

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (!isInteractive) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onClick(event);
  };

  return (
    <Chip
      onClick={isInteractive ? handleClick : undefined}
      clickable={isInteractive}
      label={
        <span className="inline-flex items-center gap-1">
          <span>{getProjectStatusLabel(isActive)}</span>
          {isInteractive ? <ChevronDown aria-hidden={true} size={16} /> : null}
        </span>
      }
      size="small"
      sx={{ backgroundColor: "var(--color-subtle)", color: "var(--color-primary)", fontWeight: 600 }}
    />
  );
}

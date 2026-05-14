import { Tabs, TabsProps } from "@mui/material";

export function PrimaryTabs(props: TabsProps) {
  return (
    <Tabs
      {...props}
      sx={{
        "& .MuiTab-root.Mui-selected": {
          color: "var(--color-primary)",
        },
        "& .MuiTab-root .MuiTouchRipple-child": {
          backgroundColor: "var(--color-secondary)",
        },
        "& .MuiTabs-indicator": {
          backgroundColor: "var(--color-primary)",
        },
        ...props.sx,
      }}
    />
  );
}

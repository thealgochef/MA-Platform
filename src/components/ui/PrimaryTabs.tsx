import { useEffect, useRef } from "react";
import { Tabs, TabsProps } from "@mui/material";

export function PrimaryTabs(props: TabsProps) {
  const tabsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!tabsRef.current) {
      return;
    }

    const tabs = tabsRef.current.querySelectorAll<HTMLElement>("[role='tab']");
    tabs.forEach((tab) => {
      tab.tabIndex = 0;
    });
  }, [props.children, props.value]);

  return (
    <Tabs
      {...props}
      ref={tabsRef}
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

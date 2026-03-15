"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = { config: ChartConfig };

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error("useChart must be used within <ChartContainer />");
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { config: ChartConfig; children: React.ReactNode }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        data-chart={chartId}
        className={cn("flex aspect-video justify-center text-xs", className)}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "Chart";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([_, cfg]) => cfg.theme || cfg.color);
  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .filter(Boolean)
  .join("\n")}
}`
          )
          .join("\n"),
      }}
    />
  );
};

// Custom Tooltip Payload type
type RechartsTooltipItem = {
  value: any;
  name?: string;
  dataKey?: string | number;
  [key: string]: any;
};

type RechartsTooltipPayload = RechartsTooltipItem[];

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  {
    active?: boolean;
    payload?: RechartsTooltipPayload;
    label?: React.ReactNode;
    className?: string;
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "dot" | "line" | "dashed";
    nameKey?: string;
    labelKey?: string;
    formatter?: (value: any, name: string, entry: RechartsTooltipItem, index: number) => React.ReactNode;
  }
>(
  (
    { active, payload, label, className, hideLabel, hideIndicator, indicator = "dot", nameKey, labelKey, formatter },
    ref
  ) => {
    const { config } = useChart();
    if (!active || !payload?.length) return null;

    return (
      <div ref={ref} className={cn("p-2 bg-white shadow-lg rounded-md", className)}>
        {payload.map((item, idx) => {
          const key = `${nameKey || item.name || item.dataKey || idx}`;
          const itemConfig = config[key] || {};
          const displayValue = formatter ? formatter(item.value, item.name || "", item, idx) : item.value;

          return (
            <div key={key} className="flex justify-between gap-2">
              <span>{itemConfig.label || item.name}</span>
              <span>{displayValue}</span>
            </div>
          );
        })}
      </div>
    );
  }
);
ChartTooltipContent.displayName = "ChartTooltipContent";

export { ChartContainer, ChartStyle, ChartTooltipContent };

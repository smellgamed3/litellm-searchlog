"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface JsonViewerProps {
  data: unknown;
  initialExpanded?: boolean;
  depth?: number;
}

function JsonNode({
  value,
  depth = 0,
  initialExpanded = true,
}: {
  value: unknown;
  depth?: number;
  initialExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initialExpanded || depth < 2);

  if (value === null) {
    return <span className="text-rose-500">null</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-purple-500">{value.toString()}</span>;
  }
  if (typeof value === "number") {
    return <span className="text-blue-500">{value}</span>;
  }
  if (typeof value === "string") {
    return (
      <span className="text-green-600 dark:text-green-400">
        &quot;{value}&quot;
      </span>
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground">[]</span>;
    }
    return (
      <span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center text-xs hover:text-primary"
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
        {expanded ? (
          <span>
            <span className="text-muted-foreground">[</span>
            <div className={cn("pl-4 border-l border-border ml-2")}>
              {value.map((item, idx) => (
                <div key={idx} className="my-0.5">
                  <span className="text-muted-foreground text-xs">{idx}: </span>
                  <JsonNode value={item} depth={depth + 1} initialExpanded={false} />
                  {idx < value.length - 1 && (
                    <span className="text-muted-foreground">,</span>
                  )}
                </div>
              ))}
            </div>
            <span className="text-muted-foreground">]</span>
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            [{value.length} items]
          </span>
        )}
      </span>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="text-muted-foreground">{"{}"}</span>;
    }
    return (
      <span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center text-xs hover:text-primary"
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
        {expanded ? (
          <span>
            <span className="text-muted-foreground">{"{"}</span>
            <div className="pl-4 border-l border-border ml-2">
              {entries.map(([key, val], idx) => (
                <div key={key} className="my-0.5">
                  <span className="text-orange-600 dark:text-orange-400">
                    &quot;{key}&quot;
                  </span>
                  <span className="text-muted-foreground">: </span>
                  <JsonNode value={val} depth={depth + 1} initialExpanded={false} />
                  {idx < entries.length - 1 && (
                    <span className="text-muted-foreground">,</span>
                  )}
                </div>
              ))}
            </div>
            <span className="text-muted-foreground">{"}"}</span>
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            {"{"}
            {entries.length} keys{"}"}
          </span>
        )}
      </span>
    );
  }
  return <span>{String(value)}</span>;
}

export function JsonViewer({ data, initialExpanded = true }: JsonViewerProps) {
  return (
    <div className="font-mono text-sm bg-muted/50 rounded-md p-3 overflow-auto max-h-96">
      <JsonNode value={data} initialExpanded={initialExpanded} />
    </div>
  );
}

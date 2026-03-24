"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { JsonViewer } from "@/components/JsonViewer";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  DollarSign,
  Hash,
  MessageSquare,
  Bot,
} from "lucide-react";
import type { SpendLog } from "@/types";

interface LogDetailProps {
  log: SpendLog;
  index: number;
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function LogDetail({ log, index }: LogDetailProps) {
  const [expanded, setExpanded] = useState(false);

  const parseContent = (raw: unknown): unknown => {
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return raw;
  };

  const messages = parseContent(log.messages);
  const response = parseContent(log.response);

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm font-mono w-6">{index + 1}</span>
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{formatTime(log.startTime)}</span>
              <span className="text-xs text-muted-foreground">{formatDate(log.startTime)}</span>
            </div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">
              {log.request_id}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-xs">
            {log.model}
          </Badge>
          <div className="flex items-center gap-1 text-sm">
            <Coins className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{log.total_tokens?.toLocaleString() ?? "—"}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span>${(log.spend ?? 0).toFixed(6)}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {formatDuration(log.startTime, log.endTime)}
          </Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <>
          <Separator />
          <CardContent className="pt-4 space-y-4">
            {/* Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Call Type
                </p>
                <p className="text-sm font-medium">{log.call_type || "—"}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Prompt Tokens
                </p>
                <p className="text-sm font-medium">
                  {log.prompt_tokens?.toLocaleString() ?? "—"}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Completion Tokens
                </p>
                <p className="text-sm font-medium">
                  {log.completion_tokens?.toLocaleString() ?? "—"}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  User
                </p>
                <p className="text-sm font-medium truncate">{log.user || "—"}</p>
              </div>
            </div>

            {/* Request Messages */}
            {messages !== undefined && messages !== null ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Request Messages</h4>
                </div>
                <JsonViewer data={messages} initialExpanded={true} />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MessageSquare className="h-4 w-4" />
                <span>
                  Messages not stored. Enable{" "}
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                    store_prompts_in_spend_logs: true
                  </code>{" "}
                  in your LiteLLM config.
                </span>
              </div>
            )}

            {/* Response */}
            {response !== undefined && response !== null ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Response</h4>
                </div>
                <JsonViewer data={response} initialExpanded={true} />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Bot className="h-4 w-4" />
                <span>
                  Response not stored. Enable{" "}
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                    store_prompts_in_spend_logs: true
                  </code>{" "}
                  in your LiteLLM config.
                </span>
              </div>
            )}

            {/* Metadata */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Metadata</h4>
                </div>
                <JsonViewer data={log.metadata} initialExpanded={true} />
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
}

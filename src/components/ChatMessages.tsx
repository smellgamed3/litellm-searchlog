"use client";

import { cn } from "@/lib/utils";
import { JsonViewer } from "@/components/JsonViewer";

interface ToolCall {
  id?: string;
  function?: {
    name?: string;
    arguments?: string | Record<string, unknown>;
  };
  [key: string]: unknown;
}

interface ChatMessage {
  role: string;
  content: unknown;
  /** assistant 消息中的函数调用列表 */
  tool_calls?: ToolCall[] | unknown;
  /** tool 角色消息对应的函数调用 ID */
  tool_call_id?: string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
}

/** 角色对应的显示名称和样式（不在此映射中的角色会回退到通用样式） */
const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  system: {
    label: "系统",
    className: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  },
  user: {
    label: "用户",
    className: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  },
  assistant: {
    label: "助手",
    className: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
  },
  tool: {
    label: "工具",
    className: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800",
  },
};

/** 角色标签样式 */
const ROLE_BADGE: Record<string, string> = {
  system: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/50",
  user: "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50",
  assistant: "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/50",
  tool: "text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/50",
};

function renderContent(content: unknown): React.ReactNode {
  if (content === null || content === undefined) {
    return <span className="text-muted-foreground italic text-xs">（空）</span>;
  }
  // 纯文本：直接展示，保留换行
  if (typeof content === "string") {
    return (
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{content}</p>
    );
  }
  // 数组（multi-modal content）：分别渲染每个部分
  if (Array.isArray(content)) {
    return (
      <div className="space-y-2">
        {content.map((part, idx) => {
          if (typeof part === "object" && part !== null) {
            const p = part as Record<string, unknown>;
            if (p.type === "text" && typeof p.text === "string") {
              return (
                <p key={idx} className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {p.text}
                </p>
              );
            }
            if (p.type === "image_url") {
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded font-mono"
                >
                  🖼️ image_url
                </span>
              );
            }
          }
          return <JsonViewer key={idx} data={part} initialExpanded={false} />;
        })}
      </div>
    );
  }
  // 对象或其他：用 JsonViewer 展示
  return <JsonViewer data={content} initialExpanded={false} />;
}

/** 渲染单个 tool_call 块 */
function renderToolCalls(toolCalls: ToolCall[]): React.ReactNode {
  return (
    <div className="mt-2 space-y-2">
      {toolCalls.map((tc, i) => {
        const fnName = tc.function?.name ?? "(未命名函数)";
        let args: Record<string, unknown> = {};
        const rawArgs = tc.function?.arguments;
        if (typeof rawArgs === "string") {
          try {
            args = JSON.parse(rawArgs) as Record<string, unknown>;
          } catch {
            args = { raw: rawArgs };
          }
        } else if (typeof rawArgs === "object" && rawArgs !== null) {
          args = rawArgs as Record<string, unknown>;
        }
        return (
          <div
            key={tc.id ?? i}
            className="rounded-md border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-2.5 py-1 border-b border-purple-200 dark:border-purple-800">
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-sm uppercase tracking-wide text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/50">
                fn
              </span>
              <span className="font-mono text-xs font-medium">{fnName}</span>
              {tc.id && (
                <span className="font-mono text-xs text-muted-foreground ml-auto truncate max-w-[120px]">
                  {tc.id}
                </span>
              )}
            </div>
            <div className="p-2">
              <JsonViewer data={args} initialExpanded={true} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 对话消息列表组件：以对话气泡风格展示 messages 数组 */
export function ChatMessages({ messages }: ChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <p className="text-muted-foreground text-sm italic">（无消息）</p>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((msg, idx) => {
        const role = (msg.role ?? "unknown").toLowerCase();
        const config = ROLE_CONFIG[role] ?? {
          label: msg.role,
          className: "bg-muted/50 border-border",
        };
        const badge = ROLE_BADGE[role] ?? "text-muted-foreground bg-muted";

        // 处理 tool_calls（assistant 消息中的函数调用）
        const toolCallsRaw = msg.tool_calls;
        const toolCalls: ToolCall[] | null =
          Array.isArray(toolCallsRaw) && toolCallsRaw.length > 0
            ? (toolCallsRaw as ToolCall[])
            : null;

        // tool 角色时附加 tool_call_id 标识
        const toolCallId = role === "tool" ? msg.tool_call_id : undefined;

        return (
          <div
            key={idx}
            className={cn("rounded-lg border p-3", config.className)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "text-xs font-semibold px-1.5 py-0.5 rounded-sm uppercase tracking-wide",
                  badge
                )}
              >
                {config.label}
              </span>
              {toolCallId && (
                <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                  {toolCallId}
                </span>
              )}
            </div>
            {renderContent(msg.content)}
            {toolCalls && renderToolCalls(toolCalls)}
          </div>
        );
      })}
    </div>
  );
}

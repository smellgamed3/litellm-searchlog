"use client";

import { cn } from "@/lib/utils";
import { JsonViewer } from "@/components/JsonViewer";

interface ChatMessage {
  role: string;
  content: unknown;
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
            </div>
            {renderContent(msg.content)}
          </div>
        );
      })}
    </div>
  );
}

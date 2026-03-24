"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { JsonViewer } from "@/components/JsonViewer";
import { ChatMessages } from "@/components/ChatMessages";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  DollarSign,
  Hash,
  MessageSquare,
  Bot,
  FileJson,
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
  return d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * 将未知字段解析为 JavaScript 对象。
 * 如果字段是 JSON 字符串，则解析为对象；否则直接返回。
 */
function parseField(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

/**
 * 判断一个值是否"有实际内容"：
 * - null / undefined → 无内容
 * - 空字符串 / 空对象 {} / 空数组 [] → 无内容
 */
function hasContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

/**
 * 尝试从 messages 字段或 proxy_server_request.messages 中提取请求消息数组。
 *
 * LiteLLM 已知问题：普通 completion 调用的 messages 字段在数据库中始终为空 {}，
 * 实际消息存储在 proxy_server_request（原始请求体）里。
 * 参见：https://github.com/BerriAI/litellm/blob/main/litellm/proxy/spend_tracking/spend_tracking_utils.py
 */
function extractMessages(log: SpendLog): unknown[] | null {
  // 首先尝试 messages 字段
  const parsedMessages = parseField(log.messages);
  if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
    return parsedMessages;
  }

  // 回退：从 proxy_server_request 中提取
  const parsedProxyReq = parseField(log.proxy_server_request);
  if (parsedProxyReq && typeof parsedProxyReq === "object" && !Array.isArray(parsedProxyReq)) {
    const proxyMessages = (parsedProxyReq as Record<string, unknown>).messages;
    if (Array.isArray(proxyMessages) && proxyMessages.length > 0) {
      return proxyMessages;
    }
  }

  return null;
}

/**
 * 从 response 字段中提取助手回复文本（choices[0].message.content）。
 * 如果无法提取，返回 null，上层将展示完整 JSON。
 */
function extractAssistantContent(response: unknown): string | null {
  if (!response || typeof response !== "object" || Array.isArray(response)) return null;
  const resp = response as Record<string, unknown>;
  const choices = resp.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") return null;
  const message = (firstChoice as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return null;
  const content = (message as Record<string, unknown>).content;
  if (typeof content === "string") return content;
  return null;
}

export function LogDetail({ log, index }: LogDetailProps) {
  const [expanded, setExpanded] = useState(false);
  // rawView：切换响应显示为原始 JSON（默认为对话视图）
  const [rawView, setRawView] = useState(false);

  const handleToggleRawView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRawView((v) => !v);
  };

  // 提取请求消息（优先 messages 字段，回退 proxy_server_request.messages）
  const messages = extractMessages(log);

  // 解析响应
  const parsedResponse = parseField(log.response);
  const responseHasContent = hasContent(parsedResponse);

  // 从响应中提取助手回复内容（用于友好展示）
  const assistantText = responseHasContent ? extractAssistantContent(parsedResponse) : null;

  // 解析 proxy_server_request（用于原始请求体展示）
  const parsedProxyReq = parseField(log.proxy_server_request);
  const proxyReqHasContent = hasContent(parsedProxyReq);

  const storePromptsHint = (
    <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
      store_prompts_in_spend_logs: true
    </code>
  );

  return (
    <Card className="overflow-hidden">
      {/* 折叠头：点击展开/收起 */}
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
          <CardContent className="pt-4 space-y-5">
            {/* 基本元数据：调用类型、Token 用量、用户 */}
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

            {/* 请求消息 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">请求消息（Request Messages）</h4>
                </div>
              </div>
              {messages !== null ? (
                <ChatMessages messages={messages as { role: string; content: unknown }[]} />
              ) : (
                <div className="flex items-start gap-2 text-muted-foreground text-sm bg-muted/40 rounded-md p-3">
                  <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    请求消息未存储。请在 LiteLLM 配置中启用{" "}
                    {storePromptsHint}。
                  </span>
                </div>
              )}
            </div>

            {/* 响应内容 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">模型响应（Response）</h4>
                </div>
                {/* 当有结构化响应时，提供"对话视图 / 原始 JSON"切换 */}
                {responseHasContent && assistantText !== null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs gap-1"
                    onClick={handleToggleRawView}
                  >
                    <FileJson className="h-3 w-3" />
                    {rawView ? "对话视图" : "原始 JSON"}
                  </Button>
                )}
              </div>
              {responseHasContent ? (
                rawView || assistantText === null ? (
                  <JsonViewer data={parsedResponse} initialExpanded={true} />
                ) : (
                  /* 对话视图：以 assistant 气泡展示回复内容 */
                  <ChatMessages
                    messages={[{ role: "assistant", content: assistantText }]}
                  />
                )
              ) : (
                <div className="flex items-start gap-2 text-muted-foreground text-sm bg-muted/40 rounded-md p-3">
                  <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    响应未存储。请在 LiteLLM 配置中启用{" "}
                    {storePromptsHint}。
                  </span>
                </div>
              )}
            </div>

            {/* 原始请求体（proxy_server_request）：包含完整的模型参数等 */}
            {proxyReqHasContent && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileJson className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">原始请求体（Request Body）</h4>
                </div>
                <JsonViewer data={parsedProxyReq} initialExpanded={false} />
              </div>
            )}

            {/* 元数据（metadata） */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">元数据（Metadata）</h4>
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

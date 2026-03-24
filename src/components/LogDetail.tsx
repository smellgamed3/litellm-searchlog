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
  ChevronRight,
  Clock,
  Coins,
  Copy,
  DollarSign,
  Hash,
  MessageSquare,
  Bot,
  FileJson,
  CheckCheck,
  XCircle,
} from "lucide-react";
import type { SpendLog } from "@/types";

interface LogDetailProps {
  log: SpendLog;
  index: number;
}

/** 解析后的助手输出（含文本内容和可选的 tool_calls） */
interface AssistantOutput {
  content: string | null;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
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
 * 从 response 字段中提取助手输出（choices[0].message），
 * 包括文本内容和 tool_calls（函数调用）。
 */
function extractAssistantOutput(response: unknown): AssistantOutput | null {
  if (!response || typeof response !== "object" || Array.isArray(response)) return null;
  const resp = response as Record<string, unknown>;
  const choices = resp.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") return null;
  const message = (firstChoice as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return null;
  const msgObj = message as Record<string, unknown>;

  const content = typeof msgObj.content === "string" ? msgObj.content : null;

  // 提取 tool_calls（函数调用）
  let toolCalls: AssistantOutput["toolCalls"];
  if (Array.isArray(msgObj.tool_calls) && msgObj.tool_calls.length > 0) {
    toolCalls = msgObj.tool_calls.map((tc: unknown) => {
      const tcObj = tc as Record<string, unknown>;
      const fn =
        typeof tcObj.function === "object" && tcObj.function !== null
          ? (tcObj.function as Record<string, unknown>)
          : {};
      let args: Record<string, unknown> = {};
      if (typeof fn.arguments === "string") {
        try {
          args = JSON.parse(fn.arguments) as Record<string, unknown>;
        } catch {
          args = { raw: fn.arguments };
        }
      } else if (typeof fn.arguments === "object" && fn.arguments !== null) {
        args = fn.arguments as Record<string, unknown>;
      }
      return {
        id: typeof tcObj.id === "string" ? tcObj.id : "",
        name: typeof fn.name === "string" ? fn.name : "unknown",
        arguments: args,
      };
    });
  }

  if (content === null && !toolCalls?.length) return null;
  return { content, toolCalls };
}

/** 复制文本到剪贴板，返回 Promise<boolean> */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // 非安全上下文回退方案
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/** 面板折叠头：仿 Datadog 风格，含图标、标签、指标和操作按钮 */
function PanelHeader({
  icon,
  label,
  tokens,
  cost,
  isCollapsed,
  rawView,
  onToggleCollapse,
  onToggleRaw,
  onCopy,
  copied,
}: {
  icon: React.ReactNode;
  label: string;
  tokens?: number;
  cost?: number;
  isCollapsed: boolean;
  rawView: boolean;
  onToggleCollapse: () => void;
  onToggleRaw?: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={onToggleCollapse}
    >
      {/* 左侧：折叠箭头 + 图标 + 标签 + 指标 */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex-shrink-0 text-muted-foreground">
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </span>
        <span className="flex-shrink-0 text-muted-foreground">{icon}</span>
        <span className="font-medium text-sm">{label}</span>
        {tokens !== undefined && tokens > 0 && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Tokens: {tokens.toLocaleString()}
          </span>
        )}
        {cost !== undefined && cost > 0 && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            ${cost.toFixed(6)}
          </span>
        )}
      </div>
      {/* 右侧：切换视图 + 复制按钮 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {onToggleRaw && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onToggleRaw();
            }}
          >
            <FileJson className="h-3 w-3" />
            {rawView ? "对话视图" : "原始 JSON"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          title="复制到剪贴板"
        >
          {copied ? (
            <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function LogDetail({ log, index }: LogDetailProps) {
  const [expanded, setExpanded] = useState(false);
  // 输入/输出面板折叠状态
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  // 元数据/请求体折叠状态
  const [metaCollapsed, setMetaCollapsed] = useState(true);
  // 原始 JSON 视图切换（输入 / 输出各自独立）
  const [rawInputView, setRawInputView] = useState(false);
  const [rawOutputView, setRawOutputView] = useState(false);
  // 复制成功反馈
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  // 提取请求消息（优先 messages 字段，回退 proxy_server_request.messages）
  const messages = extractMessages(log);

  // 解析响应
  const parsedResponse = parseField(log.response);
  const responseHasContent = hasContent(parsedResponse);

  // 从响应中提取助手输出（含 tool_calls）
  const assistantOutput = responseHasContent ? extractAssistantOutput(parsedResponse) : null;
  const hasPrettyOutput = assistantOutput !== null;

  // 解析 proxy_server_request（用于原始请求体展示）
  const parsedProxyReq = parseField(log.proxy_server_request);
  const proxyReqHasContent = hasContent(parsedProxyReq);

  // 状态判断
  const isFailure = log.status === "failure";

  const storePromptsHint = (
    <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
      store_prompts_in_spend_logs: true
    </code>
  );

  /** 复制输入（请求消息 JSON） */
  const handleCopyInput = async () => {
    const text = messages
      ? JSON.stringify(messages, null, 2)
      : parsedProxyReq
        ? JSON.stringify(parsedProxyReq, null, 2)
        : "";
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedInput(true);
      setTimeout(() => setCopiedInput(false), 2000);
    }
  };

  /** 复制输出（响应 JSON） */
  const handleCopyOutput = async () => {
    if (!responseHasContent) return;
    const text = JSON.stringify(parsedResponse, null, 2);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    }
  };

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
              {/* 成功/失败状态指示 */}
              {isFailure ? (
                <span className="flex items-center gap-0.5 text-xs text-destructive">
                  <XCircle className="h-3 w-3" />
                  failure
                </span>
              ) : log.status === "success" ? (
                <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                  <CheckCheck className="h-3 w-3" />
                  success
                </span>
              ) : null}
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

            {/* ── 两栏并排：Input / Output ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* ── 输入面板 ── */}
              <div className="rounded-lg border overflow-hidden">
                <PanelHeader
                  icon={<MessageSquare className="h-3.5 w-3.5" />}
                  label="Input"
                  tokens={log.prompt_tokens}
                  isCollapsed={inputCollapsed}
                  rawView={rawInputView}
                  onToggleCollapse={() => setInputCollapsed((v) => !v)}
                  /* 仅当有原始请求体时提供 JSON 视图切换 */
                  onToggleRaw={proxyReqHasContent ? () => setRawInputView((v) => !v) : undefined}
                  onCopy={handleCopyInput}
                  copied={copiedInput}
                />
                {!inputCollapsed && (
                  <div className="p-3 max-h-[480px] overflow-auto">
                    {rawInputView && proxyReqHasContent ? (
                      <JsonViewer data={parsedProxyReq} initialExpanded={false} />
                    ) : messages !== null ? (
                      <ChatMessages messages={messages as Array<{ role: string; content: unknown; tool_calls?: unknown[] }>} />
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
                )}
              </div>

              {/* ── 输出面板 ── */}
              <div className="rounded-lg border overflow-hidden">
                <PanelHeader
                  icon={<Bot className="h-3.5 w-3.5" />}
                  label="Output"
                  tokens={log.completion_tokens}
                  cost={log.spend}
                  isCollapsed={outputCollapsed}
                  rawView={rawOutputView}
                  onToggleCollapse={() => setOutputCollapsed((v) => !v)}
                  /* 仅当有结构化响应时提供 JSON 视图切换 */
                  onToggleRaw={hasPrettyOutput ? () => setRawOutputView((v) => !v) : undefined}
                  onCopy={handleCopyOutput}
                  copied={copiedOutput}
                />
                {!outputCollapsed && (
                  <div className="p-3 max-h-[480px] overflow-auto">
                    {responseHasContent ? (
                      rawOutputView || !hasPrettyOutput ? (
                        <JsonViewer data={parsedResponse} initialExpanded={true} />
                      ) : (
                        <>
                          {/* 助手文本回复 */}
                          {assistantOutput?.content !== null && assistantOutput?.content !== undefined && (
                            <ChatMessages
                              messages={[{ role: "assistant", content: assistantOutput.content }]}
                            />
                          )}
                          {/* 函数调用（tool_calls） */}
                          {assistantOutput?.toolCalls && assistantOutput.toolCalls.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {assistantOutput.toolCalls.map((tc, i) => (
                                <div
                                  key={tc.id || i}
                                  className="rounded-md border border-purple-200 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-800 overflow-hidden"
                                >
                                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-purple-200 dark:border-purple-800">
                                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-sm uppercase tracking-wide text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/50">
                                      tool_call
                                    </span>
                                    <span className="font-mono text-xs font-medium">{tc.name}</span>
                                    {tc.id && (
                                      <span className="font-mono text-xs text-muted-foreground ml-auto truncate max-w-[120px]">
                                        {tc.id}
                                      </span>
                                    )}
                                  </div>
                                  <div className="p-2">
                                    <JsonViewer data={tc.arguments} initialExpanded={true} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
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
                )}
              </div>
            </div>

            {/* ── 元数据 + 请求体（合并为一个可折叠区域） ── */}
            {(log.metadata && Object.keys(log.metadata).length > 0) || proxyReqHasContent ? (
              <div className="rounded-lg border overflow-hidden">
                {/* 折叠头 */}
                <div
                  className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setMetaCollapsed((v) => !v)}
                >
                  <span className="text-muted-foreground">
                    {metaCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium text-sm">详细信息（Metadata &amp; Request Body）</span>
                </div>
                {!metaCollapsed && (
                  <div className="p-4 space-y-4">
                    {/* 元数据 */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                          Metadata
                        </p>
                        <JsonViewer data={log.metadata} initialExpanded={true} />
                      </div>
                    )}
                    {/* 原始请求体 */}
                    {proxyReqHasContent && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                          Request Body
                        </p>
                        <JsonViewer data={parsedProxyReq} initialExpanded={false} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </>
      )}
    </Card>
  );
}

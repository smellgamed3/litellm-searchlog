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
  MessageSquare,
  Bot,
  Wrench,
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
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(3)} s`;
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
 */
function extractMessages(log: SpendLog): unknown[] | null {
  const parsedMessages = parseField(log.messages);
  if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
    return parsedMessages;
  }

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
 * 从 proxy_server_request.tools 中提取工具名称列表。
 * 优先使用 OpenAI 格式 { type: "function", function: { name } }，
 * 当工具对象没有 function.name 时才回退到旧格式 { name }。
 */
function extractTools(proxyReq: unknown): string[] | null {
  if (!proxyReq || typeof proxyReq !== "object" || Array.isArray(proxyReq)) return null;
  const req = proxyReq as Record<string, unknown>;
  const tools = req.tools;
  if (!Array.isArray(tools) || tools.length === 0) return null;
  return tools.map((t: unknown) => {
    if (t && typeof t === "object") {
      const tool = t as Record<string, unknown>;
      if (tool.function && typeof tool.function === "object") {
        const fn = tool.function as Record<string, unknown>;
        if (typeof fn.name === "string") return fn.name;
      }
      if (typeof tool.name === "string") return tool.name;
    }
    return "unknown";
  });
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

/** 按 token 比例计算某部分费用（单位：美元） */
function calcTokenCost(totalSpend: number, tokens: number, totalTokens: number): number {
  if (totalTokens <= 0) return 0;
  return (totalSpend * tokens) / totalTokens;
}


async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
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

/** 通用可折叠区域头部 */
function SectionHeader({
  isCollapsed,
  onToggle,
  children,
  right,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-muted-foreground flex-shrink-0">
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </span>
        {children}
      </div>
      {right && (
        <div className="flex-shrink-0 text-sm" onClick={(e) => e.stopPropagation()}>
          {right}
        </div>
      )}
    </div>
  );
}

/** Input / Output 子面板头部 */
function SubPanelHeader({
  icon,
  label,
  tokens,
  cost,
  isCollapsed,
  onToggle,
  onCopy,
  copied,
}: {
  icon: React.ReactNode;
  label: string;
  tokens?: number;
  cost?: number;
  isCollapsed: boolean;
  onToggle: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 bg-muted/20 border-b cursor-pointer select-none hover:bg-muted/40 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-muted-foreground flex-shrink-0">
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </span>
        <span className="text-muted-foreground flex-shrink-0">{icon}</span>
        <span className="font-medium text-sm">{label}</span>
        {tokens !== undefined && tokens > 0 && (
          <span className="text-xs text-muted-foreground">
            Tokens: {tokens.toLocaleString()}
          </span>
        )}
        {cost !== undefined && (
          <span className="text-xs text-muted-foreground">
            Cost: ${cost.toFixed(6)}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0"
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
  );
}

export function LogDetail({ log, index }: LogDetailProps) {
  const [expanded, setExpanded] = useState(false);
  // 各可折叠区域状态
  const [costCollapsed, setCostCollapsed] = useState(true);
  const [toolsCollapsed, setToolsCollapsed] = useState(true);
  const [reqRespCollapsed, setReqRespCollapsed] = useState(false);
  const [metaCollapsed, setMetaCollapsed] = useState(true);
  // Input / Output 子面板折叠状态
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  // 共享的 Pretty / JSON 视图切换（作用于整个 Request & Response 区域）
  const [prettyView, setPrettyView] = useState(true);
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

  // 从 proxy_server_request 中提取工具列表
  const toolNames = extractTools(parsedProxyReq);
  const calledToolCount = assistantOutput?.toolCalls?.length ?? 0;

  // 状态判断
  const isFailure = log.status === "failure";

  // 获取 LiteLLM Overhead（优先 log 直接字段，回退 metadata）
  const litellmOverhead =
    log.litellm_overhead_time_ms ??
    (log.metadata?.litellm_overhead_time_ms as number | undefined);

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
          <CardContent className="pt-4 pb-4 space-y-3">
            {/* 统计摘要 */}
            {(log.prompt_tokens !== undefined || log.completion_tokens !== undefined) && (
              <p className="text-sm text-muted-foreground px-1">
                {log.prompt_tokens?.toLocaleString() ?? "—"} prompt tokens,{" "}
                {log.completion_tokens?.toLocaleString() ?? "—"} completion tokens
              </p>
            )}

            {/* 时间 / 缓存信息网格 */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm px-1">
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground min-w-[130px]">Duration:</span>
                <span className="font-medium">{formatDuration(log.startTime, log.endTime)}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground min-w-[130px]">Cache Hit:</span>
                {log.cache_hit !== undefined && log.cache_hit !== null ? (
                  <Badge
                    variant="outline"
                    className={
                      String(log.cache_hit).toLowerCase() === "true"
                        ? "text-emerald-600 border-emerald-300 bg-emerald-50"
                        : "text-muted-foreground"
                    }
                  >
                    {String(log.cache_hit)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              {litellmOverhead !== undefined && (
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground min-w-[130px]">LiteLLM Overhead:</span>
                  <span className="font-medium">{litellmOverhead.toFixed(2)} ms</span>
                </div>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground min-w-[130px]">Start Time:</span>
                <span className="font-mono text-xs">{log.startTime}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground min-w-[130px]">End Time:</span>
                <span className="font-mono text-xs">{log.endTime}</span>
              </div>
            </div>

            {/* Cost Breakdown（可折叠） */}
            <div className="rounded-lg border overflow-hidden">
              <SectionHeader
                isCollapsed={costCollapsed}
                onToggle={() => setCostCollapsed((v) => !v)}
                right={
                  <span className="font-medium">
                    Total: ${(log.spend ?? 0).toFixed(8)}
                  </span>
                }
              >
                <span className="font-semibold text-sm">Cost Breakdown</span>
              </SectionHeader>
              {!costCollapsed && (
                <div className="px-6 py-4 space-y-2 text-sm border-t">
                  {log.total_tokens > 0 ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Input ({log.prompt_tokens?.toLocaleString()} tokens)
                        </span>
                        <span>
                          ${calcTokenCost(log.spend, log.prompt_tokens ?? 0, log.total_tokens).toFixed(8)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Output ({log.completion_tokens?.toLocaleString()} tokens)
                        </span>
                        <span>
                          ${calcTokenCost(log.spend, log.completion_tokens ?? 0, log.total_tokens).toFixed(8)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Total</span>
                        <span>${(log.spend ?? 0).toFixed(8)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground italic">
                      Total: ${(log.spend ?? 0).toFixed(8)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Tools（可折叠，仅当 proxy_server_request 中有 tools 时显示） */}
            {toolNames && toolNames.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <SectionHeader
                  isCollapsed={toolsCollapsed}
                  onToggle={() => setToolsCollapsed((v) => !v)}
                >
                  <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold text-sm">Tools</span>
                  <span className="text-sm text-muted-foreground">
                    {toolNames.length} provided, {calledToolCount} called
                  </span>
                  <span className="text-muted-foreground mx-0.5">•</span>
                  <span
                    className="text-sm text-muted-foreground truncate max-w-[300px] sm:max-w-[500px]"
                    title={toolNames.join(", ")}
                  >
                    {toolNames.slice(0, 5).join(", ")}
                    {toolNames.length > 5 && "..."}
                  </span>
                </SectionHeader>
                {!toolsCollapsed && (
                  <div className="px-4 py-3 border-t">
                    <div className="flex flex-wrap gap-1.5">
                      {toolNames.map((name, i) => (
                        <Badge key={i} variant="secondary" className="font-mono text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Request & Response（可折叠，顶层含 Pretty / JSON 切换） */}
            <div className="rounded-lg border overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => setReqRespCollapsed((v) => !v)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground flex-shrink-0">
                    {reqRespCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="font-semibold text-sm">Request &amp; Response</span>
                </div>
                {/* Pretty / JSON 切换（阻止冒泡，不触发折叠） */}
                <div
                  className="flex items-center border rounded-md overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                      prettyView
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                    onClick={() => setPrettyView(true)}
                  >
                    Pretty
                  </button>
                  <button
                    className={`px-3 py-1 text-xs font-medium transition-colors border-l ${
                      !prettyView
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                    onClick={() => setPrettyView(false)}
                  >
                    JSON
                  </button>
                </div>
              </div>

              {!reqRespCollapsed && (
                <div className="border-t p-3 space-y-2">
                  {/* Input 子面板 */}
                  <div className="rounded-md border overflow-hidden">
                    <SubPanelHeader
                      icon={<MessageSquare className="h-3.5 w-3.5" />}
                      label="Input"
                      tokens={log.prompt_tokens}
                      cost={
                        log.total_tokens > 0
                          ? calcTokenCost(log.spend, log.prompt_tokens ?? 0, log.total_tokens)
                          : 0
                      }
                      isCollapsed={inputCollapsed}
                      onToggle={() => setInputCollapsed((v) => !v)}
                      onCopy={handleCopyInput}
                      copied={copiedInput}
                    />
                    {!inputCollapsed && (
                      <div className="p-3 max-h-[480px] overflow-auto">
                        {!prettyView && proxyReqHasContent ? (
                          <JsonViewer data={parsedProxyReq} initialExpanded={false} />
                        ) : messages !== null ? (
                          <ChatMessages
                            messages={
                              messages as Array<{
                                role: string;
                                content: unknown;
                                tool_calls?: unknown[];
                              }>
                            }
                          />
                        ) : proxyReqHasContent ? (
                          <JsonViewer data={parsedProxyReq} initialExpanded={false} />
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

                  {/* Output 子面板 */}
                  <div className="rounded-md border overflow-hidden">
                    <SubPanelHeader
                      icon={<Bot className="h-3.5 w-3.5" />}
                      label="Output"
                      tokens={log.completion_tokens}
                      cost={
                        log.total_tokens > 0
                          ? calcTokenCost(log.spend, log.completion_tokens ?? 0, log.total_tokens)
                          : 0
                      }
                      isCollapsed={outputCollapsed}
                      onToggle={() => setOutputCollapsed((v) => !v)}
                      onCopy={handleCopyOutput}
                      copied={copiedOutput}
                    />
                    {!outputCollapsed && (
                      <div className="p-3 max-h-[480px] overflow-auto">
                        {responseHasContent ? (
                          !prettyView || !hasPrettyOutput ? (
                            <JsonViewer data={parsedResponse} initialExpanded={true} />
                          ) : (
                            <>
                              {assistantOutput?.content !== null &&
                                assistantOutput?.content !== undefined && (
                                  <ChatMessages
                                    messages={[
                                      { role: "assistant", content: assistantOutput.content },
                                    ]}
                                  />
                                )}
                              {assistantOutput?.toolCalls &&
                                assistantOutput.toolCalls.length > 0 && (
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
                                          <span className="font-mono text-xs font-medium">
                                            {tc.name}
                                          </span>
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
              )}
            </div>

            {/* Metadata（独立可折叠区域） */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <SectionHeader
                  isCollapsed={metaCollapsed}
                  onToggle={() => setMetaCollapsed((v) => !v)}
                >
                  <span className="font-semibold text-sm">Metadata</span>
                </SectionHeader>
                {!metaCollapsed && (
                  <div className="px-4 py-3 border-t">
                    <JsonViewer data={log.metadata} initialExpanded={true} />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
}

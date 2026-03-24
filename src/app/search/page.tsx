"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LogDetail } from "@/components/LogDetail";
import {
  Search,
  Loader2,
  AlertCircle,
  Info,
  List,
  DollarSign,
  Coins,
} from "lucide-react";
import type { LiteLLMInstancePublic, SpendLog } from "@/types";

export default function SearchPage() {
  const [instances, setInstances] = useState<LiteLLMInstancePublic[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(true);

  // 查询表单状态
  const [instanceId, setInstanceId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userId, setUserId] = useState("");
  const [requestId, setRequestId] = useState("");

  // 搜索结果状态
  const [logs, setLogs] = useState<SpendLog[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const fetchInstances = useCallback(async () => {
    setInstancesLoading(true);
    try {
      const res = await fetch("/api/instances");
      const data: LiteLLMInstancePublic[] = await res.json();
      setInstances(data);
      if (data.length > 0) {
        setInstanceId((prev) => prev || data[0].id);
      }
    } catch {
      // ignore
    } finally {
      setInstancesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instanceId) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    const params = new URLSearchParams({ instanceId });
    if (conversationId.trim()) params.set("conversationId", conversationId.trim());
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (userId.trim()) params.set("userId", userId.trim());
    if (requestId.trim()) params.set("requestId", requestId.trim());

    try {
      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLogs(null);
    } finally {
      setLoading(false);
    }
  };

  const totalSpend = logs?.reduce((sum, l) => sum + (l.spend ?? 0), 0) ?? 0;
  const totalTokens = logs?.reduce((sum, l) => sum + (l.total_tokens ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Log Search</h1>
        <p className="text-muted-foreground mt-1">
          Search LiteLLM spend logs by conversation ID, date range, user, or request ID.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-primary" />
            Query Parameters
          </CardTitle>
          <CardDescription>
            Filter logs from your LiteLLM instance. Conversation ID filtering works via the{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">metadata.conversation_id</code>{" "}
            field.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instance">
                  LiteLLM Instance <span className="text-destructive">*</span>
                </Label>
                {instancesLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading instances…
                  </div>
                ) : instances.length === 0 ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Info className="h-4 w-4" />
                    No instances configured.{" "}
                    <a href="/instances" className="text-primary underline">
                      Add one
                    </a>
                    .
                  </div>
                ) : (
                  <Select
                    id="instance"
                    value={instanceId}
                    onChange={(e) => setInstanceId(e.target.value)}
                  >
                    {instances.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} — {inst.baseUrl}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="conversation-id">Conversation ID</Label>
                <Input
                  id="conversation-id"
                  placeholder="my-conv-123"
                  value={conversationId}
                  onChange={(e) => setConversationId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Filters by{" "}
                  <code className="font-mono">metadata.conversation_id</code> on returned logs
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-id">User ID</Label>
                <Input
                  id="user-id"
                  placeholder="user@example.com"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="request-id">Request ID</Label>
                <Input
                  id="request-id"
                  placeholder="chatcmpl-..."
                  value={requestId}
                  onChange={(e) => setRequestId(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading || !instanceId} className="w-full sm:w-auto">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {loading ? "Searching…" : "Search Logs"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 搜索结果区域 */}
      {searched && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card className="border-destructive">
              <CardContent className="flex items-center gap-2 pt-6 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </CardContent>
            </Card>
          ) : logs !== null && (
            <>
              {/* 汇总统计栏 */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{logs.length} result{logs.length !== 1 ? "s" : ""}</span>
                </div>
                {logs.length > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Coins className="h-4 w-4" />
                      <span>{totalTokens.toLocaleString()} total tokens</span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>${totalSpend.toFixed(6)} total spend</span>
                    </div>
                    {conversationId && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <Badge variant="secondary">
                          conversation: {conversationId}
                        </Badge>
                      </>
                    )}
                  </>
                )}
              </div>

              {logs.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No logs found</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Try adjusting your search parameters or widening the date range.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, idx) => (
                    <LogDetail key={log.request_id || idx} log={log} index={idx} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getInstanceById } from "@/lib/instanceStore";
import type { SpendLog } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const instanceId = searchParams.get("instanceId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const userId = searchParams.get("userId");
  const requestId = searchParams.get("requestId");
  const conversationId = searchParams.get("conversationId");

  if (!instanceId) {
    return NextResponse.json(
      { error: "instanceId is required" },
      { status: 400 }
    );
  }

  const instance = getInstanceById(instanceId);
  if (!instance) {
    return NextResponse.json(
      { error: "Instance not found" },
      { status: 404 }
    );
  }

  // 构建请求 LiteLLM /spend/logs 所需的查询参数
  const litellmParams = new URLSearchParams();
  if (requestId) litellmParams.set("request_id", requestId);
  if (startDate) litellmParams.set("start_date", startDate);
  if (endDate) litellmParams.set("end_date", endDate);
  if (userId) litellmParams.set("user_id", userId);

  const logsUrl = `${instance.baseUrl}/spend/logs?${litellmParams.toString()}`;

  try {
    const response = await fetch(logsUrl, {
      headers: {
        Authorization: `Bearer ${instance.adminKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `LiteLLM API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const logs: SpendLog[] = await response.json();

    // 在客户端按 metadata.conversation_id 进行二次过滤
    if (conversationId && conversationId.trim()) {
      const filtered = logs.filter((log) => {
        const meta = log.metadata;
        if (!meta) return false;
        return (
          meta.conversation_id === conversationId ||
          String(meta.conversation_id) === conversationId
        );
      });
      return NextResponse.json(filtered);
    }

    return NextResponse.json(logs);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch logs: ${message}` },
      { status: 500 }
    );
  }
}

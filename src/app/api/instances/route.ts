import { NextRequest, NextResponse } from "next/server";
import {
  getAllInstances,
  addInstance,
} from "@/lib/instanceStore";
import type { LiteLLMInstancePublic } from "@/types";

export async function GET() {
  const instances = getAllInstances();
  const publicInstances: LiteLLMInstancePublic[] = instances.map((inst) => ({
    id: inst.id,
    name: inst.name,
    baseUrl: inst.baseUrl,
    adminKeyMasked:
      inst.adminKey.length > 8
        ? inst.adminKey.slice(0, 4) + "****" + inst.adminKey.slice(-4)
        : "****",
    createdAt: inst.createdAt,
  }));
  return NextResponse.json(publicInstances);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, baseUrl, adminKey } = body as {
    name?: string;
    baseUrl?: string;
    adminKey?: string;
  };

  if (!name || !baseUrl || !adminKey) {
    return NextResponse.json(
      { error: "name, baseUrl, and adminKey are required" },
      { status: 400 }
    );
  }

  // 规范化 baseUrl（移除末尾斜杠）
  const normalizedUrl = baseUrl.replace(/\/$/, "");

  const instance = addInstance({
    name,
    baseUrl: normalizedUrl,
    adminKey,
  });

  const publicInstance: LiteLLMInstancePublic = {
    id: instance.id,
    name: instance.name,
    baseUrl: instance.baseUrl,
    adminKeyMasked:
      instance.adminKey.length > 8
        ? instance.adminKey.slice(0, 4) + "****" + instance.adminKey.slice(-4)
        : "****",
    createdAt: instance.createdAt,
  };

  return NextResponse.json(publicInstance, { status: 201 });
}

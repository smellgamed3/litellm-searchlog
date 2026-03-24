import { NextRequest, NextResponse } from "next/server";
import { updateInstance, deleteInstance, getInstanceById } from "@/lib/instanceStore";
import type { LiteLLMInstancePublic } from "@/types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, baseUrl, adminKey } = body as {
      name?: string;
      baseUrl?: string;
      adminKey?: string;
    };

    const updateData: { name?: string; baseUrl?: string; adminKey?: string } = {};
    if (name) updateData.name = name;
    if (baseUrl) updateData.baseUrl = baseUrl.replace(/\/$/, "");
    if (adminKey) updateData.adminKey = adminKey;

    const updated = updateInstance(id, updateData);
    if (!updated) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }

    const publicInstance: LiteLLMInstancePublic = {
      id: updated.id,
      name: updated.name,
      baseUrl: updated.baseUrl,
      adminKeyMasked:
        updated.adminKey.length > 8
          ? updated.adminKey.slice(0, 4) + "****" + updated.adminKey.slice(-4)
          : "****",
      createdAt: updated.createdAt,
    };
    return NextResponse.json(publicInstance);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to update instance: ${getErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteInstance(id);
    if (!deleted) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to delete instance: ${getErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const instance = getInstanceById(id);
  if (!instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 });
  }
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
  return NextResponse.json(publicInstance);
}

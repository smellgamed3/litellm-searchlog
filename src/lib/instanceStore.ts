import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { LiteLLMInstance } from "@/types";

const DATA_FILE = path.join(process.cwd(), "instances.json");

function readInstances(): LiteLLMInstance[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data) as LiteLLMInstance[];
  } catch {
    return [];
  }
}

function writeInstances(instances: LiteLLMInstance[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(instances, null, 2), "utf-8");
}

export function getAllInstances(): LiteLLMInstance[] {
  return readInstances();
}

export function getInstanceById(id: string): LiteLLMInstance | undefined {
  return readInstances().find((inst) => inst.id === id);
}

export function addInstance(
  data: Omit<LiteLLMInstance, "id" | "createdAt">
): LiteLLMInstance {
  const instances = readInstances();
  const newInstance: LiteLLMInstance = {
    id: uuidv4(),
    ...data,
    createdAt: new Date().toISOString(),
  };
  instances.push(newInstance);
  writeInstances(instances);
  return newInstance;
}

export function updateInstance(
  id: string,
  data: Partial<Omit<LiteLLMInstance, "id" | "createdAt">>
): LiteLLMInstance | null {
  const instances = readInstances();
  const index = instances.findIndex((inst) => inst.id === id);
  if (index === -1) return null;
  instances[index] = { ...instances[index], ...data };
  writeInstances(instances);
  return instances[index];
}

export function deleteInstance(id: string): boolean {
  const instances = readInstances();
  const filtered = instances.filter((inst) => inst.id !== id);
  if (filtered.length === instances.length) return false;
  writeInstances(filtered);
  return true;
}

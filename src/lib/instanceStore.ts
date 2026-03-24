import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { LiteLLMInstance } from "@/types";

// 实例配置持久化文件路径（存储在项目根目录，已加入 .gitignore）
const DATA_FILE = path.join(process.cwd(), "instances.json");

/** 从文件中读取所有实例配置，读取失败时返回空数组 */
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

/** 将实例配置列表序列化并写入文件 */
function writeInstances(instances: LiteLLMInstance[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(instances, null, 2), "utf-8");
}

/** 获取所有实例配置 */
export function getAllInstances(): LiteLLMInstance[] {
  return readInstances();
}

/** 根据 ID 获取单个实例配置，未找到时返回 undefined */
export function getInstanceById(id: string): LiteLLMInstance | undefined {
  return readInstances().find((inst) => inst.id === id);
}

/** 新增一个实例配置，自动生成 ID 和创建时间 */
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

/** 更新指定 ID 的实例配置，实例不存在时返回 null */
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

/** 删除指定 ID 的实例配置，删除成功返回 true，不存在返回 false */
export function deleteInstance(id: string): boolean {
  const instances = readInstances();
  const filtered = instances.filter((inst) => inst.id !== id);
  if (filtered.length === instances.length) return false;
  writeInstances(filtered);
  return true;
}

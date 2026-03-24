/** LiteLLM 实例的完整信息（含敏感字段，仅服务端使用） */
export interface LiteLLMInstance {
  /** 实例唯一标识符 */
  id: string;
  /** 实例名称 */
  name: string;
  /** LiteLLM Proxy 的 Base URL */
  baseUrl: string;
  /** 管理员 API 密钥（服务端存储，不对外暴露） */
  adminKey: string;
  /** 创建时间（ISO 8601 格式） */
  createdAt: string;
}

/** LiteLLM 实例的公开信息（脱敏后可返回给浏览器） */
export interface LiteLLMInstancePublic {
  /** 实例唯一标识符 */
  id: string;
  /** 实例名称 */
  name: string;
  /** LiteLLM Proxy 的 Base URL */
  baseUrl: string;
  /** 脱敏后的管理员 API 密钥（如 sk-****xxxx） */
  adminKeyMasked: string;
  /** 创建时间（ISO 8601 格式） */
  createdAt: string;
}

/** LiteLLM /spend/logs 接口返回的单条消费日志 */
export interface SpendLog {
  /** 请求唯一标识符 */
  request_id: string;
  /** 调用类型（如 completion、embedding 等） */
  call_type: string;
  /** 使用的模型名称 */
  model: string;
  /**
   * 请求消息内容。
   * 注意：LiteLLM 的普通 completion 调用中此字段通常为空对象 {}，
   * 实际请求消息存储在 proxy_server_request.messages 中。
   * 需在 LiteLLM 中启用 store_prompts_in_spend_logs: true。
   */
  messages?: unknown;
  /** 模型响应内容（需在 LiteLLM 中启用存储） */
  response?: unknown;
  /**
   * 完整的代理服务器请求体（含 messages、model、temperature 等）。
   * 当 messages 字段为空时，可从此字段的 messages 属性提取请求消息。
   * 需在 LiteLLM 中启用 store_prompts_in_spend_logs: true。
   */
  proxy_server_request?: unknown;
  /** 请求开始时间 */
  startTime: string;
  /** 请求结束时间 */
  endTime: string;
  /** 总 Token 用量 */
  total_tokens: number;
  /** 提示词 Token 用量 */
  prompt_tokens: number;
  /** 补全 Token 用量 */
  completion_tokens: number;
  /** 本次请求的费用（美元） */
  spend: number;
  /** 使用的 API 密钥（脱敏） */
  api_key: string;
  /** 发起请求的用户 */
  user: string;
  /** 请求元数据（可包含 conversation_id 等自定义字段） */
  metadata?: Record<string, unknown>;
  /** 是否命中缓存 */
  cache_hit?: string;
  /** 缓存键 */
  cache_key?: string;
  /** 请求状态（success / failure） */
  status?: string;
  /** 请求耗时（毫秒） */
  request_duration_ms?: number;
}

/** 日志查询参数 */
export interface LogQueryParams {
  /** 目标实例 ID */
  instanceId: string;
  /** 开始日期（YYYY-MM-DD） */
  startDate?: string;
  /** 结束日期（YYYY-MM-DD） */
  endDate?: string;
  /** 用户 ID 过滤 */
  userId?: string;
  /** 对话 ID 过滤（对应 metadata.conversation_id） */
  conversationId?: string;
  /** 请求 ID 过滤 */
  requestId?: string;
}

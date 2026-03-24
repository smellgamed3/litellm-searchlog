export interface LiteLLMInstance {
  id: string;
  name: string;
  baseUrl: string;
  adminKey: string;
  createdAt: string;
}

export interface LiteLLMInstancePublic {
  id: string;
  name: string;
  baseUrl: string;
  adminKeyMasked: string;
  createdAt: string;
}

export interface SpendLog {
  request_id: string;
  call_type: string;
  model: string;
  messages?: unknown;
  response?: unknown;
  startTime: string;
  endTime: string;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  spend: number;
  api_key: string;
  user: string;
  metadata?: Record<string, unknown>;
  cache_hit?: string;
  cache_key?: string;
}

export interface LogQueryParams {
  instanceId: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  conversationId?: string;
  requestId?: string;
}

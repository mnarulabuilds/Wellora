import { apiClient } from './client';

export interface AssistantReply {
  intent: string;
  response: string;
  entities: unknown[];
  suggestions?: string[];
}

export async function analyzeQuery(userId: string, text: string): Promise<AssistantReply> {
  const res = await apiClient.post('/analyze_query', { text, user_id: userId });
  return res.data;
}

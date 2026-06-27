export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIChatResponse {
  message: string
  suggestedCategory?: string
  suggestedAction?: string
}

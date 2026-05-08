export type Agent = {
  id: number
  name: string
  description: string
  domain?: string
  prompt_template?: string
  allowed_tools?: string[]
  status: string
}

export type ChatMessage = {
  role: string
  content: string
  created_at?: string
}

export type ChatSession = {
  id: number
  agent_id: number
  title?: string
  created_at: string
  message_count: number
}

export type ChatSessionDetail = {
  id: number
  agent_id: number
  title?: string
  created_at: string
  messages: ChatMessage[]
}

export type ChatSource = {
  filename: string
  snippet: string
  similarity?: number
}

export type ChatResponse = {
  agent_id: number
  session_id: number
  assistant_response: string
  messages: ChatMessage[]
  sources?: ChatSource[]
}

export type SampleBot = {
  name: string
  description: string
  domain: string
  tags: string[]
}

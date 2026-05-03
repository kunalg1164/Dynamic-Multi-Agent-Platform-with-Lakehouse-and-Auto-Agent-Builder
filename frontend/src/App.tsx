import { useEffect, useState, type FormEvent } from 'react'
import { ThemeProvider, createTheme, CssBaseline, Container, Box, Stack, Typography, Tabs, Tab, Chip, Alert, Paper } from '@mui/material'
import { API_BASE } from './api'
import AgentBuilder from './components/AgentBuilder'
import BotChat from './components/BotChat'
import AgentLibrary from './components/AgentLibrary'
import type { Agent, ChatMessage, ChatSession, ChatSessionDetail, SampleBot } from './types'
import './App.css'

const theme = createTheme({
  palette: {
    primary: {
      main: '#4e73df',
    },
    secondary: {
      main: '#22c55e',
    },
    background: {
      default: '#f3f7fc',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: ['Inter', 'system-ui', 'sans-serif'].join(','),
  },
})

const PREDEFINED_BOTS: SampleBot[] = [
  {
    name: 'Finance Advisor',
    description: 'Provide actionable budgeting, investing, and portfolio recommendations for individuals and small businesses.',
    domain: 'finance',
    tags: ['finance', 'investment', 'budget'],
  },
  {
    name: 'Travel Planner',
    description: 'Design memorable trips, budgets, and destination plans for leisure and business travel.',
    domain: 'travel',
    tags: ['travel', 'budget', 'destinations'],
  },
  {
    name: 'Market Analyst',
    description: 'Summarize market trends, compare stock sectors, and suggest research insights with finance context.',
    domain: 'finance',
    tags: ['market', 'stocks', 'analysis'],
  },
]

function App() {
  const [status, setStatus] = useState('loading')
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [domain, setDomain] = useState('')
  const [tags, setTags] = useState('')
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null)
  const [error, setError] = useState('')
  const [activeScreen, setActiveScreen] = useState(0)

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((response) => response.json())
      .then(() => setStatus('backend available'))
      .catch(() => setStatus('backend unavailable'))

    fetchAgents()
  }, [])

  useEffect(() => {
    if (selectedAgentId !== null) {
      fetchChatSessions(selectedAgentId)
    }
  }, [selectedAgentId])

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/agents`)
      const data = await response.json()
      setAgents(data)
      if (data.length > 0 && selectedAgentId === null) {
        setSelectedAgentId(data[0].id)
      }
    } catch {
      setError('Unable to fetch agents.')
    }
  }

  const createAgent = async ({
    name: agentName,
    description: agentDescription,
    domain: agentDomain,
    tags: agentTags,
  }: {
    name: string
    description: string
    domain?: string
    tags: string[]
  }) => {
    setError('')
    setCreatedAgent(null)

    try {
      const response = await fetch(`${API_BASE}/api/agents/builder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName,
          description: agentDescription,
          domain: agentDomain || undefined,
          tags: agentTags,
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const message = body?.detail || body?.message || 'API returned an error'
        throw new Error(message)
      }
      const data = await response.json()
      setCreatedAgent(data)
      await fetchAgents()
      setSelectedAgentId(data.id)
      setActiveScreen(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent creation failed. Check backend or API settings.')
    }
  }

  const handleBuildAgent = async (event: FormEvent) => {
    event.preventDefault()
    await createAgent({
      name,
      description,
      domain,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    })
  }

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!selectedAgentId) {
      setError('Select an agent first.')
      return
    }
    if (!chatMessage.trim()) {
      setError('Enter a message to send.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/agents/${selectedAgentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: chatMessage,
          session_title: currentSessionId ? undefined : `Chat with ${agents.find(a => a.id === selectedAgentId)?.name || 'Agent'}`
        }),
      })
      if (!response.ok) {
        throw new Error('Chat API returned an error')
      }
      const data = await response.json()
      setChatHistory(data.messages || [])
      setCurrentSessionId(data.session_id)
      setChatMessage('')
      
      // Refresh sessions list
      if (selectedAgentId) {
        fetchChatSessions(selectedAgentId)
      }
    } catch {
      setError('Unable to send chat message. Check backend or agent status.')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchChatSessions = async (agentId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/agents/${agentId}/sessions`)
      const data = await response.json()
      setChatSessions(data)
    } catch {
      // Silently fail for session loading
    }
  }

  const loadChatSession = async (sessionId: number) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`)
      const data: ChatSessionDetail = await response.json()
      setChatHistory(data.messages)
      setCurrentSessionId(sessionId)
      setSelectedAgentId(data.agent_id)
    } catch {
      setError('Unable to load chat session.')
    } finally {
      setIsLoading(false)
    }
  }

  const startNewChat = () => {
    setChatHistory([])
    setCurrentSessionId(null)
    setChatMessage('')
  }

  const handleAgentSelect = (agentId: number) => {
    setSelectedAgentId(agentId)
    setChatHistory([])
    setCurrentSessionId(null)
    setChatMessage('')
  }

  const selectSampleBot = (bot: SampleBot) => {
    setName(bot.name)
    setDescription(bot.description)
    setDomain(bot.domain)
    setTags(bot.tags.join(', '))
    setActiveScreen(0)
  }

  const quickCreateSample = async (bot: SampleBot) => {
    setName(bot.name)
    setDescription(bot.description)
    setDomain(bot.domain)
    setTags(bot.tags.join(', '))
    await createAgent({
      name: bot.name,
      description: bot.description,
      domain: bot.domain,
      tags: bot.tags,
    })
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 3 }}>
          <Box>
            <Typography variant="h3" fontWeight={800} gutterBottom>
              Smart Agent Studio
            </Typography>
            <Typography variant="body1" color="text.secondary" maxWidth={680}>
              Create intelligent finance and travel assistants, then chat with them using a dedicated studio interface.
            </Typography>
          </Box>
          <Chip label={`Backend ${status}`} color={status === 'backend available' ? 'primary' : 'default'} />
        </Box>

        <Paper elevation={3} sx={{ borderRadius: 4, mb: 4 }}>
          <Tabs value={activeScreen} onChange={(_, value) => setActiveScreen(value)} indicatorColor="primary" textColor="primary" variant="fullWidth">
            <Tab label="Bot Builder" />
            <Tab label="Bot Chat" />
            <Tab label="Agent Library" />
          </Tabs>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        {activeScreen === 0 && (
          <AgentBuilder
            name={name}
            description={description}
            domain={domain}
            tags={tags}
            agents={agents}
            createdAgent={createdAgent}
            sampleBots={PREDEFINED_BOTS}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onDomainChange={setDomain}
            onTagsChange={setTags}
            onCreate={handleBuildAgent}
            onLoadSample={selectSampleBot}
            onQuickBuildSample={quickCreateSample}
          />
        )}

        {activeScreen === 1 && (
          <BotChat
            agents={agents}
            selectedAgentId={selectedAgentId}
            chatMessage={chatMessage}
            chatHistory={chatHistory}
            chatSessions={chatSessions}
            currentSessionId={currentSessionId}
            isLoading={isLoading}
            onChatMessageChange={setChatMessage}
            onSelectAgent={handleAgentSelect}
            onSendMessage={handleSendMessage}
            onLoadSession={loadChatSession}
            onStartNewChat={startNewChat}
          />
        )}

        {activeScreen === 2 && (
          <AgentLibrary agents={agents} onChatWithAgent={(agentId) => { setSelectedAgentId(agentId); setActiveScreen(1) }} />
        )}
      </Container>
    </ThemeProvider>
  )
}

export default App

import { FormEvent, ChangeEvent, useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material'
import { Add, History, Chat } from '@mui/icons-material'
import type { Agent, ChatMessage, ChatSession } from '../types'

type BotChatProps = {
  agents: Agent[]
  selectedAgentId: number | null
  chatMessage: string
  chatHistory: ChatMessage[]
  chatSessions: ChatSession[]
  currentSessionId: number | null
  isLoading: boolean
  onChatMessageChange: (value: string) => void
  onSelectAgent: (agentId: number) => void
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void
  onLoadSession: (sessionId: number) => void
  onStartNewChat: () => void
}

export default function BotChat({
  agents,
  selectedAgentId,
  chatMessage,
  chatHistory,
  chatSessions,
  currentSessionId,
  isLoading,
  onChatMessageChange,
  onSelectAgent,
  onSendMessage,
  onLoadSession,
  onStartNewChat,
}: BotChatProps) {
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory])

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Paper elevation={4} sx={{ borderRadius: 4, p: 4, maxWidth: 900, mx: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Bot Chat
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Chat with your selected agent and load previous sessions.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<History />}
            onClick={() => setSessionDialogOpen(true)}
            disabled={!selectedAgentId}
          >
            Sessions
          </Button>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={onStartNewChat}
            disabled={!selectedAgentId}
          >
            New Chat
          </Button>
        </Stack>
      </Box>

      <Stack spacing={3}>
        <FormControl fullWidth>
          <InputLabel>Agent</InputLabel>
          <Select
            value={selectedAgentId ?? ''}
            label="Agent"
            onChange={(event: SelectChangeEvent<string>) => onSelectAgent(Number(event.target.value))}
          >
            <MenuItem value="" disabled>
              Choose an agent
            </MenuItem>
            {agents.map((agent) => (
              <MenuItem key={agent.id} value={String(agent.id)}>
                {agent.name} ({agent.domain || 'general'})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            p: 3,
            minHeight: 440,
            maxHeight: 520,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'background.paper',
          }}
        >
          <Box
            ref={chatContainerRef}
            sx={{
              flex: 1,
              overflowY: 'auto',
              mb: 2,
              pr: 1,
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'grey.400',
                borderRadius: '3px',
              },
            }}
          >
            <Stack spacing={2}>
              {chatHistory.length === 0 ? (
                <Box textAlign="center" py={6}>
                  <Chat sx={{ fontSize: 52, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    Your conversation will appear here once you send a message.
                  </Typography>
                </Box>
              ) : (
                chatHistory.map((message, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: message.role === 'assistant' ? 'flex-start' : 'flex-end',
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        bgcolor: message.role === 'assistant' ? 'grey.100' : 'primary.main',
                        color: message.role === 'assistant' ? 'text.primary' : 'white',
                        maxWidth: '78%',
                        wordBreak: 'break-word',
                        boxShadow: 1,
                      }}
                    >
                      <Typography variant="caption" sx={{ opacity: 0.7, mb: 0.5, display: 'block' }}>
                        {message.role === 'assistant' ? 'Assistant' : 'You'} • {formatTime(message.created_at)}
                      </Typography>
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{message.content}</Typography>
                    </Box>
                  </Box>
                ))
              )}
              {isLoading && (
                <Box display="flex" justifyContent="flex-start" mb={1}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'grey.100', maxWidth: '75%', boxShadow: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="text.secondary">
                        Assistant is typing...
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
              )}
            </Stack>
          </Box>
        </Paper>

        <Box component="form" onSubmit={onSendMessage} sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Type your message..."
            value={chatMessage}
            onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChatMessageChange(event.target.value)}
            multiline
            minRows={3}
            maxRows={5}
            fullWidth
            disabled={!selectedAgentId || isLoading}
            placeholder={selectedAgentId ? 'Ask your agent...' : 'Select an agent to start'}
          />
          <Button type="submit" variant="contained" size="large" sx={{ alignSelf: 'flex-end', borderRadius: 3 }} disabled={!selectedAgentId || !chatMessage.trim() || isLoading}>
            {isLoading ? 'Sending...' : 'Send Message'}
          </Button>
        </Box>
      </Stack>

      <Dialog open={sessionDialogOpen} onClose={() => setSessionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chat Sessions</DialogTitle>
        <DialogContent>
          {chatSessions.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No saved sessions yet for this agent.
            </Typography>
          ) : (
            <List>
              {chatSessions.map((session) => (
                <ListItem key={session.id} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      onLoadSession(session.id)
                      setSessionDialogOpen(false)
                    }}
                  >
                    <ListItemText
                      primary={session.title || `Session #${session.id}`}
                      secondary={`${session.message_count} messages • ${new Date(session.created_at).toLocaleDateString()}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSessionDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

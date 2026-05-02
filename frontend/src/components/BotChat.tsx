import { FormEvent, ChangeEvent, useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  console.log('BotChat component rendered with:', { agents: agents?.length, selectedAgentId, chatHistory: chatHistory?.length })
  
  // Temporary debug return
  return (
    <div style={{ padding: '20px', border: '2px solid blue', margin: '20px', backgroundColor: 'lightblue' }}>
      <h2>BotChat Debug</h2>
      <p>Component is rendering!</p>
      <p>Agents count: {agents?.length || 0}</p>
      <p>Selected Agent ID: {selectedAgentId || 'none'}</p>
      <p>Chat History: {chatHistory?.length || 0} messages</p>
      <p>Is Loading: {isLoading ? 'Yes' : 'No'}</p>
      <p>Current Session: {currentSessionId || 'none'}</p>
    </div>
  )

  const [showSessionDialog, setShowSessionDialog] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory])

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return (
    <Paper elevation={4} sx={{ borderRadius: 4, p: 4, maxWidth: 800, mx: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Bot Chat
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Interactive conversation with your AI agents
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<History />}
            onClick={() => setShowSessionDialog(true)}
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

        {currentSessionId && (
          <Chip
            label={`Session #${currentSessionId}`}
            color="primary"
            variant="outlined"
            size="small"
          />
        )}

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            p: 3,
            minHeight: 400,
            maxHeight: 500,
            backgroundColor: 'background.paper',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Box
            ref={chatContainerRef}
            sx={{
              flex: 1,
              overflowY: 'auto',
              mb: 2,
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'grey.100',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'grey.400',
                borderRadius: '3px',
                '&:hover': {
                  backgroundColor: 'grey.500',
                },
              },
            }}
          >
            <Stack spacing={2}>
              {chatHistory.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Chat sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    Start a conversation by selecting an agent and sending your first message.
                  </Typography>
                </Box>
              ) : (
                chatHistory.map((message, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: message.role === 'assistant' ? 'flex-start' : 'flex-end',
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        bgcolor: message.role === 'assistant' ? 'grey.100' : 'primary.main',
                        color: message.role === 'assistant' ? 'text.primary' : 'white',
                        maxWidth: '75%',
                        wordWrap: 'break-word',
                        boxShadow: 1,
                      }}
                    >
                      <Typography variant="caption" display="block" sx={{ opacity: 0.7, mb: 0.5 }}>
                        {message.role === 'assistant' ? 'Assistant' : 'You'} • {formatTime(message.created_at)}
                      </Typography>
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
              {isLoading && (
                <Box display="flex" justifyContent="flex-start" mb={1}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      bgcolor: 'grey.100',
                      maxWidth: '75%',
                      boxShadow: 1,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="text.secondary">
                        Thinking...
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
              )}
            </Stack>
          </Box>
        </Paper>

        <Divider />

        <Box component="form" onSubmit={onSendMessage} sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Type your message..."
            value={chatMessage}
            onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChatMessageChange(event.target.value)}
            multiline
            minRows={2}
            maxRows={4}
            fullWidth
            disabled={!selectedAgentId || isLoading}
            placeholder={selectedAgentId ? "Ask me anything..." : "Select an agent first"}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{ alignSelf: 'flex-end', borderRadius: 3, px: 4 }}
            disabled={!selectedAgentId || !chatMessage.trim() || isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : null}
          >
            {isLoading ? 'Sending...' : 'Send Message'}
          </Button>
        </Box>
      </Stack>

      {/* Session History Dialog */}
      <Dialog
        open={showSessionDialog}
        onClose={() => setShowSessionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Chat Sessions</DialogTitle>
        <DialogContent>
          {chatSessions.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No chat sessions found for this agent.
            </Typography>
          ) : (
            <List>
              {chatSessions.map((session) => (
                <ListItem key={session.id} disablePadding>
                  <ListItemButton onClick={() => { onLoadSession(session.id); setShowSessionDialog(false) }}>
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
          <Button onClick={() => setShowSessionDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

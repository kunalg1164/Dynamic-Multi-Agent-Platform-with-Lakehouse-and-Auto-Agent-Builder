import { FormEvent, ChangeEvent, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  Tooltip,
  Typography,
} from '@mui/material'
import { Add, History, Chat, UploadFile, Refresh } from '@mui/icons-material'
import { API_BASE } from '../api'
import type { Agent, ChatMessage, ChatSession, ChatSource } from '../types'

type DocumentInfo = {
  id: number
  filename: string
  content_type: string
  uploaded_at: string
  processing_status: string
}

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
  latestSources: ChatSource[]
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
  latestSources,
}: BotChatProps) {
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [deletingDocumentIds, setDeletingDocumentIds] = useState<number[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isRefreshingDocuments, setIsRefreshingDocuments] = useState(false)
  const [documentSearch, setDocumentSearch] = useState('')
  const [deleteDialogDocument, setDeleteDialogDocument] = useState<DocumentInfo | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory])

  const fetchDocuments = async (agentId: number) => {
    setIsRefreshingDocuments(true)
    try {
      const response = await fetch(`${API_BASE}/api/agents/${agentId}/documents`)
      const data = await response.json()
      setDocuments(data)
    } catch {
      setDocuments([])
    } finally {
      setIsRefreshingDocuments(false)
    }
  }

  useEffect(() => {
    if (!selectedAgentId) {
      setDocuments([])
      return
    }
    fetchDocuments(selectedAgentId)
  }, [selectedAgentId])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUploadError('')
    setUploadStatus('')
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedAgentId || !selectedFile) {
      setUploadError('Select an agent and a file to upload.')
      return
    }

    setUploadError('')
    setUploadStatus('Uploading...')
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`${API_BASE}/api/agents/${selectedAgentId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const message = body?.detail || body?.message || 'Upload failed'
        throw new Error(message)
      }

      setUploadStatus('Upload queued successfully.')
      setSelectedFile(null)
      await fetchDocuments(selectedAgentId)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed.')
      setUploadStatus('')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveDocument = async (documentId: number) => {
    if (!selectedAgentId) return

    setUploadError('')
    setUploadStatus('')
    setDeletingDocumentIds((prev) => [...prev, documentId])
    try {
      const response = await fetch(`${API_BASE}/api/agents/${selectedAgentId}/documents/${documentId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const message = body?.detail || body?.message || 'Failed to remove document'
        throw new Error(message)
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
      setUploadStatus('Document removed successfully.')
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to remove document.')
    } finally {
      setDeletingDocumentIds((prev) => prev.filter((id) => id !== documentId))
    }
  }

  const filteredDocuments = documents.filter((doc) => doc.filename.toLowerCase().includes(documentSearch.toLowerCase()))

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const parseMessageContent = (text: string) => {
    const nodes: any[] = []
    let lastIndex = 0
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, strongText, italicText] = match
      const start = match.index
      if (start > lastIndex) {
        nodes.push(text.slice(lastIndex, start))
      }
      if (strongText) {
        nodes.push(
          <Typography component="span" sx={{ fontWeight: 700 }} key={start}>
            {strongText}
          </Typography>
        )
      } else if (italicText) {
        nodes.push(
          <Typography component="span" sx={{ fontStyle: 'italic' }} key={start}>
            {italicText}
          </Typography>
        )
      }
      lastIndex = start + fullMatch.length
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex))
    }

    return nodes
  }

  const renderMessageContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      const trimmed = line.trim()
      if (/^[*-]\s+/.test(trimmed)) {
        return (
          <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.5 }}>
            <Typography component="span" sx={{ fontWeight: 700 }}>
              •
            </Typography>
            <Typography component="span">{parseMessageContent(trimmed.replace(/^[*-]\s+/, ''))}</Typography>
          </Box>
        )
      }

      return (
        <Box key={index} sx={{ mb: 0.5 }}>
          <Typography component="span">{parseMessageContent(line)}</Typography>
        </Box>
      )
    })
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
          <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
            <Chip size="small" label={`${chatSessions.length} sessions`} />
            <Chip size="small" label={`${documents.length} documents`} />
            {currentSessionId && <Chip size="small" color="primary" label={`Session #${currentSessionId}`} />}
          </Stack>
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

        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3, bgcolor: 'background.paper' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2} gap={1}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Upload documents for this agent
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add PDF, image, or text files to improve your agent responses.
              </Typography>
            </Box>
            <Tooltip title="Refresh document list">
              <span>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => selectedAgentId && fetchDocuments(selectedAgentId)}
                  disabled={!selectedAgentId || isRefreshingDocuments}
                >
                  {isRefreshingDocuments ? 'Refreshing...' : 'Refresh'}
                </Button>
              </span>
            </Tooltip>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} mb={2}>
            <Button component="label" variant="outlined" startIcon={<UploadFile />} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Select File
              <input hidden type="file" accept="application/pdf,image/*,text/*" onChange={handleFileChange} />
            </Button>
            <Typography sx={{ flex: 1 }}>{selectedFile ? selectedFile.name : 'No file selected'}</Typography>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!selectedAgentId || !selectedFile || isUploading}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </Stack>
          {uploadStatus && !uploadError && (
            <Alert severity="success" sx={{ mb: 1 }}>
              {uploadStatus}
            </Alert>
          )}
          {uploadError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {uploadError}
            </Alert>
          )}
          <TextField
            label="Search uploaded files"
            size="small"
            value={documentSearch}
            onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDocumentSearch(event.target.value)}
            fullWidth
            sx={{ my: 2 }}
          />
          <Typography variant="subtitle2" gutterBottom>
            Uploaded documents
          </Typography>
          {filteredDocuments.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {documents.length === 0 ? 'No documents uploaded yet for this agent.' : 'No documents match your search.'}
            </Typography>
          ) : (
            <List>
              {filteredDocuments.map((doc: DocumentInfo) => (
                <ListItem key={doc.id} disablePadding>
                  <Box
                    sx={{
                      width: '100%',
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                    }}
                  >
                    <ListItemText
                      primary={doc.filename}
                      secondary={`${doc.processing_status} • ${new Date(doc.uploaded_at).toLocaleString()}`}
                    />
                    <Button
                      color="error"
                      variant="outlined"
                      size="small"
                      onClick={() => setDeleteDialogDocument(doc)}
                      disabled={deletingDocumentIds.includes(doc.id)}
                    >
                      {deletingDocumentIds.includes(doc.id) ? 'Removing...' : 'Remove'}
                    </Button>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3, bgcolor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>
            Sources Used
          </Typography>
          {latestSources.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No sources yet. Send a message to see which uploaded document snippets were used.
            </Typography>
          ) : (
            <List>
              {latestSources.map((source, index) => (
                <ListItem key={`${source.filename}-${index}`} disablePadding>
                  <Box sx={{ width: '100%', py: 1 }}>
                    <ListItemText
                      primary={source.filename}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            {source.similarity !== undefined ? `Relevance: ${source.similarity.toFixed(3)}` : 'Relevance: fallback context'}
                          </Typography>
                          <Typography component="span" variant="body2">
                            {source.snippet}
                          </Typography>
                        </>
                      }
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

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
                      <Box sx={{ whiteSpace: 'pre-wrap' }}>{renderMessageContent(message.content)}</Box>
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

      <Dialog open={Boolean(deleteDialogDocument)} onClose={() => setDeleteDialogDocument(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove document</DialogTitle>
        <DialogContent>
          <Typography>
            Remove `{deleteDialogDocument?.filename}` from this agent?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogDocument(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (!deleteDialogDocument) return
              await handleRemoveDocument(deleteDialogDocument.id)
              setDeleteDialogDocument(null)
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import type { Agent } from '../types'

type AgentLibraryProps = {
  agents: Agent[]
  onChatWithAgent: (agentId: number) => void
}

export default function AgentLibrary({ agents, onChatWithAgent }: AgentLibraryProps) {
  return (
    <Paper elevation={4} sx={{ borderRadius: 4, p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Agent Library
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Browse saved agents and jump directly into a chat with any available assistant.
      </Typography>
      <Stack spacing={3}>
        {agents.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography>No agents found yet. Use the builder to create a new assistant.</Typography>
          </Paper>
        ) : (
          agents.map((agent) => (
            <Paper key={agent.id} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" spacing={2}>
                <Box>
                  <Typography variant="h6">{agent.name}</Typography>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    {agent.description}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label={agent.domain || 'general'} size="small" />
                    {agent.allowed_tools?.map((tool) => (
                      <Chip key={tool} label={tool} size="small" color="secondary" />
                    ))}
                  </Stack>
                </Box>
                <Button variant="contained" onClick={() => onChatWithAgent(agent.id)} sx={{ borderRadius: 3, whiteSpace: 'nowrap' }}>
                  Chat with this bot
                </Button>
              </Stack>
            </Paper>
          ))
        )}
      </Stack>
    </Paper>
  )
}

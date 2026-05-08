import { FormEvent, ChangeEvent } from 'react'
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { Agent, SampleBot } from '../types'

type AgentBuilderProps = {
  name: string
  description: string
  domain: string
  tags: string
  createdAgent: Agent | null
  sampleBots: SampleBot[]
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onDomainChange: (value: string) => void
  onTagsChange: (value: string) => void
  onCreate: (event: FormEvent<HTMLFormElement>) => void
  onLoadSample: (bot: SampleBot) => void
  onQuickBuildSample: (bot: SampleBot) => void
  isCreating?: boolean
}

export default function AgentBuilder({
  name,
  description,
  domain,
  tags,
  createdAgent,
  sampleBots,
  onNameChange,
  onDescriptionChange,
  onDomainChange,
  onTagsChange,
  onCreate,
  onLoadSample,
  onQuickBuildSample,
  isCreating = false,
}: AgentBuilderProps) {
  const parsePromptContent = (text: string) => {
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

  const renderPromptContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      const trimmed = line.trim()
      if (/^[*-]\s+/.test(trimmed)) {
        return (
          <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.5 }}>
            <Typography component="span" sx={{ fontWeight: 700 }}>
              •
            </Typography>
            <Typography component="span">{parsePromptContent(trimmed.replace(/^[*-]\s+/, ''))}</Typography>
          </Box>
        )
      }

      return (
        <Typography component="div" key={index} sx={{ mb: 0.5 }}>
          {parsePromptContent(line)}
        </Typography>
      )
    })
  }

  return (
    <Paper elevation={4} sx={{ borderRadius: 4, p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Bot Builder
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Build domain-aware assistants with a next-generation prompt generation workflow.
      </Typography>
      <Grid container spacing={4}>
        <Grid item xs={12} md={7}>
          <Box component="form" onSubmit={onCreate} noValidate>
            <Stack spacing={3}>
              <TextField
                label="Agent name"
                value={name}
                onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onNameChange(event.target.value)}
                fullWidth
                required
                helperText="Use a clear name users can quickly identify."
              />
              <TextField
                label="Description"
                value={description}
                onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onDescriptionChange(event.target.value)}
                fullWidth
                multiline
                minRows={4}
                required
                helperText="Describe what this agent should do and what outcome you expect."
              />
              <TextField
                label="Domain"
                value={domain}
                onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onDomainChange(event.target.value)}
                fullWidth
                helperText="Optional (example: finance, travel, ops)"
              />
              <TextField
                label="Tags (comma separated)"
                value={tags}
                onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onTagsChange(event.target.value)}
                fullWidth
                helperText="Tags improve discoverability in the library."
              />
              <Button type="submit" variant="contained" size="large" sx={{ borderRadius: 3 }} disabled={isCreating || !name.trim() || !description.trim()}>
                {isCreating ? 'Creating...' : 'Create Agent'}
              </Button>
            </Stack>
          </Box>
        </Grid>
        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" gutterBottom>
                Sample Bots
              </Typography>
              <Stack spacing={2}>
                {sampleBots.map((bot) => (
                  <Paper key={bot.name} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {bot.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {bot.description}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
                      {bot.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={() => onLoadSample(bot)} disabled={isCreating}>
                        Load
                      </Button>
                      <Button size="small" variant="contained" onClick={() => onQuickBuildSample(bot)} disabled={isCreating}>
                        Build
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>

            {createdAgent && (
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, backgroundColor: 'background.paper' }}>
                <Typography variant="h6" gutterBottom>
                  Created Agent
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <Typography component="span" sx={{ fontWeight: 700 }}>
                    Name:
                  </Typography>{' '}
                  {createdAgent.name}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <Typography component="span" sx={{ fontWeight: 700 }}>
                    Domain:
                  </Typography>{' '}
                  {createdAgent.domain || 'general'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <Typography component="span" sx={{ fontWeight: 700 }}>
                    Tools:
                  </Typography>{' '}
                  {createdAgent.allowed_tools?.join(', ') || 'Auto-selected'}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ whiteSpace: 'pre-wrap' }}>
                  {renderPromptContent(createdAgent.prompt_template || '')}
                </Box>
              </Paper>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  )
}

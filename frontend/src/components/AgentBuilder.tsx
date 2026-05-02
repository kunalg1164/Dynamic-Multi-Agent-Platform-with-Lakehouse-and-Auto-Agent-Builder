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
}: AgentBuilderProps) {
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
              />
              <TextField
                label="Description"
                value={description}
                onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onDescriptionChange(event.target.value)}
                fullWidth
                multiline
                minRows={4}
                required
              />
              <TextField
                label="Domain"
                value={domain}
                onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onDomainChange(event.target.value)}
                fullWidth
              />
              <TextField
                label="Tags (comma separated)"
                value={tags}
                onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onTagsChange(event.target.value)}
                fullWidth
              />
              <Button type="submit" variant="contained" size="large" sx={{ borderRadius: 3 }}>
                Create Agent
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
                      <Button size="small" variant="outlined" onClick={() => onLoadSample(bot)}>
                        Load
                      </Button>
                      <Button size="small" variant="contained" onClick={() => onQuickBuildSample(bot)}>
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
                  <strong>Name:</strong> {createdAgent.name}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Domain:</strong> {createdAgent.domain || 'general'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Tools:</strong> {createdAgent.allowed_tools?.join(', ') || 'Auto-selected'}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {createdAgent.prompt_template}
                </Typography>
              </Paper>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  )
}

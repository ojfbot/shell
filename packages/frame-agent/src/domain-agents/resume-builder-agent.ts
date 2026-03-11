import { BaseAgent, type AgentMessage } from '@ojfbot/agent-core'

export interface ResumeBuilderContext {
  instanceId?: string
  threadId?: string | null
}

export class ResumeBuilderDomainAgent extends BaseAgent {
  constructor(
    apiKey: string,
    private resumeBuilderApiUrl: string
  ) {
    super(apiKey, 'ResumeBuilderDomain')
  }

  protected getSystemPrompt(): string {
    return `You are the Resume Builder Domain Agent — the AI intelligence for resume and career development tasks within the Frame OS.

You have full knowledge of the Resume Builder workflow:
- Resume generation from bio data (work experience, education, skills, projects, certifications)
- Job listing analysis and match score calculation
- Resume tailoring: customizing a resume for a specific job description
- Skills gap analysis: identifying what skills to develop for a target role
- Learning path creation based on skills gaps
- Cover letter generation (professional, confident, concise)
- Interview preparation: questions, talking points, motivation analysis

## Data Access

You can reference data fetched from the Resume Builder API:
- Bios: resumes, work history, education, skills uploaded by the user
- Job listings: saved job descriptions and requirements
- Generated outputs: previously tailored resumes and analyses

When the user asks you to operate on their data (e.g., "tailor my resume for this job"),
acknowledge what data you have access to and confirm before proceeding.

## Response Format

Use structured markdown responses. For suggestions and next actions, append a metadata block:

<metadata>
{"suggestions": [
  {"label": "Generate Resume", "tab": "outputs", "action": "generate"},
  {"label": "Analyze Job", "tab": "jobs", "action": "analyze"},
  {"label": "Tailor Resume", "tab": "outputs", "action": "tailor"}
]}
</metadata>

Available tabs: bio, jobs, outputs, research, pipelines, toolbox, interactive.

Every response MUST include 2-4 badge suggestions in the metadata block.

## Tone

Professional, direct, and action-oriented. You are helping someone advance their career.`
  }

  async processMessage(
    message: string,
    history: AgentMessage[],
    _context: ResumeBuilderContext
  ): Promise<string> {
    this.setConversationHistory(history)
    return this.chat(message)
  }

  async streamMessage(
    message: string,
    history: AgentMessage[],
    _context: ResumeBuilderContext,
    onChunk: (text: string) => void
  ): Promise<string> {
    this.setConversationHistory(history)
    return this.streamChat(message, onChunk)
  }

  // Data delegates — call resume-builder-api CRUD (no LLM)
  async fetchBio(): Promise<unknown> {
    const res = await fetch(`${this.resumeBuilderApiUrl}/api/bios`)
    if (!res.ok) return null
    return res.json()
  }

  async fetchJobs(): Promise<unknown[]> {
    const res = await fetch(`${this.resumeBuilderApiUrl}/api/job`)
    if (!res.ok) return []
    const data = await res.json() as { data?: unknown[] }
    return data.data ?? []
  }

  getTools() {
    return [
      { name: 'generate_resume', description: 'Generate a formatted resume from bio data' },
      { name: 'analyze_job', description: 'Analyze a job listing and calculate match score' },
      { name: 'tailor_resume', description: 'Customize resume for a specific job description' },
      { name: 'skills_gap', description: 'Identify skills gaps and create a learning path' },
      { name: 'cover_letter', description: 'Generate a cover letter for a job application' },
      { name: 'interview_prep', description: 'Prepare interview questions and talking points' },
    ]
  }
}

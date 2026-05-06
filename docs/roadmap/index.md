# Roadmap

Where AIDLC Collaborative is today and where it is heading.

## Current status

| Phase | Status | Notes |
|-------|--------|-------|
| **Inception** | Working | Inception Agent, requirements, user stories, tasks, Q&A, collaborative editing |
| **Construction** | Working | Construction Agent, ECS workers, code file tracking, real-time status |
| **Review** | Working | Blind and full review agents, modify agent, manual comments, pass/fail |

## What has been built

### Inception
- Free-form project descriptions as input
- Inception Agent that generates requirements, user stories, and tasks
- Structured Q&A for clarifying ambiguities
- Real-time collaborative editing of all artifacts (Yjs CRDT)
- Graph-based traceability between requirements, stories, and tasks

### Construction
- Construction Agent running in ECS Fargate containers
- Code file artifact tracking (path, commit, summary)
- Follow-up questions during implementation
- Real-time agent status polling
- Automatic PR creation on completion

### Review
- Blind Review Agent (evaluates without file details)
- Full Review Agent (evaluates with complete context)
- Risk scores and structured comments
- Manual comments on both review types
- Modify Agent for iterative refinement
- Pass/fail decision workflow

### Infrastructure
- Multi-org, multi-project RBAC
- AWS Cognito authentication
- GitHub integration (OAuth, issue creation, status sync)
- Neptune graph database for traceability
- DynamoDB for operational state
- Terraform for full AWS deployment

## What is next

### Operate stage
- Post-deployment monitoring integration
- Error tracking and alerting
- Feedback loop from production incidents back to specs

### Agent improvements
- Agent cost tracking and budget limits
- Agent self-feedback after task completion
- Review feedback extraction into reusable rules

### Platform features
- Notification system
- Dashboard with project metrics
- Audit log for all actions
- Search across sprints and artifacts

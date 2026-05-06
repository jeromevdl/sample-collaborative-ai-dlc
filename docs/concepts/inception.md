# Inception

The Inception phase is where you define what to build. An AI agent helps break down a project description into structured requirements, user stories, and tasks.

## How it works

1. You create a sprint and write a project description in free-form text
2. You launch the Inception Agent
3. The agent analyzes the description and may ask clarifying questions
4. You answer the questions (structured multiple-choice or free text)
5. The agent generates requirements, user stories, and tasks
6. You review and refine the generated artifacts

## The Inception Agent

The Inception Agent reads your project description and produces:

- **Requirements** with titles, descriptions, and acceptance criteria
- **User stories** with titles, descriptions, and story points
- **Tasks** that map to concrete implementation work
- **General info** artifacts that capture context and decisions

The agent asks questions when the description is ambiguous or incomplete. These are structured questions with suggested answers, making it easy to provide direction without writing long explanations.

## Artifacts

### Requirements

A requirement defines a capability the system must have. Each requirement includes:

- A title and description
- Acceptance criteria that define when the requirement is met
- Links to the user stories and tasks that implement it

### User stories

A user story describes a feature from the user's perspective. Each story includes:

- A title and description
- Story points indicating relative complexity
- Links to the tasks that implement it

### Tasks

A task is a concrete unit of implementation work. Tasks are what the Construction Agent picks up and codes. Each task includes:

- A title and description
- Links back to the requirements and stories it fulfills

## Collaborative editing

All artifacts support real-time collaborative editing. Multiple team members can refine requirements, adjust story points, or rewrite task descriptions simultaneously. Changes sync instantly via Yjs CRDT.

## Moving to Construction

Once you are satisfied with the generated artifacts, you select a git branch and base branch, then launch the Construction Agent. The sprint phase transitions from Inception to Construction.

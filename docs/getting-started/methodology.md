# Methodology

AIDLC (AI Development Lifecycle) is the methodology framework that underpins this platform. It defines a structured approach to human-AI collaboration in software development, where each phase of the lifecycle has clear inputs, outputs, and decision points.

The core idea: instead of treating AI as a black-box code generator, AIDLC treats it as a collaborator that operates within a defined process. Humans set direction and evaluate results. Agents do the heavy lifting of planning and implementation. The methodology ensures nothing gets lost between intent and code.

AIDLC defines:

- **Phases** (Inception, Construction, Review) as the progression of work
- **Artifacts** (requirements, user stories, tasks, code files) as the structured outputs at each phase
- **Agents** (Inception, Construction, Review, Modify) as the AI participants with specific roles
- **Traceability** as the graph connecting every artifact back to the original intent

The open-source AIDLC methodology is maintained at [github.com/awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows).

## How it works in the platform

The AIDLC methodology is embedded in the platform through agent rules. Each agent (Inception, Construction, Review) has a set of rule files that define how it should operate. These rules enforce the methodology's structure without requiring manual configuration.

The rules live in `lambda/agents-ecs/aidlc-rules/` and cover:

- How the Inception Agent generates user stories and decomposes work
- How the Construction Agent approaches implementation
- How the Review Agent evaluates output

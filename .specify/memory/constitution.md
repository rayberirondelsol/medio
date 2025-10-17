<!--
  ============================================================================
  SYNC IMPACT REPORT
  ============================================================================

  Version Change: [TEMPLATE] → 1.0.0

  Change Type: INITIAL RATIFICATION

  Added Sections:
  - Core Principles (6 principles defined)
    1. Child Safety First
    2. Context-Driven Architecture
    3. Test-First Development (NON-NEGOTIABLE)
    4. Error Resilience
    5. Docker-First Development
    6. NFC Security & Session Management
  - Technology Constraints
  - Development Workflow
  - Governance

  Modified Principles: N/A (initial version)

  Removed Sections: N/A (initial version)

  Templates Requiring Updates:
  ✅ .specify/templates/plan-template.md - Updated Constitution Check gates
  ✅ .specify/templates/tasks-template.md - Updated to enforce TDD requirement
  ⚠ .specify/templates/spec-template.md - No updates needed (generic enough)
  ⚠ .specify/templates/checklist-template.md - Review recommended
  ⚠ .specify/templates/agent-file-template.md - Review recommended

  Follow-up TODOs:
  - Review checklist template for child safety validation steps
  - Consider adding NFC security checklist items
  - Update agent guidance with Docker workflow commands

  ============================================================================
-->

# Medio Constitution

## Core Principles

### I. Child Safety First

All features MUST prioritize child safety and data privacy above all other concerns.

**Requirements**:
- Age-appropriate content filtering MUST be enforced at the API level
- NFC authentication MUST validate chip ownership before granting access
- Automatic session timeouts MUST be implemented (configurable per profile)
- Parental controls MUST gate access to administrative functions
- NO direct data collection from children without explicit parental consent
- All child-related data MUST be encrypted at rest and in transit

**Rationale**: Medio's core mission is providing safe entertainment for children.
This principle supersedes performance, convenience, or feature velocity. When in
doubt, err on the side of restricting access.

### II. Context-Driven Architecture

React Context API is the ONLY permitted state management solution for this project.

**Requirements**:
- NO Redux, Zustand, MobX, or any external state management libraries
- Context providers MUST be layered: Auth → Theme → Loading
- Each context MUST have clear separation of concerns (single responsibility)
- Context consumers MUST use custom hooks (e.g., `useAuth()`, `useTheme()`)
- Global state MUST be minimized; prefer component-local state where possible

**Rationale**: Context API is sufficient for Medio's scale. Additional abstractions
add complexity without proportional benefit. This decision keeps the codebase
accessible to developers familiar with core React patterns.

### III. Test-First Development (NON-NEGOTIABLE)

Test-Driven Development (TDD) is mandatory for all feature work.

**Requirements**:
- Tests MUST be written before implementation code
- Tests MUST be reviewed and approved by user/reviewer before implementation begins
- Tests MUST fail initially (red phase)
- Implementation makes tests pass (green phase)
- Refactoring follows (refactor phase)
- Minimum 80% code coverage enforced via `npm run test:coverage`
- Unit tests (Jest + React Testing Library) required for all components and utilities
- E2E tests (Playwright) required for critical user journeys

**Rationale**: TDD ensures features are testable by design, reduces bugs, and
provides executable documentation. The strict enforcement prevents technical debt
accumulation.

### IV. Error Resilience

The application MUST handle errors gracefully and never crash the user experience.

**Requirements**:
- Error boundaries MUST wrap all route components
- All axios requests MUST use AbortController for proper cancellation
- Cleanup logic MUST be implemented in useEffect return functions
- API unavailability MUST result in friendly messages, not blank screens
- Sentry error tracking MUST be configured for production monitoring
- Failed requests MUST NOT leave the UI in inconsistent states

**Rationale**: Medio runs in environments where backend connectivity may be
unreliable (local networks, mobile hotspots). Graceful degradation maintains
trust with parents and prevents frustrated children.

### V. Docker-First Development

All development MUST occur within Docker containers for environment consistency.

**Requirements**:
- Local setup MUST use Makefile commands: `make dev`, `make test`, `make prod`
- NO "works on my machine" issues; Docker ensures parity
- Development, staging, and production environments MUST use identical base images
- All dependencies MUST be declared in package.json and Dockerfile
- Port mappings and volume mounts MUST be documented in docker-compose.yml
- CI/CD pipelines MUST use the same Docker images for build and test

**Rationale**: Docker eliminates environment drift and ensures all developers,
regardless of host OS, have identical development experiences. This principle
reduces onboarding time and debugging complexity.

### VI. NFC Security & Session Management

NFC chip interactions and watch sessions require rigorous security and reliability.

**Requirements**:
- NFC chip UIDs MUST be validated server-side; never trust client data
- Session initialization MUST return a server-generated session_id
- Watch sessions MUST use heartbeat mechanism with intervals between 30-120 seconds
- Heartbeat failures MUST implement exponential backoff (1.5x multiplier, max 2 min)
- Session cleanup on component unmount MUST use `navigator.sendBeacon` for reliability
- Daily watch limits MUST be enforced server-side with tamper-proof tracking

**Rationale**: Children are creative and may attempt to circumvent time limits.
Server-side validation and robust session tracking prevent exploits while ensuring
accurate usage reporting for parents.

## Technology Constraints

The following technology choices are fixed and MUST NOT be changed without
constitutional amendment:

**Core Stack**:
- React 19.1.1 with TypeScript 4.9.5
- Create React App (react-scripts 5.0.1)
- NO ejecting from CRA without explicit approval and migration plan

**State Management**:
- React Context API only (see Principle II)

**Authentication**:
- httpOnly cookies ONLY for JWT tokens
- NO localStorage or sessionStorage for sensitive tokens
- Cookies MUST have Secure and SameSite=Strict flags in production

**Testing**:
- Jest with React Testing Library for unit/integration tests
- Playwright for end-to-end tests
- NO alternative test frameworks without justification

**Monitoring**:
- Sentry for error tracking and performance monitoring

**Code Quality**:
- ESLint with react-app configuration
- TypeScript strict mode enabled
- Pre-commit hooks MUST enforce linting and type checking

## Development Workflow

All code changes MUST pass these gates before merge:

**Pre-Commit Gates**:
1. `npm run lint` - ESLint passes with no errors
2. `npm run test:coverage` - Tests pass with ≥80% coverage
3. `npm run build` - Production build succeeds
4. TypeScript compilation succeeds with strict mode

**Pull Request Gates**:
1. All pre-commit gates pass
2. E2E tests pass for critical paths:
   - Kids Mode NFC scanning and video playback
   - Session management and timeout enforcement
   - Profile creation and authentication
3. Docker containers build and start successfully
4. Code review from at least one team member
5. Constitution compliance verified (principles not violated)

**Critical Path E2E Tests** (Required):
- NFC chip scanning initiates video playback
- Watch time limits enforce correctly
- Session cleanup occurs on exit/timeout
- Parental controls gate administrative access

**Constitution Supersedes**:
- When conflicts arise between this constitution and other documentation,
  the constitution wins.
- When complexity is proposed that violates principles, justification MUST be
  documented in the implementation plan's "Complexity Tracking" section.
- Simpler alternatives MUST be exhausted before accepting complexity.

## Governance

**Amendment Process**:
1. Proposed changes MUST be documented with rationale
2. Team consensus required for MAJOR version changes
3. Version bump MUST follow semantic versioning:
   - **MAJOR**: Principle removed or fundamentally redefined
   - **MINOR**: New principle added or significant expansion
   - **PATCH**: Clarifications, wording improvements, typo fixes
4. Migration plan MUST accompany breaking changes

**Compliance Review**:
- All PRs MUST be reviewed for constitutional compliance
- Feature specifications MUST cite relevant principles
- Implementation plans MUST include "Constitution Check" section
- Violations MUST be justified in "Complexity Tracking" tables

**Version History**:
- This is the initial ratification
- All amendments MUST be tracked in this section with date and rationale

**Runtime Guidance**:
Use the project README.md and CLAUDE.md for day-to-day development guidance.
This constitution focuses on governing principles and non-negotiable constraints.

---

**Version**: 1.0.0 | **Ratified**: 2025-10-17 | **Last Amended**: 2025-10-17

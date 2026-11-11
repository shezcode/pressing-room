---
status: accepted
---

# The public repository is a filtered export of a private working repository

The shop is built by AI coding agents. They need their instructions, skills and tickets committed (`AGENTS.md`, `CLAUDE.md`, `.claude/`, `.agents/`, `skills-lock.json`, `docs/agents/`, `.scratch/`), because each agent works in its own git worktree created from `main`. The published portfolio must not contain any of those files, or the history of the internal starter the frontend began from. So the private repository stays the only place work happens. The public GitHub repository is produced from it by a repeatable `git filter-repo` export that strips those paths, and its output is reviewed before every push.

## Considered Options

- **Make the public repository the working repository after a single cutover.** Rejected because the agents could no longer work on it without publishing their files.
- **Keep the agent files untracked in the public repository.** Rejected because worktrees only contain tracked files, so every agent would start without its instructions or tickets.

## Consequences

- Never push directly to the public repository. Commits made there are overwritten by the next export.
- CI and deployment run only on the public repository, so a change goes live only after it has been exported.
- Commit hashes differ between the two repositories.

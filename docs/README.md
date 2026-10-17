# Slingshot: Event Horizon — Build Pack

A spec bundle for building the game with Google's Antigravity CLI (or any agentic coding tool that reads AGENTS.md).

## Folder layout
```
slingshot-spec/
├── AGENTS.md                  <- standing rules the agent reads automatically
├── README.md                  <- you are here
├── docs/
│   ├── PRD.md                 <- what we are building and why
│   ├── architecture.md        <- how it is built
│   ├── PHYSICS.md             <- every equation and constant
│   ├── security.md            <- threat model and guardrails
│   ├── DESIGN.md              <- look, sound, feel, accessibility
│   ├── TASKS.md               <- milestones M0 to M12 with acceptance tests
│   ├── TESTING.md             <- tests and QA checklists
│   ├── prompt.md              <- copy-paste prompts, one per milestone
│   ├── PITCH.md               <- judge script, demo flow, Q&A
│   └── DECISIONS.md           <- decision log the agent keeps updating
└── .agents/workflows/         <- slash-command workflows (/verify, /next-milestone)
```

## Quick start (about 10 minutes)
1. Install Node.js (current LTS) from nodejs.org. Check with `node -v`.
2. Install the Antigravity CLI by following Google's official instructions at antigravity.google, then confirm it runs with its `--help` flag.
3. Copy this whole folder to your computer, open a terminal inside it, and run `git init`.
4. Start the CLI in this folder. It reads AGENTS.md automatically.
5. Paste the **Kickoff prompt** from `docs/prompt.md`, then work through the milestone prompts one at a time.
6. After each milestone: open the game, play it for a minute, then tell the agent "continue".

## Notes
- AGENTS.md is kept under Antigravity's 12,000-character limit per rules file. The `@docs/...` lines pull in the other files.
- If your Antigravity version expects rules under `.agents/rules/`, ask the agent: "Move AGENTS.md rules into .agents/rules/ and keep AGENTS.md as a short pointer."
- If your version expects a different workflow file format, ask the agent to convert the two files in `.agents/workflows/`.
- Never put API keys in this project. The game needs none.

## MVP cut line
If time runs short, ship **M0 to M6, a minimal M9, and M12**. Everything else is bonus "wow" that you can show as a roadmap.

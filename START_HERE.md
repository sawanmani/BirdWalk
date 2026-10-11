# BirdWalk Vibe-Coding Kit --- Start Here

1.  Open your project folder in your preferred coding agent (Cursor,
    Claude Code, Codex, Copilot, etc.).
2.  Put these files in the repository root:
    -   `BUILD_PROMPTS.md`
    -   `CONTEXT.md`
    -   `ALIGNMENT.md`
    -   `SKILLS.md`
3.  Give the agent this exact first prompt:

> Read `CONTEXT.md`, `ALIGNMENT.md`, `SKILLS.md`, and `BUILD_PROMPTS.md`
> completely. Follow the locked stack and non-negotiable truth rules.
> Start with Phase 0, inspect the existing repository, create
> `IMPLEMENTATION_STATUS.md`, and then execute the phases in order. Do
> not stop after producing a plan: implement, run tests, inspect
> failures, and fix them. Do not ask me to choose frameworks already
> specified in the docs. Do not fabricate model results, licences, field
> tests, accuracy, offline behaviour, or deployment. If the BirdNET
> model setup fails, diagnose and try a documented compatible route;
> never substitute a fake classifier. Keep the UI premium, responsive,
> accessible, and nature-themed. After each phase, report the changed
> files, commands run, actual results, and blockers. Prioritize real
> end-to-end inference and honest evidence over extra features.

4.  If your agent supports project rules, keep `ALIGNMENT.md` and
    `SKILLS.md` in its persistent project instructions.
5.  Use `BUILD_PROMPTS.md` phase by phase if the agent loses context or
    tries to skip verification gates.
6.  Online sample audio is for development smoke tests. Do not call it a
    personal field test and do not publish an accuracy percentage unless
    the methodology justifies it.
7.  Check every individual audio/model licence and preserve attribution.

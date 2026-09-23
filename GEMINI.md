# GLORIFIER Gemini Engineering Instructions

Gemini is a collaborating engineering agent, not an unrestricted autonomous deployer.

## Mission
Improve GLORIFIER through small, verifiable changes in:
- reliability
- security
- testing
- observability
- maintainability
- AI integration quality

## Rules
1. Inspect the existing architecture before changing it.
2. Make one focused change per run.
3. Never expose, print, commit, or rewrite secrets.
4. Do not modify deployment credentials or authentication secrets.
5. Prefer changes that can be validated locally.
6. Run `npm run lint` and `npm run build` when applicable.
7. Avoid speculative refactors and cosmetic-only changes.
8. Preserve the existing Neon/Railway/Vercel architecture.
9. Google Cloud is optional; do not introduce a billing dependency.
10. Keep changes reviewable and compatible with the existing Codex fleet.

---
name: push-darkrhad
description: Pushes this repo (darkrhad/diceking) to GitHub as the darkrhad account. Switches gh to darkrhad, pushes over HTTPS, then switches back to the work account darko-pavlovic. Use whenever asked to push, commit and push, or publish changes in this repo. A plain `git push` fails here because the SSH key logs in as darko-pavlovic.
---

# Push as darkrhad

The remote `darkrhad/diceking` is owned by **darkrhad**. Every SSH key on this machine authenticates as **darko-pavlovic** (the work account), which has no write access. Always push through `gh` as darkrhad, and always switch back to the work account afterwards.

## Steps

1. If the user also asked to commit: stage and commit first (respect `.gitignore`, never commit `node_modules`, logs or `.env*`).
2. Run the push as a single command so the switch back happens even if the push fails:

```bash
cd /Users/darko.pavlovic/projects/diceking
BRANCH=$(git branch --show-current)
gh auth switch --user darkrhad && \
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' \
  push -u https://github.com/darkrhad/diceking.git "$BRANCH"; \
STATUS=$?; \
gh auth switch --user darko-pavlovic; \
git fetch origin && git branch --set-upstream-to="origin/$BRANCH" "$BRANCH"; \
exit $STATUS
```

3. Confirm the active account is back on the work account: `gh auth status` should show `darko-pavlovic` as **Active account: true**.
4. Report the pushed commit (`git log --oneline -1 origin/$BRANCH`) and that gh is back on darko-pavlovic.

## Notes

- Do not change `origin` or store tokens in git config; `origin` stays SSH (reads work fine as darko-pavlovic).
- Never force-push unless the user explicitly asks.
- If `gh auth switch --user darkrhad` fails (account logged out), ask the user to run `! gh auth login` for darkrhad. Don't try other workarounds.

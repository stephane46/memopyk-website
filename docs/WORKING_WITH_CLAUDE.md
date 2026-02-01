# MEMOPYK: Working with Claude

Quick reference for reporting issues and requesting changes.

---

## Roles & Ownership

| Who | Owns | Responsibility |
|-----|------|----------------|
| **Stéphane** | Decisions | Makes decisions, approves plans, tests in browser |
| **Claude Chat** | Documentation (*.md) | Writes/updates all markdown files directly, planning, verification |
| **Claude Code** | Code + Commands | Executes code changes, runs terminal commands (npm, git, curl, etc.), reports back |

**Key rules:**
- **Claude Chat writes documentation directly** — no prompts needed for .md files
- **Claude Code writes code** — Claude Chat creates prompts for code changes only
- Claude Chat verifies Claude Code's work by reading files
- Claude Chat MUST put Claude Code prompts in a single code block (for easy copy-paste)

---

## Starting a Session

Always start by giving Claude Chat context:

```
MEMOPYK session.

Please read:
1. CLAUDE.md (current status)
2. docs/WORKING_WITH_CLAUDE.md (workflow)

[Then state what you want to work on]
```

After a long break (weeks/months), add:

```
It's been a while. Please also check:
- git log --oneline -10 (recent changes)
- docs/README.md (documentation index)
```

---

## The Workflow

**For Documentation (.md files):**
1. YOU         → Describe what docs need updating
2. CLAUDE CHAT → Writes/updates the .md files directly
3. CLAUDE CODE → Commits and pushes to `staging` (default)

**For Code Changes:**
1. YOU         → Describe request to Claude Chat
2. CLAUDE CHAT → Reads files, asks questions, creates Claude Code prompt
3. YOU         → Paste prompt to Claude Code
4. CLAUDE CODE → Executes, reports back
5. CLAUDE CHAT → Verifies by reading files
6. YOU         → Test in browser, confirm done
7. CLAUDE CODE → Commits and pushes to `staging` (default)

⚠️ **Deploy where?** Always push to `staging` first. Only push to `main` when Stéphane explicitly says to promote. If unclear, ask: "Deploy to staging or main?"

---

## Deployment

Two branches, two environments:

| Branch | Deploys To | URL |
|--------|------------|-----|
| `staging` | Staging site | https://memopyk.memopyk.com |
| `main` | Live site | https://memopyk.com |

**Daily workflow:**

```bash
# 1. Work on staging branch
git checkout staging
# ... make changes ...
git add . && git commit -m "feat: description"
git push origin staging
# → Auto-deploys to memopyk.memopyk.com (~1-2 min)

# 2. Test on staging site

# 3. When ready for main, merge staging to main
git checkout main
git merge staging
git push origin main
# → Auto-deploys to memopyk.com (~1-2 min)

# 4. Return to staging for next work
git checkout staging
```

⚠️ **Important Rules:**
- **Always work on `staging` branch** — never commit directly to `main`
- **Always test on staging first** — visit memopyk.memopyk.com before promoting
- **To promote to main:** merge staging → main (don't commit directly to main)
- **If unsure which branch you're on:** run `git branch` (asterisk shows current branch)

To verify: Check Coolify Deployments tab or visit the appropriate URL

---

## Templates

Use these when reporting issues or requesting changes to Stéphane or Claude Chat.

### Bug Report

```
BUG: [Short description]

Where: [Page URL or admin section]
What happens:
Expected:
Screenshot: [if visual]
```

### Feature Request

```
FEATURE: [Short description]

Goal:
Where: [Which page/section]
Details:
Priority: [Nice-to-have / Important / Critical]
```

### UI/Design Change

```
UI CHANGE: [Component/page]

Current:
Desired:
Reference: [screenshot or example]
```

### New Admin Feature

```
ADMIN FEATURE: [Short description]

Goal:
Location: [Which admin section]
User flow: [Step by step]
Data needed: [Database tables involved]
```

### Database/Schema Change

```
SCHEMA CHANGE: [Table or field]

Schema file: shared/schema.ts
Current:
Desired:
Reason:
```

---

## Tips

- One request at a time — Easier to track and verify
- Include file paths when you know them
- Screenshots for visual issues
- Always test Claude Code's changes before confirming done

---

## End of Session

Claude Chat updates CLAUDE.md "Recent Work" section with what was accomplished.

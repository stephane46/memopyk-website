# MEMOPYK: Working with Claude

Quick reference for reporting issues and requesting changes.

---

## Roles

| Who | Responsibility |
|-----|----------------|
| **Stéphane** | Makes decisions, approves plans, tests results in browser |
| **Claude Chat** | Planning, documentation, verification. Owns all .md files. Has full project context and memory. |
| **Claude Code** | Executes code changes and commands, reports findings and what was done |

**Key rules:**
- **Code changes:** Claude Chat creates prompts → Claude Code executes → Claude Chat verifies
- **Documentation:** Claude Chat updates directly (no prompt needed)
- Claude Chat MUST put Claude Code prompts in a single code block (for easy copy-paste), separate from explanations

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

**For code changes:**

1. YOU → Describe request to Claude Chat
2. CLAUDE CHAT → Reads files, asks questions, creates Claude Code prompt
3. YOU → Paste prompt to Claude Code
4. CLAUDE CODE → Executes, reports back
5. CLAUDE CHAT → Verifies by reading files
6. YOU → Test in browser, confirm done
7. CLAUDE CODE → Commits and pushes to `staging` (default)

**For documentation:**

1. YOU → Describe what needs documenting (or Claude Chat notices)
2. CLAUDE CHAT → Updates the documentation files directly
3. CLAUDE CODE → Commits and pushes to `staging` (default)

⚠️ **Deploy where?** Always push to `staging` first. Only push to `main` when Stéphane explicitly says to promote to main. If unclear, ask: "Deploy to staging or main?"

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

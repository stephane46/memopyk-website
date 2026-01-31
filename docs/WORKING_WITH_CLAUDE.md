# MEMOPYK: Working with Claude

Quick reference for reporting issues and requesting changes.

---

## Starting a Session

**Always start by giving Claude Chat context:**

```
MEMOPYK session start.

Project: memopyk-clean
Location: C:\Users\ngocn\OneDrive\1 Personal\1 NOUS\MEMOPYK EURL\Systems\MEMOPYK Website\memopyk-clean

Please read:
1. CLAUDE.md (project root)
2. docs/migration/MIGRATION_PROGRESS.md (current status)

[Then state what you want to work on]
```

**After a long break (weeks/months), add:**

```
It's been a while. Please also check:
- Recent git commits: what changed lately?
- docs/README.md for documentation structure
```

---

## The Flow

1. **You** → Give context + describe request (templates below)
2. **Claude Chat** → Reads files, asks questions if needed, creates Claude Code prompt
3. **You** → Paste prompt to Claude Code
4. **Claude Code** → Executes, reports back
5. **Claude Chat** → Verifies the work (reads files to confirm)
6. **You** → Test in browser, confirm done

---

## Templates (Copy & Paste)

### Bug Report

```
BUG: [Short description]

Project: memopyk-clean
Where: [Page URL or admin section]
What happens:
Expected:
Steps to reproduce: [if not obvious]
Screenshot: [if visual]
Console errors: [if any]
```

### Feature Request

```
FEATURE: [Short description]

Project: memopyk-clean
Goal:
Where: [Which page/section]
Details:
Related files: [if you know them]
Priority: [Nice-to-have / Important / Critical]
```

### UI/Design Change

```
UI CHANGE: [Component/page]

Project: memopyk-clean
Page/Component: [URL or component name]
Current:
Desired:
Reference: [screenshot or example]
```

### Documentation Update

```
DOC UPDATE: [File path]

Project: memopyk-clean
File: docs/[path]
Current:
Should be:
Why:
```

### New Admin Feature

```
ADMIN FEATURE: [Short description]

Project: memopyk-clean
Goal:
Location: [Which admin section]
User flow:
  1. Admin clicks...
  2. Sees...
  3. Can do...
Data needed: [Database tables/fields involved]
Priority:
```

### Database/Schema Change

```
SCHEMA CHANGE: [Table or field]

Project: memopyk-clean
Schema file: shared/schema.ts
Current state:
Desired state:
Reason:
Affected features: [What code uses this data]
```

---

## Key Project Info (for Claude Chat reference)

| Item | Value |
|------|-------|
| Project name | memopyk-clean |
| Local path | C:\Users\ngocn\OneDrive\1 Personal\1 NOUS\MEMOPYK EURL\Systems\MEMOPYK Website\memopyk-clean |
| Staging URL | https://memopyk.memopyk.com |
| Production URL | https://memopyk.com |
| Tech stack | React 18 + TypeScript + Vite (frontend), Express + Drizzle (backend), Supabase PostgreSQL |
| Key docs | CLAUDE.md, docs/README.md, docs/migration/MIGRATION_PROGRESS.md |

---

## Tips

- **One request at a time** — Easier to track and verify
- **Include file paths** when you know them — Saves Claude time searching
- **Screenshots for visual issues** — Worth 1000 words
- **Always test** Claude Code's changes in browser before confirming done
- **Update CLAUDE.md** at end of major work sessions

---

## End of Session

Ask Claude Code:

```
Update CLAUDE.md with what we accomplished today, current status, and next steps.
```

This ensures future sessions have context.

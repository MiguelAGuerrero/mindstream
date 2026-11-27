---
tags: [skill-creator]
max_turns: 80
timeout_seconds: 2400
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

In my app (a Vue workspace with three tools: ThinkPad, Focus and Workflows, in ./app) I tapped "Focus on this" in a ThinkPad thread by accident, then "Not now" on the Focus start screen. Home now shows a "Waiting on Focus" row under Pick up that never goes away, and there is no way to close it out. Take that as a concrete example of a general concern: go through the app for other instances of the same kind of thing and fix them. Tests are `npm test` inside ./app. Tell me what you fixed, what you left, and what you did not check.

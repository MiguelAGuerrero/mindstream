# Primary-source check: task-execution and focus apps vs Mindstream's Focus runner

Research date: 24 November 2026. Method: pages were downloaded with curl and read in full as text (not summarised by a model), so quotes below are verbatim from the page as served on that date.

Reachability in this session:
- Read in full: intend.do (home, /features, /philosophy, /faq, /pricing), help.amazingmarvin.com (about 35 articles read in full; all 538 articles in its sitemap were also scanned by keyword), taskwarrior.org/docs (using_dates, context, terminology, tags, report, commands, commands/done, urgency, review, best-practices, workflow, man/task.1), nesslabs.com (4 articles), and README files of small open-source "task stack" tools on raw.githubusercontent.com.
- NOT reachable: blitzit.app and www.blitzit.app (proxy refused the connection); intercom.help/llama-life (Llama Life's help centre); secretgeek.net, docs.rs, alanwsmith.com. Nothing about Blitzit could be verified.
- Partly readable: llamalife.co is a JavaScript single-page app. The HTML shell has no content; I read the text strings inside the site's own JavaScript bundle (https://llamalife.co/static/js/main.3b22df90.js, served 24 Nov 2026). Those are the vendor's words and code, but I did not see the rendered pages, and the bundle is the web app, which may differ from the iOS/Android apps.

Verdict vocabulary used below: CONFIRMED (a primary source says so), CONTRADICTED (a primary source shows a counter-example), REFINED (true with a stated qualification), UNVERIFIED (no primary source could be read).

## 1. Intend (formerly Complice): goals, intentions, outcomes, reviews, nesting

### Takeaway
Intend is flat, not nested: up to 10 goals, one "top priority" per goal, and a fresh daily list of intentions each tagged with a goal number. Two things matter for Mindstream: its "Now Page" is a focus-first single-task view that starts blank and asks you to type what you are doing (contradicting claim (a)), and finishing a goal's top priority prompts a reflection on what you learned that is then filed on the timeline as a milestone (the nearest thing found to claim (c)'s takeaway-on-parent).

### Cited Findings
Pages are undated; all read 24 Nov 2026.

Structure
- Goals: "up to 10 active goals"; "each goal can have one top priority". — [Intend features](https://intend.do/features)
- "With Intend, goals come first. You literally can't access the rest of the app before first setting at least two goals that you're working towards. Most users have 3-6. You get up to 10, each with its own digit". — [Intend philosophy](https://intend.do/philosophy)
- Intentions are tagged to goals: "when you go to enter your intentions for the day, you have to explicitly indicate which goal it is for using the goal's number, or you use an ampersand to indicate that it's a miscellaneous intention". — [Intend philosophy](https://intend.do/philosophy)
- Each intention "clearly indicates which goal it is in service of (with the number at the start)"; one intention can serve several goals: "1,2) hike with Kate". — [Intend features](https://intend.do/features)
- No backlog and no future tasks: "You can't put in tasks for the future. The only futurey thing you can do is to state a single top priority for each goal, with an optional check-in date." — [Intend philosophy](https://intend.do/philosophy)
- No nesting inside Intend; hierarchy is delegated to another tool: "there's an app called WorkFlowy which is amazing for breaking down projects into parts. And now, Intend has an unofficial WorkFlowy integration that lets you plan tasks for days and have them automatically imported into that day's intentions." — [Intend FAQ](https://intend.do/faq)
- The philosophy page describes decomposition as a possible future feature: "Future implementations of Intend may also have a system for brainstorming potential future tasks, or breaking down big things into small tasks". — [Intend philosophy](https://intend.do/philosophy)
- However the hotkey table on the features page lists "shift+ a  Break down intention into smaller steps" (also "a  Append text to an action" and "alt+ a  Split multigoal intention into separate intentions for each goal"). No description of what the break-down hotkey does was found. — [Intend features](https://intend.do/features)
- Intentions cannot be edited after entry: "There isn't a way to edit it. The idea is that once you've set intentions, they're on your list for the today." — [Intend FAQ](https://intend.do/faq)

Single-task views
- Now Page: "It always starts blank, even if you've already set intentions for the day, and just asks "What now?" You choose something to work on, by typing in an intention or picking one from various lists, and then it shows you that." — [Intend features](https://intend.do/features)
- "when you mark your Now intention complete (or "not now/today") it doesn't automatically show you the next item on the list. It goes back to the expansive, open-ended "What now?"" — [Intend features](https://intend.do/features)
- Browser new-tab extension: "Replace those distractions with your next action on Intend and a giant Done button." — [Intend features](https://intend.do/features)
- Timers: Pomodoro ("assign completed pomodoros to intentions") and an Hourglass timer that "can be paused and chunked partway" and "allows you to rate how focused you were while it was running". — [Intend features](https://intend.do/features)

Outcomes (what is captured on completion)
- "One of the core parts of the Intend workflow is completing your outcomes at the end of the day (or the next morning, for some people). Where your intentions capture what you intend to do each day, your outcomes are a chance to reflect on what you ultimately accomplished, and how that looks in relation to your overall goal. For each goal, Intend asks: is this enough?" — [Intend features](https://intend.do/features)
- The outcomes editor has, per goal, buttons "y (or e) for "enough"", "n for "not enough"", "d for "day off"" and a "say more..." text box; "Press enter while in the "say more..." box, and it automatically jumps you down to the next goal's buttons." — [Intend features](https://intend.do/features)
- "Every day, you're prompted to reflect on whether you actually did each item". — [Intend features](https://intend.do/features)
- Undone items do not carry over: "Intend now has a feature that shows you not-done actions from the last 3 days and lets you grab them for today's intentions." — [Intend features](https://intend.do/features)
- Top priority completion: "When you're done with a priority, either because you completed it or because you realized it's no longer top priority, you get a chance to reflect on what you learned. After that, it shows up on your timeline as a milestone." — [Intend features](https://intend.do/features)

Reviews
- "The holy grail of journalling: synthesizing tiny notes about what's happening each day, up to the scale of weeks, months, seasons & whole years—and back down. All reviews are separated into sections for each goal". — [Intend features](https://intend.do/features)
- "Weekly reviews are the on-the ground at-a-glance view of what happened towards each goal that week. You see what you did (and what you didn't) and reflect on what you learned and what to do next." — [Intend features](https://intend.do/features)
- "Quarterly reviews are where it gets meta: rather than looking at individual days, they guide you to synthesize the weekly & monthly reviews to notice patterns in what's working and not working." — [Intend features](https://intend.do/features)
- Reviews are "pre-loaded with questions"; "custom questions can be added for each goal". — [Intend features](https://intend.do/features)

Pricing (vendor page)
- Yearly "$ 10 /MO (paid as $120 /yr)"; Monthly "$ 12 /MO (cancel anytime)"; "1 on 1 Coaching $ 200 /MO"; "You can try Intend for two weeks for free, without entering your credit card." — [Intend pricing](https://intend.do/pricing)
- Platform: "No native app but you can add the web app to your phone's homescreen"; offline works for most features; data export as JSON. — [Intend features](https://intend.do/features); [Intend FAQ](https://intend.do/faq)

### Inferences
- The first pass's unverified recollection ("submitting outcomes", marking each intention done/not done and optionally annotating, shown per goal in the weekly review) is CONFIRMED in substance; the precise mechanic is a per-goal "is this enough?" verdict plus a per-goal "say more..." note, entered once a day, not at the moment each intention is completed.
- Intend's roll-up is by time (day to week to quarter to year) within a fixed goal, not by task hierarchy. Mindstream rolls up by decomposition depth. They are different axes; Intend remains the best precedent for "small notes synthesised upward".
- The Now Page is the closest mainstream precedent for Mindstream's "type what you are working on and it becomes the card". It lacks a stack: completing returns to a blank "What now?", not to a parent.
- The top-priority reflection ("reflect on what you learned", then a milestone on the goal's timeline) is a completion-time takeaway attached to the parent goal, but only at the single priority level, not at arbitrary depth.

### Gaps
- What "Break down intention into smaller steps" (shift+a) actually does (whether it replaces the intention with several, nests them, or opens a prompt) is not documented on any page read. It needs the app or the blog (blog.complice.co was not fetched).
- No dates on Intend's pages; the content was current on 24 Nov 2026 but its last-edit date is unknown.
- Whether the Now Page shows the goal alongside the intention (beyond the goal number/colour prefix) was not stated in text; the page relies on a screencast I could not view.

## 2. Amazing Marvin: Super Focus Mode, sub-tasks, dependencies, waiting, review dates, notes, procrastination features

### Takeaway
Marvin's Super Focus Mode is confirmed as a list-fed one-task view (same order as the daily list, next task appears automatically), with an option to reveal sub-tasks one at a time. There is no "Waiting for" strategy: waiting is a label convention ("waiting", "waiting on") optionally wired to an automatic review date, plus a separate Dependencies feature that moves blocked items to the Backburner showing "depends on...". Nothing in the documentation prompts for a note on completion or mentions adding a sub-task from inside focus mode.

### Cited Findings
The help centre has moved platform; the old Intercom URLs redirect to https://help.amazingmarvin.com/amazing-marvin/<slug>. Dates are from each page's embedded metadata.

Super Focus Mode (modified 19 Oct 2026)
- "In super focus mode, you can only see one task at a time. This helps you to focus on the task at hand without being distracted by any of the other tasks you have planned for your day." — [Super Focus Mode (SFM)](https://help.amazingmarvin.com/amazing-marvin/super-focus-mode-sfm)
- "The order of the tasks shown is the same as the order you have in your daily list (top to bottom)." — [SFM](https://help.amazingmarvin.com/amazing-marvin/super-focus-mode-sfm)
- "Once you've finished the task, click the checkbox or press "D" or the return key on your keyboard. The task will be checked off on your list and moved to "completed tasks". The next task automatically appears". — [SFM](https://help.amazingmarvin.com/amazing-marvin/super-focus-mode-sfm)
- "To skip a task, click the skip button at the bottom right or use the left and right arrow keys"; "The tasks loop around". — [SFM](https://help.amazingmarvin.com/amazing-marvin/super-focus-mode-sfm)
- "With Show subtasks one at a time turned on, a task's subtasks show up one by one, so you only see the next step. If a project is in your list, you see its tasks one at a time too." — [SFM](https://help.amazingmarvin.com/amazing-marvin/super-focus-mode-sfm)
- Timers: "Turn on Show session timer to see how long you have been working in this focus session"; "Show progress bar ... fills up compared to the task's duration estimate"; "If you are using the time tracking strategy, the timer will automatically start for the current task in super focus mode." — [SFM](https://help.amazingmarvin.com/amazing-marvin/super-focus-mode-sfm)
- The SFM article lists these sections only: opening, marking done, skipping, subtasks and projects, cheers, orbs, session timer, progress bar, task order, time tracking, tablet tip. It says nothing about adding a task or sub-task from within SFM, nothing about notes, and nothing about showing the parent project. — [SFM](https://help.amazingmarvin.com/amazing-marvin/super-focus-mode-sfm)
- Top of Mind: "displaying it in a small window that is always visible on your screen"; it can show "what you are tracking, a suggested task, your current time block, what's up next in your day, or the first task in a smart list". — [Top of Mind](https://help.amazingmarvin.com/amazing-marvin/top-of-mind)

Sub-tasks and nesting (Subtasks article modified 28 Oct 2026)
- "Each task can have its own list of subtasks." "Subtasks are not independent tasks and are always attached to a task. They can't have their own labels, time estimates etc." — [Subtasks (Checklist)](https://help.amazingmarvin.com/amazing-marvin/subtasks-checklist)
- Manual break-down is the documented purpose: "Subtasks can also be helpful when a task is a bit too large and unpleasant and you want to break it down into smaller steps so it is easier to get started on it." — [Subtasks (Checklist)](https://help.amazingmarvin.com/amazing-marvin/subtasks-checklist)
- Entry mechanic: "hover over the task and click the plus icon"; "After you are done typing your subtask and press enter to save it, another subtask automatically gets created below it." — [Subtasks (Checklist)](https://help.amazingmarvin.com/amazing-marvin/subtasks-checklist)
- Deeper nesting is by projects: "Projects can contain subprojects and tasks."; categories: "You can nest them infinitely."; a task should be "something you can complete in one work session with no break. For most people it is ideal to keep a task under 1h." — [Categories, Projects and Tasks](https://help.amazingmarvin.com/amazing-marvin/categories-projects-and-tasks)
- "Unlimited nesting to organize projects and tasks". — [Does Marvin work well for GTD methodologies?](https://help.amazingmarvin.com/amazing-marvin/does-marvin-work-well-for-gtd-methodologies)

Dependencies (published 2019, modified 6 Oct 2026)
- "To add a dependency to a project or task (something that has to be completed first), click on the edit menu and select the dependency picker". — [Dependencies](https://help.amazingmarvin.com/amazing-marvin/dependencies)
- "As soon as an item has a dependency it will go to the Backburner." "Items in the Backburner will have the "ban" symbol and show you why they are there "depends on..."" — [Dependencies](https://help.amazingmarvin.com/amazing-marvin/dependencies)
- "As soon as you complete any dependencies a project becomes "available". Marvin will move it from the Backburner to your Master List. The item will have a "new" tag so you know Marvin moved it for you. Hovering over the new tag tells you why this item became available." — [Dependencies](https://help.amazingmarvin.com/amazing-marvin/dependencies)
- Sequential Projects: "With sequential projects all tasks depend on the one before"; it "will put all of the tasks that are not the first step into the backburner." — [Sequential Projects](https://help.amazingmarvin.com/amazing-marvin/sequential-projects)

Waiting
- No article titled or describing a "Waiting for" strategy exists among the 538 articles in the help sitemap (keyword scan of every article, 24 Nov 2026). Waiting is a label: "Marvin uses the waiting label for automatically adding your tasks to the "Waiting For" list"; "Waiting For - Tasks & projects with the waiting label." — [Ultimate GTD workflow](https://help.amazingmarvin.com/amazing-marvin/ultimate-gtd-workflow)
- "for items to end up on the "Next Actions" list they must not have the "waiting" label." — [Next Actions](https://help.amazingmarvin.com/amazing-marvin/next-actions)
- Resurfacing by date: "you can automatically add a review date for 10 days in the future to any item that you add the label "waiting on" to". — [Review Date](https://help.amazingmarvin.com/amazing-marvin/review-date)

Review dates (published 2019, modified 6 Oct 2026)
- "With the review date strategy you can add a specific date to a task or project on which you want to "review" this item. On the date of review the item will get a "review" tag attached to it." — [Review Date](https://help.amazingmarvin.com/amazing-marvin/review-date)
- "When you are done reviewing the item (whatever that means in your workflow) you can click the review label to remove it." — [Review Date](https://help.amazingmarvin.com/amazing-marvin/review-date)
- An optional alert: "This snippet gives you an alert at the top whenever there is an item that has a review or new tag." — [Review Alert](https://help.amazingmarvin.com/amazing-marvin/review-alert)
- Snooze is same-day hiding only: "The snooze feature allows you to hide a task from your view until a specified time."; for days, "use start dates instead". — [Snooze Feature](https://help.amazingmarvin.com/amazing-marvin/snooze-feature)

Notes and completion
- "Enabling notes for tasks gives you a collapsable/expandable note area right underneath the task title." — [Task and Project Notes](https://help.amazingmarvin.com/amazing-marvin/task-and-project-notes)
- "When you complete a task, its note stays with the task"; "Completing a project keeps its notes automatically. The project's notebook moves to From completed projects on the Notebooks screen". — [Notebooks](https://help.amazingmarvin.com/amazing-marvin/notebooks)
- Completion documentation covers sounds, confetti and reward points ("When you complete a Task or Project, Marvin will give you reward points automatically!"); no article describes a prompt for a note, outcome or takeaway when an item is completed. — [Reward Points](https://help.amazingmarvin.com/amazing-marvin/reward-points); [Notebooks](https://help.amazingmarvin.com/amazing-marvin/notebooks)

Procrastination features
- Procrastination Wizard: "walks you through a series of questions and tips to help you figure out what's in the way and get moving"; "Answer the questions by clicking the buttons. Some steps ask you to write something down or start a short timer."; "When you feel ready, click I am ready to start on it! ... When you're done, click I finished the task! to mark it complete." — [Procrastination Wizard](https://help.amazingmarvin.com/amazing-marvin/procrastination-wizard)
- The "I struggle with procrastination" page recommends the Wizard, an Accountability Pledge and "Bug me until done"; it does not list breaking tasks down as a strategy. — [I struggle with procrastination](https://help.amazingmarvin.com/amazing-marvin/i-struggle-with-procrastination)
- "Use Super Focus Mode and Top of Mind together. Your current task fills the screen in Marvin, and stays in view in a small window wherever you are." — [I have trouble focusing](https://help.amazingmarvin.com/amazing-marvin/i-have-trouble-focusing)

Pricing (vendor page, published 3 Oct 2026, modified 2 Nov 2026)
- "Monthly: $12 USD per month"; "Yearly: $96 USD per year"; "14-day free trial with full access to everything. You don't need a credit card to start."; "No, there isn't a free plan."; students 50% off. No lifetime licence is mentioned. — [How much does it cost? (Pricing)](https://help.amazingmarvin.com/amazing-marvin/how-much-does-it-cost-pricing)

### Inferences
- First-pass items now settled: SFM is list-fed (CONFIRMED); "Marvin tasks have one level of subtasks but projects/sub-projects nest arbitrarily" (CONFIRMED); "Marvin does have a 'Waiting for' strategy that ... reminds you on a follow-up date" (CONTRADICTED as stated: it is a label convention plus the Review Date strategy's label-to-date mapping, not a dedicated strategy with a note field); pricing $12/$96 with 14-day trial (CONFIRMED on vendor page).
- Marvin's "waiting" label can be put on a project, and a project is a container of tasks, so Marvin can mark a whole body of work as waiting and bring it back on a date. What it lacks relative to Mindstream's PARK is a first-class free-text reason shown on the parked item (Dependencies shows an automatic "depends on..." reason; the waiting label shows none) and any notion of restoring a position within a stack.
- Marvin's manual decomposition is a planning gesture on a list row (hover, plus icon). "Show subtasks one at a time" then replays those steps in SFM. That is decomposition-before-execution, the reverse order from Mindstream's decompose-while-executing.
- The Procrastination Wizard is a fixed, vendor-authored step-by-step flow in which some steps capture typed text. It is a single-user step runner with text capture, but not user-authored and not reusable for the user's own procedures.

### Gaps
- Whether a sub-task or new task can be added while inside Super Focus Mode: not documented either way. The first pass's blog-sourced claim that the spacebar opens a capture input in focus mode is not in the SFM help article; UNVERIFIED.
- Whether SFM shows the parent project/category of the current task: not stated in text (screenshots not viewable).
- What the Procrastination Wizard does with the text it asks you to write (whether it is saved to the task) is not stated.
- No Marvin feature named "procedures" exists in the sitemap; nearest are "saved-items-templates" and "sequential-projects".

## 3. Llama Life: single-task view, sub-tasks, "Break it down", presets, what is recorded on completion

### Takeaway
From the vendor's own web-app code and copy: Llama Life is list-fed with a countdown per task; "Break it down" sends the task to a server endpoint and returns generated sub-tasks that you can prune, re-run, add to the main list as ordinary tasks, or save as a preset. Nothing in the web bundle prompts for a note on completion. The help centre and rendered pages could not be read, so details of the mobile apps remain unverified.

### Cited Findings
Source for all items: strings and code in the site's JavaScript bundle, https://llamalife.co/static/js/main.3b22df90.js, fetched 24 Nov 2026. Rendered pages not seen.
- Positioning copy: "I'm here to help you work THROUGH your list, ONE task at a time."; "Unlike other task managers, Llama Life is designed to help you work [through] a list..."; "Calm your mind by focusing on one task at a time". — [llamalife.co bundle](https://llamalife.co/static/js/main.3b22df90.js)
- Task anatomy (onboarding tour): "For each task, write a title"; "Estimate how long the task will take, in minutes ... This sets what the countdown timer will start on"; "When you are ready to start the task, click Play ... try and focus on the task, and nothing else, till the timer hits 00:00"; "When you have finished the task, hit Complete". — [llamalife.co bundle](https://llamalife.co/static/js/main.3b22df90.js)
- Alongside the list: "Here you can see the total duration of ALL the tasks in your list"; "And here is your estimated finishing time". — [llamalife.co bundle](https://llamalife.co/static/js/main.3b22df90.js)
- Timeboxing rationale (founder's note): "Llama Life uses a concept called [timeboxing], which is the practice of setting a fixed amount of time to each task." — [llamalife.co bundle](https://llamalife.co/static/js/main.3b22df90.js)
- Break it down: a task-menu button labelled "Break it down" calls a function `breakdownTask` that posts to "https://llamaserver.herokuapp.com/task-breakdown"; the modal shows "Let's break it down!", per-item remove, "Run again", "Add to list" (function `addSubtasksToMainList`), "Save as Preset" and "If you still need to break it down, Click 'Run again'". The same bundle contains the identifiers "GPT3.5" and `getEmojiFromOpenAi`. — [llamalife.co bundle](https://llamalife.co/static/js/main.3b22df90.js)
- In the web bundle the word "subtask" appears only inside this break-down modal; no separate manual "add sub-task" control was found. — [llamalife.co bundle](https://llamalife.co/static/js/main.3b22df90.js)
- Presets: "Presets are for tasks you perform 'often' or 'as a group' eg routines. Create once, then load with one-click!"; changelog 27 Oct 2020: "This feature allows you to create templated lists (presets) for tasks you perform often. You can then load these to your Main list any time you want." — [llamalife.co bundle](https://llamalife.co/static/js/main.3b22df90.js)
- Recorded on completion: time, not text. Changelog 27 Sep 2020: "'actual time spent' on a task has been added ... once a task is marked complete, it will default back to 'time set' so you can compare that to 'actual time spent'"; 12 Mar 2021: "You can now view a Report! This is a summary of key metrics of the tasks on your Main List." Marketing copy: "when you cross off a task - big or small, we celebrate the wins!" No string for a task note, reflection or takeaway prompt was found in the bundle. — [llamalife.co bundle](https://llamalife.co/static/js/main.3b22df90.js)
- Pricing as coded in the pricing component: plans "Extra Focus (Monthly)" with `priceDisplay:6,priceBillingPeriod:"month"` and "Extra Focus (Annual)" with `priceDisplay:39,priceBillingPeriod:"year"`; "Try Free for 7 days"; "Start 7-day free trial"; "No credit card required". Currency symbol not confirmed because the page was not rendered. — [llamalife.co bundle](https://llamalife.co/static/js/main.3b22df90.js)
- Site map lists /pricing, /features, /templates, /whatsnew among others, confirming a web product alongside the mobile apps. — [llamalife.co sitemap](https://llamalife.co/sitemap.xml)

### Inferences
- Claim (a) is CONFIRMED for Llama Life: the focus view works through a pre-entered list; what sits beside the current task is list duration and finishing time, not a parent chain.
- "Break it down" is machine-generated (server call with "Run again"), consistent with the App Store description quoted in the first pass that it "uses AI". Its output is flattened into the main list as sibling tasks: there is no parent-child relationship kept and no "return to parent" step.
- The first pass's unverified recollection that Llama Life "supports manually typed sub-tasks" (one level) is NOT supported by the web bundle; treat as unverified, possibly wrong for the web app.

### Gaps
- The embedded changelog stops at v1.7.12 (22 Apr 2022); the bundle's build date is unknown. Features of the current iOS/Android apps (which are a separate codebase) were not verifiable.
- intercom.help/llama-life (the help centre, linked from the bundle) was blocked, so the exact behaviour of sub-tasks, notes and reports in the mobile app is unverified.
- Whether the server endpoint uses an LLM is inferred from the "GPT3.5" identifier and the earlier App Store wording; the bundle does not state it in user-facing copy.

## 4. Blitzit: focus view, sub-tasks, notes, what is shown beside the current task

### Takeaway
Not verified. blitzit.app and www.blitzit.app were refused by this session's network proxy, so no Blitzit page could be read.

### Cited Findings
- None. Every request to blitzit.app, www.blitzit.app, help.blitzit.app, docs.blitzit.app and app.blitzit.app failed at the proxy on 24 Nov 2026.

### Inferences
- All first-pass statements about Blitzit (always-visible countdown, floating "Blitz mode" widget, pricing) remain at the evidential level of the first pass: third-party listings and unverified recollection.

### Gaps
- Everything asked: the focus view layout, sub-tasks, notes, what is shown beside the current task, completion behaviour and pricing. The host needs to be allowed in the session's network settings before this can be checked.

## 5. Taskwarrior: wait, depends, blocked/blocking, annotations, contexts, resurfacing

### Takeaway
All Taskwarrior semantics claimed in the first pass are confirmed from the official docs, with two refinements: a `context` is only a named filter (it cannot be parked, and has no state), and completing a task accepts free text that is saved as an annotation on that same task (`task 1 done Paint dried overnight`), which is a real precedent for "capture a line at the moment of finishing", though filed on the finished task, not its parent.

### Cited Findings
Site footer reads "Copyright © 2026 Gothenburg Bit Factory"; the man page documents the 3.x line ("This is used when upgrading from version 2.x to version 3.x"). Read 24 Nov 2026.

wait
- "You can add a wait date to a task, which has the effect of hiding the task from you until that date." Example `wait:november`: "the task will not appear on lists until November. At that time, it will reappear". — [Using Dates Effectively](https://taskwarrior.org/docs/using_dates/)
- "You can view all the hidden waiting tasks using the waiting report: $ task waiting"; "There is a WAITING virtual tag to select these tasks, but note that you have to use the all report with it ... because a waiting task is not pending." — [Using Dates Effectively](https://taskwarrior.org/docs/using_dates/)
- Man page: "wait:<wait-date> When a task is given a wait date, it is hidden from most built-in reports, which exclude +WAITING. When the date is in the past, the task is not considered +WAITING, and again becomes visible. Note that, for compatibilty, such tasks are shown as having status "waiting", but this will change in a future release." — [task(1)](https://taskwarrior.org/docs/man/task.1/)
- "The waiting state indicates a pending task that is hidden from view." — [Terminology](https://taskwarrior.org/docs/terminology/)
- A wait date is a date only; no reason field is documented. The same page distinguishes `scheduled` ("the earliest opportunity to work on a task") and `until` ("the task self-destructs, and is automatically deleted"). — [Using Dates Effectively](https://taskwarrior.org/docs/using_dates/)
- Waiting lowers priority: "urgency.waiting.coefficient -3.0 # waiting task". — [Urgency](https://taskwarrior.org/docs/urgency/)

depends, blocked, blocking
- "depends:<id1,id2 …> Declares this task to be dependent on id1 and id2. This means that the tasks id1 and id2 should be completed before this task. Consequently, this task will then show up on the 'blocked' report." — [task(1)](https://taskwarrior.org/docs/man/task.1/)
- "task <filter> blocked  Shows all tasks matching the filter, that are currently blocked by other tasks."; "task <filter> blocking  Shows all tasks matching the filter, that block other tasks."; "task <filter> unblocked  Shows all tasks that are not currently blocked by other tasks". — [task(1)](https://taskwarrior.org/docs/man/task.1/)
- Virtual tags: "BLOCKED - Is the task dependent on another incomplete task?"; "BLOCKING - Does another task depend on this incomplete task?"; "READY - Is the task pending, not blocked, and either not scheduled, or scheduled before now." — [Tags](https://taskwarrior.org/docs/tags/)
- Urgency: "urgency.blocking.coefficient 8.0 # blocking other tasks"; "urgency.blocked.coefficient -5.0 # blocked by other tasks". — [Urgency](https://taskwarrior.org/docs/urgency/)
- Dependencies are flat links, not a tree view: a user profile on the official site says "Taskwarrior currently cannot display dependency trees, which coupled with my habit of breaking down tasks into small subtasks makes the task lists often confusing." — [Workflow examples](https://taskwarrior.org/docs/workflow/)

Annotations and completion
- "An annotation is a note added to an existing task, and is in the form of a text string. There can be any number of annotations to a task." — [Terminology](https://taskwarrior.org/docs/terminology/)
- Completion with text: "One special case is that text provided en passant is added to the task as an annotation: $ task 1 done Paint dried overnight  Here the text Paint dried overnight is added as an annotation." — [done command](https://taskwarrior.org/docs/commands/done/)
- "If the configuration setting journal.info is on, then when a task is started or stopped, an annotation is made to that effect." "Note that this does not imply there is time tracking in Taskwarrior". — [Terminology](https://taskwarrior.org/docs/terminology/)
- Active task: "If you apply a start date to a task, then the task is considered active. Active tasks have a higher urgency value". — [Terminology](https://taskwarrior.org/docs/terminology/)

Contexts
- "A context is therefore a named filter, and the current context is a form of default filter." Defined with e.g. `task context define work +work or +freelance`; switched with `task context home`; cleared with `task context none`. — [Context](https://taskwarrior.org/docs/context/)
- "Context is a user-defined query, which is automatically applied to all commands that filter the task list and to commands that create new tasks (add, log)." — [task(1)](https://taskwarrior.org/docs/man/task.1/)

Review
- tasksh review walks tasks "one at a time" with the chance "to modify, skip or mark the task as reviewed"; its filter includes "( +PENDING or +WAITING )", so waiting tasks are resurfaced by weekly review as well as by date. — [Tasksh Review](https://taskwarrior.org/docs/review/)

### Inferences
- First-pass statements on `wait:`, `task waiting`, WAITING tag, `depends:` and the blocked/blocking/unblocked reports are CONFIRMED.
- A waiting task resurfaces purely by date (or by a periodic tasksh review). There is no "why" attached unless the user adds an annotation by hand.
- Taskwarrior's "context" is unrelated to Mindstream's "context": it is a saved filter over all tasks, has no stack and no waiting state. Claim (d) holds for Taskwarrior: waiting and blocking are strictly per-task.
- `task N done <text>` shows that capturing a line at the moment of finishing is established practice in a mature tool. Mindstream's difference is where the line goes (onto the parent) and that it is prompted.

### Gaps
- The standalone doc pages for `annotate` and for dependencies returned HTTP 503/404; the man page and terminology page were used instead.
- Taskwarrior has no parent/child task concept in the pages read, so "note filed on the parent" has no meaning there; this is an absence, not a documented statement.

## 6. Ness Labs: interstitial journaling, task switching, attention residue, Zeigarnik

### Takeaway
The Ness Labs interstitial-journaling article cites no studies at all and does not mention attention residue or Sophie Leroy; it credits the technique to Tony Stubblebine and describes it as timestamped lines written at each break. Ness Labs' Zeigarnik article cites Zeigarnik (1927), Ovsiankina (1928) and Weigelt and Syrek; attention residue appears on Ness Labs only as a quotation of Leroy inside a founder interview.

### Cited Findings
Interstitial journaling (Anne-Laure Le Cunff; published 15 Apr 2020, modified 14 Apr 2022)
- "Interstitial journaling is a productivity technique created by Tony Stubblebine. To my knowledge, it's the simplest way to combine note-taking, tasks, and time tracking in one unique workflow." — [Ness Labs](https://nesslabs.com/interstitial-journaling)
- "The basic idea of interstitial journaling is to write a few lines every time you take a break, and to track the exact time you are taking these notes." Example lines include "11:45 - Made good progress. Need to get ready for meeting with Charlie." — [Ness Labs](https://nesslabs.com/interstitial-journaling)
- "Notice the mix of goals ("finish the first draft"), self-awareness ("fell into a Twitter blackhole", "feeling anxious"), self-review ("good progress"), and actionable items ("call Anna")?" — [Ness Labs](https://nesslabs.com/interstitial-journaling)
- "Proactive breaks: reflect on your previous task, plan for the next one, take your own mental pulse, jot down anything else that comes to mind so as to reduce your cognitive load." — [Ness Labs](https://nesslabs.com/interstitial-journaling)
- The article names no study, no researcher other than Stubblebine as originator, and makes no quantified claim. Its evidence is personal: "Interstitial journaling has had an amazing impact on my productivity and creativity". — [Ness Labs](https://nesslabs.com/interstitial-journaling)

The psychology of unfinished tasks (published 14 Jun 2022, modified 16 Jun 2022)
- "In 1927, psychologist Bluma Zeigarnik reported that individuals tend to have a better memory for tasks that are interrupted or incomplete, than they do for tasks that have been completed." — [Ness Labs](https://nesslabs.com/unfinished-tasks)
- "In 1928, Ovsiankina found that, compared to a task that has not yet been started, individuals have a stronger urge to complete interrupted or unfinished assignments." — [Ness Labs](https://nesslabs.com/unfinished-tasks)
- "Psychologists Oliver Weigelt and Christine Syrek discovered that leaving assignments unfinished over the weekend causes people to ruminate on the unfinished tasks, which leads to difficulty switching off from work." "Describing it as "closure", they noted that ticking a task off the list then made it easier for people to enjoy their remaining time off." — [Ness Labs](https://nesslabs.com/unfinished-tasks)
- Advice drawn: "Start even if you can't finish."; "the Zeigarnik effect shows that your mind will naturally work to retain information when you take regular breaks". — [Ness Labs](https://nesslabs.com/unfinished-tasks)

Mindful context switching (published 8 Aug 2023)
- "In computing, context switching refers to the process of storing the current state for one task, so that this task can be paused and another task resumed." — [Ness Labs](https://nesslabs.com/mindful-context-switching)
- "Research shows that constantly switching context between different tasks has a terrible effect on attention." (linked, study not named in the text). Quotes Edward M. Hallowell and Christian and Griffiths' Algorithms to Live By: "You should try to stay on a single task as long as possible without decreasing your responsiveness below a minimum acceptable limit." — [Ness Labs](https://nesslabs.com/mindful-context-switching)
- Method step: "break down your tasks into manageable chunks that can be done between these response times. Each chunk needs to be realistic, with a beginning and an end." — [Ness Labs](https://nesslabs.com/mindful-context-switching)

Single-tasking (published 10 Nov 2022; a guest author who describes herself as "a freelance medical copywriter")
- "Researchers Kevin Madore and Anthony Wagner ... found that "the human mind and brain lack the architecture to perform two or more tasks simultaneously.""; "In 2016, an analysis of 49 studies found that multitasking negatively impacted cognitive outcomes."; "single-tasking is the most efficient way of working, as it avoids switching costs". — [Ness Labs](https://nesslabs.com/single-tasking)

Attention residue
- A site search for "attention residue" returns one page, a founder interview: "As Sophie Leroy, Associate Professor at the University of Washington Bothell School of Business, puts it: attention residue is "when our attention is focused on another task instead of being fully devoted to the current task at hand."" The speaker is the co-founder of a note-taking product, not Ness Labs' author. — [Ness Labs: Stashpad interview](https://nesslabs.com/stashpad-featured-tool)

### Inferences
- Correction to the first pass: it listed the Ness Labs article among sources that "tie the practice to Sophie Leroy's attention/task-residue research". The Ness Labs article does not. If the report links interstitial journaling to attention residue, the link must be attributed to the other write-ups or made as Mindstream's own inference.
- Describing Mindstream's takeaway as "structured interstitial journaling" still fits the article's own description ("reflect on your previous task, plan for the next one"), but the article offers no experimental evidence for the practice.
- The Zeigarnik claims are as the first pass feared: popular summary of 1920s findings. Ness Labs gives no citation that Zeigarnik effects are reduced by writing a note; that inference belongs to Leroy and Glomb's separate "ready-to-resume" work, which Ness Labs does not cite on any page read.
- The Weigelt and Syrek "closure" finding is the nearest support on Ness Labs for a small completion ritual (ticking off, noting the result) easing detachment.

### Gaps
- The studies behind "Research shows that constantly switching context..." are hyperlinks whose targets I did not follow.
- Tony Stubblebine's original 2017 article was not read.
- Ness Labs has no article of its own on attention residue (site search, 24 Nov 2026).

## 7. Prior art for a manually built focus stack with return, and for recording something when popping

### Takeaway
The first pass missed a whole genre: small developer tools that implement exactly "push what you are now doing onto a stack, pop to return to what you were doing". At least six exist (yakstack, memo, rabbit_hole, stackly, todostack, sigi), and one design, Yak Stacker, also asks "What Do You Need To Remember Later?" when you stack or stop a task. Claim (b) as worded ("no manual push-and-return mechanic exists") is contradicted. None of them files a takeaway on the parent when popping.

### Cited Findings
All READMEs read on raw.githubusercontent.com, 24 Nov 2026. Repository dates and activity could not be checked (GitHub API not available in this session).
- yakstack (Python CLI): "This script helps you keep track of your "yak frames", or context switches. Got distracted from a task? Add it to the yak stack. Got distracted from the new task? Also add it to the yak stack. Once you've finished, shave the yak and go back to the previous task." It prints the chain as an indented breadcrumb with depth: "You are currently 2 yak frames deep / Work on super-important project / ⤷ Show yak script to a colleague". "yakstack is not a todo list, or a task management solution. It's simply a way to keep track of your context switches". Pop is `yakstack --shave`. — [yakstack README](https://raw.githubusercontent.com/gilmoreorless/yakstack/HEAD/README.rst)
- memo (Go CLI): "Your brain's task stack. When you get pulled into something new, push it onto the stack so you don't lose track of what you were doing before." `memo push "review PR #42"` prints "Paused: fix auth bug / Started: review PR #42"; `memo` prints "review PR #42 (working for 12m)" (an elapsed timer on the current item); "memo pop | Complete the current task and resume the previous one"; "memo drop | Abandon the current task and resume the previous one"; "memo switch | Swap the top two tasks"; "memo queue <description> | Add a task to the bottom of the stack"; "Timestamped log of all work sessions for later review". Example log lines are dated 2026-02-20. Pop takes no note. — [memo README](https://raw.githubusercontent.com/mattmanning/memo/HEAD/README.md)
- rabbit_hole (Ruby gem): "Add each new task as you start it, and RabbitHole will keep track of your task stack for you. When you finish a task, tell RabbitHole and it'll remind you what you were working on before. Keep going til you get back to your starting point." Commands: add, current, complete, show ("Remind yourself how deep you are"). — [rabbit_hole README](https://raw.githubusercontent.com/davefp/rabbit_hole/master/README.md)
- stackly (npm CLI): "you're doing something and then a new activity pops up and you have to do that and when you finish it you start wondering what the hell I was doing before it? ... stackly is exactly a stack that you use to say what you were doing!" — [stackly README](https://raw.githubusercontent.com/pouyakary/stackly/HEAD/README.md)
- todostack.el (Emacs): "It uses a stack as a to-do list system. The idea is to reduce the effect of distractions. When you have to switch tasks, push what you are currently doing onto the stack with the command todostack-push ... When you have finished the task currently on the top of the stack, pop it off with todostack-pop." Also `todostack-procrastinate`, `todostack-rotate`, `todostack-queue`. Self-described as "trivial (and experimental -- use at your own risk)". — [todostack README](https://raw.githubusercontent.com/EvansWinner/todostack/master/README.md)
- sigi (Rust CLI): "an organizing tool for terminal lovers who hate organizing"; commands push, peek, "complete  Move the current item to "<STACK>_history" and mark as completed", swap, rot, next, and multiple named stacks via "-t, --stack <STACK>  Manage items in a specific stack" with "list-stacks". — [sigi README](https://raw.githubusercontent.com/sigi-cli/sigi/HEAD/README.md)
- Yak Stacker (browser app design, "An app for tracking your Yak Stack during programming sessions"): "When you're starting a new task, provide a description in What Are You Doing?"; "If you get sidetracked with another task directly related to what you're working on, click the task's (Stack button/some sort of shaving icon) and provide a description in What Are You Doing Now? and optionally provide some notes in What Do You Need To Remember Later?"; "Click the I'm Done With This button on any task stack once you're done with it. All nested tasks will also be considered done."; "If you're conciously stopping working on a task and have some context you need to remember later, click its Stop button and optionally provide some notes in What Do You Need To Remember Later?"; "This isn't a TODO list, it's a aide-mémoire". The README has a "Design Questions" section and a "Tech" plan ("Just use localStorage initially"), which reads as a project at design stage. — [yak-stacker README](https://raw.githubusercontent.com/insin/yak-stacker/HEAD/README.md)
- Within the assigned vendors, the nearest things are Intend's Now Page (type a focus; completing returns to blank "What now?", not to a parent) and Marvin's "Show subtasks one at a time" (pre-planned steps replayed singly). — [Intend features](https://intend.do/features); [Marvin SFM](https://help.amazingmarvin.com/amazing-marvin/super-focus-mode-sfm)

### Inferences
- The stack-with-return mechanic is established prior art among programmers, framed as defence against interruption and yak shaving ("what was I meant to be doing again?"). Mindstream's framing differs: the push is deliberate decomposition of something too big, not a record of being sidetracked. The mechanism is the same.
- What the prior art has that Mindstream might borrow: memo's `drop` (abandon vs complete, both returning to the parent), `switch` (swap top two) and `queue` (add to the bottom, i.e. "after this"); yakstack's depth count ("3 yak frames deep"); sigi's multiple named stacks (the closest analogue of Mindstream's separate contexts); Yak Stacker's "What Do You Need To Remember Later?" note captured at the moment of pushing or stopping, which is a ready-to-resume note for the thing being left.
- What none of the prior art has: a note prompted on pop that is attached to the parent frame; a parked state with a "waiting on" reason for a whole stack; a large single-card GUI. Yak Stacker's Stop-with-note on a task and its nested tasks comes closest to PARK with a reason, but the note is "what to remember", not "what I am waiting on", and the project's shipping status is unknown.
- These are command-line or hobby projects. Among commercial task apps read in this pass, no stack-with-return mechanic was found. The accurate statement is "exists as niche developer utilities; absent from mainstream task apps examined".

### Gaps
- Activity, release dates and user numbers for all seven projects are unverified (GitHub API blocked). Whether Yak Stacker was ever built beyond its README is unknown.
- Three further candidates surfaced only as search-result titles and were not readable: "pushpop, a mental stack manager" (secretgeek.net), "mind" (Rust crate, docs.rs) and "My Personal Stack - A WTF Was I Doing List" (alanwsmith.com). Unverified.
- No academic or HCI source on interruption stacks was searched for.

## 8. Verdict on claims (a) to (e)

### Takeaway
Two of the five provisional claims do not survive as worded. (a) is contradicted by Intend's Now Page (focus-first, typed in the moment) and by yakstack-style tools that show the parent chain; (b) is contradicted by a genre of manual push/pop task-stack tools. (c), (d) and (e) hold among the sources read but each has a near-miss that the report should name. Blitzit could not be checked at all.

### Cited Findings
Claim (a): every single-task focus view is fed from a pre-planned list, and none shows the parent chain beside the current task. Verdict: CONTRADICTED in both halves by specific counter-examples; CONFIRMED for Marvin and Llama Life; UNVERIFIED for Blitzit.
- Confirms (Marvin): "The order of the tasks shown is the same as the order you have in your daily list (top to bottom)." — [Marvin SFM](https://help.amazingmarvin.com/amazing-marvin/super-focus-mode-sfm)
- Confirms (Llama Life): "I'm here to help you work THROUGH your list, ONE task at a time." — [llamalife.co bundle](https://llamalife.co/static/js/main.3b22df90.js)
- Contradicts first half (Intend): the Now Page "always starts blank ... and just asks "What now?" You choose something to work on, by typing in an intention or picking one from various lists, and then it shows you that." — [Intend features](https://intend.do/features)
- Contradicts second half (yakstack): the current frame is displayed under its ancestors, "Work on super-important project / ⤷ Show yak script to a colleague", with "You are currently 2 yak frames deep". — [yakstack README](https://raw.githubusercontent.com/gilmoreorless/yakstack/HEAD/README.rst)
- Partial (Intend): each intention "clearly indicates which goal it is in service of (with the number at the start)", a one-level link to the parent goal. — [Intend features](https://intend.do/features)

Claim (b): in-the-moment decomposition is done by AI in current apps, and no manual "push a smaller focus on a stack and return" mechanic exists. Verdict: first half REFINED (true of Llama Life; Marvin and Intend offer manual break-down); second half CONTRADICTED.
- Llama Life's "Break it down" is server-generated with "Run again" and "Add to list". — [llamalife.co bundle](https://llamalife.co/static/js/main.3b22df90.js)
- Marvin, manual: "you want to break it down into smaller steps so it is easier to get started on it." — [Marvin Subtasks](https://help.amazingmarvin.com/amazing-marvin/subtasks-checklist)
- Intend, manual hotkey: "shift+ a  Break down intention into smaller steps". — [Intend features](https://intend.do/features)
- Manual push and return exists: "memo pop | Complete the current task and resume the previous one". — [memo README](https://raw.githubusercontent.com/mattmanning/memo/HEAD/README.md)
- "When you finish a task, tell RabbitHole and it'll remind you what you were working on before." — [rabbit_hole README](https://raw.githubusercontent.com/davefp/rabbit_hole/master/README.md)

Claim (c): no app asks for a takeaway on finishing a sub-task and files it on the parent. Verdict: CONFIRMED among sources read (no exact counterpart), with three near-misses.
- Intend, one level, on the goal's timeline: "When you're done with a priority ... you get a chance to reflect on what you learned. After that, it shows up on your timeline as a milestone." — [Intend features](https://intend.do/features)
- Intend, daily and per goal, not per item: "For each goal, Intend asks: is this enough?" with a "say more..." box. — [Intend features](https://intend.do/features)
- Taskwarrior, on the finished task itself, unprompted: "$ task 1 done Paint dried overnight  Here the text Paint dried overnight is added as an annotation." — [Taskwarrior done](https://taskwarrior.org/docs/commands/done/)
- Marvin and Llama Life: completion records time, points or confetti; no note prompt is documented. — [Marvin Reward Points](https://help.amazingmarvin.com/amazing-marvin/reward-points); [llamalife.co bundle](https://llamalife.co/static/js/main.3b22df90.js)
- Stack tools: memo's pop logs duration only ("Done: fix auth bug (25m)"). — [memo README](https://raw.githubusercontent.com/mattmanning/memo/HEAD/README.md)

Claim (d): waiting/blocked features are per task, and parking a whole context with a reason has no counterpart. Verdict: first half CONFIRMED for Taskwarrior and REFINED for Marvin (labels and dependencies apply to projects as well as tasks); second half CONFIRMED for the commercial apps read, with one near-miss in prior art.
- Taskwarrior wait is a per-task date with no reason: "it is hidden from most built-in reports ... When the date is in the past, the task ... again becomes visible." — [task(1)](https://taskwarrior.org/docs/man/task.1/)
- Taskwarrior "context" is not a parkable unit: "A context is therefore a named filter". — [Taskwarrior Context](https://taskwarrior.org/docs/context/)
- Marvin: "Waiting For - Tasks & projects with the waiting label."; dependency reason is automatic: items "show you why they are there "depends on..."". — [Marvin Ultimate GTD workflow](https://help.amazingmarvin.com/amazing-marvin/ultimate-gtd-workflow); [Marvin Dependencies](https://help.amazingmarvin.com/amazing-marvin/dependencies)
- Near-miss: Yak Stacker's Stop on a task (with its nested tasks) "and optionally provide some notes in What Do You Need To Remember Later?". — [yak-stacker README](https://raw.githubusercontent.com/insin/yak-stacker/HEAD/README.md)
- Near-miss: sigi keeps several named stacks ("-t, --stack <STACK>"), i.e. separate contexts, without any waiting state. — [sigi README](https://raw.githubusercontent.com/sigi-cli/sigi/HEAD/README.md)

Claim (e): no personal step-by-step runner captures text per step. Verdict: REFINED; still largely UNVERIFIED because the relevant products (routine runners, process-run tools) were outside this pass's hosts.
- Counter-example of a kind: Marvin's Procrastination Wizard is a single-user guided sequence in which "Some steps ask you to write something down or start a short timer." It is fixed by the vendor, not a user-authored procedure. — [Marvin Procrastination Wizard](https://help.amazingmarvin.com/amazing-marvin/procrastination-wizard)
- Step-at-a-time without capture: "a task's subtasks show up one by one, so you only see the next step." — [Marvin SFM](https://help.amazingmarvin.com/amazing-marvin/super-focus-mode-sfm)
- Question-per-section with text answers, but periodic not procedural: Intend reviews are "pre-loaded with questions" and "custom questions can be added for each goal". — [Intend features](https://intend.do/features)
- Llama Life presets are reusable lists run one task at a time; nothing captures text per step. — [llamalife.co bundle](https://llamalife.co/static/js/main.3b22df90.js)

### Inferences
- Suggested rewording for the report. (a): "Mainstream focus views (Marvin, Llama Life) work through a pre-planned list. Intend's Now Page is the exception: it starts blank and you type what you are doing. No mainstream app shows the chain of parents beside the current task; small developer stack tools such as yakstack do, in a terminal."
- (b): "Push-and-return task stacks exist as niche command-line utilities for programmers (yakstack, memo, rabbit_hole and others). Mainstream task apps do not offer the mechanic; where they help break a task down in the moment it is by AI (Llama Life) or by adding checklist rows (Marvin)."
- (c): "No tool read attaches a finishing note to the parent. Nearest: Intend's reflection when a goal's top priority is finished, and Taskwarrior's `done <text>` annotation on the task itself."
- (d): "Waiting is a property of a task or project (label, date, dependency). No tool read parks a whole working stack with a stated reason; one hobby design (Yak Stacker) lets you stop a stack with a 'remember later' note."
- (e): keep as "none found", and say plainly that process-run and routine apps were not re-checked from primary sources in this pass.
- Mindstream's distinct combination after this check: a GUI single card, decomposition as the push gesture, a prompted takeaway filed on the parent at pop, and parked stacks with a reason. Each element except the takeaway-on-parent has at least a partial precedent.

### Gaps
- Blitzit: nothing verified for any claim.
- Llama Life mobile apps and help centre: not readable; claims rest on the web bundle.
- "No counterpart found" for (c) and (d) covers Intend, Marvin, Llama Life (web), Taskwarrior and seven stack utilities. Sunsama, Tiimo, Routinery, Super Productivity, OmniFocus, Things, Process Street and the other products named in the first pass were not re-read here.
- Maintenance status of the stack utilities is unknown, so "exists" means "was published", not "is actively used".

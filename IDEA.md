# Relay

## What it is

Relay runs the complete workflow for evidence-backed faceless videos.

- Research
- Research approval
- Script and visual plan
- Content approval
- Voice, assets, and video generation
- Video review and revisions
- Final approval
- Publishing

## Core principle

The user owns inference.

- The user's ChatGPT or Workspace Agent supplies reasoning.
- User-connected providers generate voice, images, or clips.
- Relay does not hide a Relay-funded agent behind its tools.

Relay owns the workflow and every artifact created within it.

## Relay owns

- Projects and workflow state
- Research queries, sources, claims, and evidence
- Scripts, storyboards, assets, and videos
- Artifact versions and approvals
- Provider and channel connections
- Generation and rendering jobs
- Review, revisions, scheduling, and publishing
- Progress, failures, retries, and audit history

If work is not saved to Relay, it is not part of the project.

## Relay UI

Relay's web app is the complete product interface and source of truth.

Each video has five sections:

- Research
- Content
- Production
- Review
- Publish

All detailed work happens in Relay, including research review, editing, approvals, video review, provider settings, and publishing controls.

## ChatGPT

ChatGPT is an optional conversational interface to Relay.

Users can ask it to:

- Start or continue research
- Explain findings
- Draft or revise content
- Check project status
- Start approved work

ChatGPT must use Relay tools, save every result to Relay, and return the updated Relay state.

The MVP needs no custom ChatGPT UI. ChatGPT should show only:

- What changed
- The saved artifact version
- The current stage
- The next required action
- A link to the exact screen in Relay

ChatGPT should not contain a second dashboard, editor, approval flow, timeline, settings page, or publishing form.

## Research

Research is part of Relay.

Relay exposes tools for:

- Searching for sources
- Capturing source content and metadata
- Extracting and saving claims
- Linking claims to evidence
- Submitting research for review

The user's model reasons over this material. Relay stores the complete research trail and updates its UI throughout the process.

## Approval rules

- Approvals happen in Relay.
- An approval applies to one exact artifact version.
- Editing an approved artifact creates a new version and removes its approval.
- Publishing is allowed only for the exact approved video and metadata.

## Video production

- The user's model creates a structured script and scene plan.
- User-connected providers create voice and optional visual assets.
- Relay assembles and renders the video deterministically.
- AI-generated footage is an optional asset, not the entire composition system.

## MVP

- Relay web app
- Project workflow and artifact versions
- Research tools and evidence review
- ChatGPT skill and MCP server
- Script and storyboard review
- One voice provider
- Deterministic video renderer
- Video preview and revision flow
- YouTube publishing
- Text confirmations and deep links in ChatGPT

## Later

- Workspace Agent triggers for unattended stages
- Compact ChatGPT status cards
- More media providers
- More publishing platforms
- Team roles and collaborative review

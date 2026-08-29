-- =============================================
-- Briselle Platform — 019_add_ai_prompts_config_type.sql
-- Created At: 2026-08-16 | Last Modified: 2026-08-17
-- Task: BRIS-NN-MNB-T92 / T102
--
-- Adds config_type 8 = AIPromptsLoader and seeds the AI Meeting Notes
-- instruction prompt library.
--
-- config_type is a plain smallint with no CHECK constraint, so no schema
-- change is needed to introduce 8 — only the documenting COMMENT, which
-- was stale (it stopped at 6 while the code already used 7).
--
-- BRIS-NN-MNB-T102: THIS FILE IS THE ONLY PLACE THE PROMPT TEXT LIVES.
-- The application no longer carries any prompt in code and does not seed
-- itself. If this row is absent the instruction menu reports that the
-- library is missing rather than inventing one.
--
-- config_json carries TWO copies:
--   instructions.<Type>  the live, editable prompt
--   defaults.<Type>      the shipped text, never written by the app
-- "Reset to default" copies defaults -> instructions, so a reset restores
-- from the database rather than from anything compiled into the client.
--
-- Run in Supabase SQL Editor. Safe to re-run: guarded by
-- ON CONFLICT DO NOTHING against uq_platform_config_scope, so an edited
-- library is never overwritten.
-- =============================================

COMMENT ON COLUMN platform_config.config_type IS
  '1=MenuLoader, 2=UIUXLoader, 3=ObjectLoader, 4=ModuleLoader, 5=ThemeLoader, 6=DashboardLoader, 7=ObjectCounter, 8=AIPromptsLoader';

-- ---------------------------------------------------------------
-- Seed: AI Meeting Notes instruction prompts
--   entity_id  1000000000  Briselle org (defaults for everyone, for now)
--   dobj_id    1000000002  AI Meeting Notes prompt document
--   config_type        8   AIPromptsLoader
--   config_name        AIMeetingNotesPrompt
-- ---------------------------------------------------------------
INSERT INTO platform_config (
    entity_id, dobj_id, config_name, config_type,
    config_description, is_default, is_active, config_json
) VALUES (
    1000000000, 1000000002, 'AIMeetingNotesPrompt', 8,
    'AI Meeting Notes summarisation instruction prompts', true, true,
    '{
  "schemaVersion": "1.0",
  "order": [
    "Auto",
    "Meeting",
    "Interview",
    "Call",
    "Stand-up",
    "Workshop",
    "1-on-1",
    "Technical Discussion",
    "Product Planning",
    "Brainstorming",
    "Client Review",
    "Sales"
  ],
  "defaultOrder": [
    "Auto",
    "Meeting",
    "Interview",
    "Call",
    "Stand-up",
    "Workshop",
    "1-on-1",
    "Technical Discussion",
    "Product Planning",
    "Brainstorming",
    "Client Review",
    "Sales"
  ],
  "instructions": {
    "Auto": {
      "name": "Auto",
      "icon": "Sparkles",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyse the transcript and notes below and write a summary of what actually happened.\n\nFIRST, work out what this recording really is. It may be a meeting, but it may equally be a phone call, a lecture, an interview, a rehearsal, a song, or one person thinking aloud. Say plainly what it is in the first bullet, and shape the rest around that. Never force a discussion that did not happen into a meeting structure.\n\nWRITE IN BULLETS, not paragraphs. Every bullet is one specific, verifiable statement drawn from the material — a decision, a fact, a number, a name, a commitment, a lyric, a claim. Quote short distinctive phrases verbatim in \"quotation marks\" when the exact wording matters.\n\nPrefer the concrete over the general. \"Pricing moves to £40/seat from March\" earns its place; \"pricing was discussed\" does not. If something is ambiguous or inaudible, say so rather than smoothing it over.\n\nUse these sections, with `##` headings:\n\n## Overview\nTwo to four bullets: what this recording is, who took part if identifiable, and the outcome or gist.\n\n## Key Points\nThe substance, grouped under `###` sub-headings when more than one distinct topic is present. Name the sub-headings after the actual topics, not generic labels.\n\n## Decisions\nOnly decisions genuinely reached, each with who made it if stated. If none, write a single bullet saying no decisions were made.\n\n## Action Items\n`- [ ] Task — owner — due date` for each, using only owners and dates actually mentioned. If none, write a single bullet saying no action items were identified.\n\nOmit any section that would contain nothing but a \"none\" bullet AND has no bearing on the content — for a song or a lecture, Decisions and Action Items are usually worth keeping as an explicit \"none\" so the reader knows they were looked for.\n\nDo not invent participants, dates, numbers or commitments. Do not pad. A short, accurate summary is better than a long, plausible one.",
      "updatedAt": null,
      "updatedBy": null
    },
    "Meeting": {
      "name": "Meeting",
      "icon": "Users",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following meeting transcript and notes. Generate an executive meeting summary.\nStructure:\n## Executive Summary\nBrief summary of the meeting context and core outcomes.\n## Agenda & Topics Discussed\nDetailed notes by topic.\n## Decisions Made\nKey decisions reached.\n## Action Items & Ownership\n- [ ] Task with owner and deadline.",
      "updatedAt": null,
      "updatedBy": null
    },
    "Interview": {
      "name": "Interview",
      "icon": "Signpost",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following interview transcript. Evaluate candidate background, technical skills, behavioral responses, culture fit, and overall recommendation.\nStructure:\n## Candidate Profile\nCandidate name, role applied for, years of experience.\n## Key Strengths & Technical Competency\nEvidence of technical skills.\n## Behavioral Assessment & Culture Fit\nSoft skills and cultural alignment.\n## Areas of Concern / Gaps\nIdentified skill gaps.\n## Interview Recommendation\n**Recommendation:** [Strong Hire / Hire / Neutral / Do Not Hire]",
      "updatedAt": null,
      "updatedBy": null
    },
    "Call": {
      "name": "Call",
      "icon": "Headphones",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following call transcript and notes. This is a general\nconversation rather than a structured meeting, so lead with what was actually\nagreed rather than an agenda.\nStructure:\n## Call Summary\nWho was on the call, why it happened, and the outcome in two or three sentences.\n## What Was Discussed\nThe substance of the conversation, grouped by topic.\n## Commitments Made\nAnything either side promised to do, with the person who owns it.\n## Open Questions\nPoints raised but not resolved on the call.\n## Action Items & Next Steps\n- [ ] Action item with owner and due date if mentioned.",
      "updatedAt": null,
      "updatedBy": null
    },
    "Stand-up": {
      "name": "Stand-up",
      "icon": "Users",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following daily standup transcript. Summarize what each person completed yesterday, what they plan to do today, and all blockers.\nStructure:\n## Standup Summary\nBrief overview of team progress.\n## Updates by Participant\nPer-person yesterday/today updates.\n## Blockers & Escalations\nItems requiring immediate attention.",
      "updatedAt": null,
      "updatedBy": null
    },
    "Workshop": {
      "name": "Workshop",
      "icon": "Presentation",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following workshop transcript and notes. A workshop\nproduces material rather than decisions, so capture what the group built and\nwhere it landed, not just who spoke.\nStructure:\n## Workshop Purpose & Participants\nThe objective of the session and who took part.\n## Activities & Exercises\nWhat the group actually worked through, in order.\n## Outputs & Artefacts\nConcrete material produced — frameworks, lists, diagrams, drafts.\n## Themes & Insights\nPatterns that emerged across the exercises.\n## Points of Disagreement\nWhere the group did not converge, and the positions held.\n## Follow-up Actions\n- [ ] Action item with owner.",
      "updatedAt": null,
      "updatedBy": null
    },
    "1-on-1": {
      "name": "1-on-1",
      "icon": "Users",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following 1-on-1 meeting transcript and notes. Focus on individual performance, career goals, personal feedback, challenges, and support required.\nStructure:\n## Discussion Summary\nOverview of the 1-on-1 conversation.\n## Performance Updates\nKey performance highlights and feedback.\n## Career & Development Goals\nCareer aspirations and development objectives discussed.\n## Challenges & Blockers\nCurrent challenges requiring support or escalation.\n## Action Items & Next Steps\n- [ ] Action item",
      "updatedAt": null,
      "updatedBy": null
    },
    "Technical Discussion": {
      "name": "Technical Discussion",
      "icon": "FileText",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following technical discussion transcript. Summarize architectural decisions, trade-offs evaluated, tech stack choices, technical debt, and next technical milestones.\nStructure:\n## Technical Problem Statement\nCore problem or feature being engineered.\n## Architecture Decisions & Solutions\nDetailed technical approach.\n## Trade-offs & Alternatives Considered\nPros and cons discussed.\n## Next Technical Milestones\n- [ ] Implementation task",
      "updatedAt": null,
      "updatedBy": null
    },
    "Product Planning": {
      "name": "Product Planning",
      "icon": "Presentation",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following product planning session transcript. Extract user stories, feature priorities, scope boundaries, risks, and roadmap timelines.\nStructure:\n## Product Vision & Goals\nFeature goal and target user persona.\n## User Stories & Functional Requirements\nKey feature requirements.\n## Out of Scope\nItems explicitly deferred.\n## Milestones & Target Release\nProposed release timeline.",
      "updatedAt": null,
      "updatedBy": null
    },
    "Brainstorming": {
      "name": "Brainstorming",
      "icon": "Sparkles",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following brainstorming session. Capture all generated ideas, group them by theme, highlight standout concepts, and summarize next exploration steps.\nStructure:\n## Brainstorming Topic\nCore problem or theme.\n## Ideas Grouped by Theme\nOrganized list of all generated ideas.\n## Standout Concepts\nHighest-potential ideas.\n## Next Steps\n- [ ] Experiment / Spike",
      "updatedAt": null,
      "updatedBy": null
    },
    "Client Review": {
      "name": "Client Review",
      "icon": "Signpost",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following client review meeting transcript. Summarize client satisfaction, deliverables status, feedback, risks, and next steps.\nStructure:\n## Account Status & Health\nOverall sentiment and project health.\n## Deliverables Review\nStatus of recent milestones.\n## Client Feedback & Requests\nClient feedback and feature requests.\n## Next Steps\n- [ ] Follow-up item",
      "updatedAt": null,
      "updatedBy": null
    },
    "Sales": {
      "name": "Sales",
      "icon": "Headphones",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following sales call transcript. Identify prospect pain points, budget, timeline, decision-makers, product fit, objections, and next commercial steps.\nStructure:\n## Prospect Overview & Qualification\nCompany background, current stack, and identified pain points.\n## Product Requirements\nKey requirements and features discussed.\n## Budget & Timeline\nBudget range and timeline expectations.\n## Decision Makers\nKey stakeholders involved in the decision.\n## Competitive Landscape\nOther solutions being considered.\n## Deal Risk Assessment\n**Risk Level:** [Low / Medium / High]\n## Action Items\n- [ ] Send proposal/quote\n## Next Steps\nFollow-up demo or commercial negotiation call.",
      "updatedAt": null,
      "updatedBy": null
    }
  },
  "defaults": {
    "Auto": {
      "name": "Auto",
      "icon": "Sparkles",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyse the transcript and notes below and write a summary of what actually happened.\n\nFIRST, work out what this recording really is. It may be a meeting, but it may equally be a phone call, a lecture, an interview, a rehearsal, a song, or one person thinking aloud. Say plainly what it is in the first bullet, and shape the rest around that. Never force a discussion that did not happen into a meeting structure.\n\nWRITE IN BULLETS, not paragraphs. Every bullet is one specific, verifiable statement drawn from the material — a decision, a fact, a number, a name, a commitment, a lyric, a claim. Quote short distinctive phrases verbatim in \"quotation marks\" when the exact wording matters.\n\nPrefer the concrete over the general. \"Pricing moves to £40/seat from March\" earns its place; \"pricing was discussed\" does not. If something is ambiguous or inaudible, say so rather than smoothing it over.\n\nUse these sections, with `##` headings:\n\n## Overview\nTwo to four bullets: what this recording is, who took part if identifiable, and the outcome or gist.\n\n## Key Points\nThe substance, grouped under `###` sub-headings when more than one distinct topic is present. Name the sub-headings after the actual topics, not generic labels.\n\n## Decisions\nOnly decisions genuinely reached, each with who made it if stated. If none, write a single bullet saying no decisions were made.\n\n## Action Items\n`- [ ] Task — owner — due date` for each, using only owners and dates actually mentioned. If none, write a single bullet saying no action items were identified.\n\nOmit any section that would contain nothing but a \"none\" bullet AND has no bearing on the content — for a song or a lecture, Decisions and Action Items are usually worth keeping as an explicit \"none\" so the reader knows they were looked for.\n\nDo not invent participants, dates, numbers or commitments. Do not pad. A short, accurate summary is better than a long, plausible one.",
      "updatedAt": null,
      "updatedBy": null
    },
    "Meeting": {
      "name": "Meeting",
      "icon": "Users",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following meeting transcript and notes. Generate an executive meeting summary.\nStructure:\n## Executive Summary\nBrief summary of the meeting context and core outcomes.\n## Agenda & Topics Discussed\nDetailed notes by topic.\n## Decisions Made\nKey decisions reached.\n## Action Items & Ownership\n- [ ] Task with owner and deadline.",
      "updatedAt": null,
      "updatedBy": null
    },
    "Interview": {
      "name": "Interview",
      "icon": "Signpost",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following interview transcript. Evaluate candidate background, technical skills, behavioral responses, culture fit, and overall recommendation.\nStructure:\n## Candidate Profile\nCandidate name, role applied for, years of experience.\n## Key Strengths & Technical Competency\nEvidence of technical skills.\n## Behavioral Assessment & Culture Fit\nSoft skills and cultural alignment.\n## Areas of Concern / Gaps\nIdentified skill gaps.\n## Interview Recommendation\n**Recommendation:** [Strong Hire / Hire / Neutral / Do Not Hire]",
      "updatedAt": null,
      "updatedBy": null
    },
    "Call": {
      "name": "Call",
      "icon": "Headphones",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following call transcript and notes. This is a general\nconversation rather than a structured meeting, so lead with what was actually\nagreed rather than an agenda.\nStructure:\n## Call Summary\nWho was on the call, why it happened, and the outcome in two or three sentences.\n## What Was Discussed\nThe substance of the conversation, grouped by topic.\n## Commitments Made\nAnything either side promised to do, with the person who owns it.\n## Open Questions\nPoints raised but not resolved on the call.\n## Action Items & Next Steps\n- [ ] Action item with owner and due date if mentioned.",
      "updatedAt": null,
      "updatedBy": null
    },
    "Stand-up": {
      "name": "Stand-up",
      "icon": "Users",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following daily standup transcript. Summarize what each person completed yesterday, what they plan to do today, and all blockers.\nStructure:\n## Standup Summary\nBrief overview of team progress.\n## Updates by Participant\nPer-person yesterday/today updates.\n## Blockers & Escalations\nItems requiring immediate attention.",
      "updatedAt": null,
      "updatedBy": null
    },
    "Workshop": {
      "name": "Workshop",
      "icon": "Presentation",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following workshop transcript and notes. A workshop\nproduces material rather than decisions, so capture what the group built and\nwhere it landed, not just who spoke.\nStructure:\n## Workshop Purpose & Participants\nThe objective of the session and who took part.\n## Activities & Exercises\nWhat the group actually worked through, in order.\n## Outputs & Artefacts\nConcrete material produced — frameworks, lists, diagrams, drafts.\n## Themes & Insights\nPatterns that emerged across the exercises.\n## Points of Disagreement\nWhere the group did not converge, and the positions held.\n## Follow-up Actions\n- [ ] Action item with owner.",
      "updatedAt": null,
      "updatedBy": null
    },
    "1-on-1": {
      "name": "1-on-1",
      "icon": "Users",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following 1-on-1 meeting transcript and notes. Focus on individual performance, career goals, personal feedback, challenges, and support required.\nStructure:\n## Discussion Summary\nOverview of the 1-on-1 conversation.\n## Performance Updates\nKey performance highlights and feedback.\n## Career & Development Goals\nCareer aspirations and development objectives discussed.\n## Challenges & Blockers\nCurrent challenges requiring support or escalation.\n## Action Items & Next Steps\n- [ ] Action item",
      "updatedAt": null,
      "updatedBy": null
    },
    "Technical Discussion": {
      "name": "Technical Discussion",
      "icon": "FileText",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following technical discussion transcript. Summarize architectural decisions, trade-offs evaluated, tech stack choices, technical debt, and next technical milestones.\nStructure:\n## Technical Problem Statement\nCore problem or feature being engineered.\n## Architecture Decisions & Solutions\nDetailed technical approach.\n## Trade-offs & Alternatives Considered\nPros and cons discussed.\n## Next Technical Milestones\n- [ ] Implementation task",
      "updatedAt": null,
      "updatedBy": null
    },
    "Product Planning": {
      "name": "Product Planning",
      "icon": "Presentation",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following product planning session transcript. Extract user stories, feature priorities, scope boundaries, risks, and roadmap timelines.\nStructure:\n## Product Vision & Goals\nFeature goal and target user persona.\n## User Stories & Functional Requirements\nKey feature requirements.\n## Out of Scope\nItems explicitly deferred.\n## Milestones & Target Release\nProposed release timeline.",
      "updatedAt": null,
      "updatedBy": null
    },
    "Brainstorming": {
      "name": "Brainstorming",
      "icon": "Sparkles",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following brainstorming session. Capture all generated ideas, group them by theme, highlight standout concepts, and summarize next exploration steps.\nStructure:\n## Brainstorming Topic\nCore problem or theme.\n## Ideas Grouped by Theme\nOrganized list of all generated ideas.\n## Standout Concepts\nHighest-potential ideas.\n## Next Steps\n- [ ] Experiment / Spike",
      "updatedAt": null,
      "updatedBy": null
    },
    "Client Review": {
      "name": "Client Review",
      "icon": "Signpost",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following client review meeting transcript. Summarize client satisfaction, deliverables status, feedback, risks, and next steps.\nStructure:\n## Account Status & Health\nOverall sentiment and project health.\n## Deliverables Review\nStatus of recent milestones.\n## Client Feedback & Requests\nClient feedback and feature requests.\n## Next Steps\n- [ ] Follow-up item",
      "updatedAt": null,
      "updatedBy": null
    },
    "Sales": {
      "name": "Sales",
      "icon": "Headphones",
      "isSystem": true,
      "blocks": [],
      "promptText": "Analyze the following sales call transcript. Identify prospect pain points, budget, timeline, decision-makers, product fit, objections, and next commercial steps.\nStructure:\n## Prospect Overview & Qualification\nCompany background, current stack, and identified pain points.\n## Product Requirements\nKey requirements and features discussed.\n## Budget & Timeline\nBudget range and timeline expectations.\n## Decision Makers\nKey stakeholders involved in the decision.\n## Competitive Landscape\nOther solutions being considered.\n## Deal Risk Assessment\n**Risk Level:** [Low / Medium / High]\n## Action Items\n- [ ] Send proposal/quote\n## Next Steps\nFollow-up demo or commercial negotiation call.",
      "updatedAt": null,
      "updatedBy": null
    }
  }
}'::jsonb
)
ON CONFLICT ON CONSTRAINT uq_platform_config_scope DO NOTHING;

-- Re-seeding an existing row: see 020_reseed_ai_meeting_prompts.sql

-- Verify
SELECT config_id, config_name, config_type,
       jsonb_array_length(config_json->'order')                AS instruction_count,
       (SELECT count(*) FROM jsonb_object_keys(config_json->'defaults')) AS default_count
FROM   platform_config
WHERE  entity_id = 1000000000 AND dobj_id = 1000000002 AND config_type = 8;

# Graph Report - /Users/neetidhingra/Github/bhavidhingraa/precision-audio-editor  (2026-05-24)

## Corpus Check
- Corpus is ~3,467 words - fits in a single context window. You may not need a graph.

## Summary
- 43 nodes · 47 edges · 14 communities (7 shown, 7 thin omitted)
- Extraction: 96% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 21,106 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Server Request Parsing|Server Request Parsing]]
- [[_COMMUNITY_Audio Timeline Editor|Audio Timeline Editor]]
- [[_COMMUNITY_FFmpeg Audio Processing|FFmpeg Audio Processing]]
- [[_COMMUNITY_Express Server Utilities|Express Server Utilities]]
- [[_COMMUNITY_Timeline Formatting|Timeline Formatting]]
- [[_COMMUNITY_Audio Processor Core|Audio Processor Core]]
- [[_COMMUNITY_React App Root|React App Root]]
- [[_COMMUNITY_FFmpeg Loading|FFmpeg Loading]]
- [[_COMMUNITY_Audio Data Structures|Audio Data Structures]]
- [[_COMMUNITY_Type Definitions|Type Definitions]]
- [[_COMMUNITY_HTML Entry|HTML Entry]]
- [[_COMMUNITY_Documentation|Documentation]]

## God Nodes (most connected - your core abstractions)
1. `Audio Timeline Editor` - 7 edges
2. `processAudio()` - 3 edges
3. `formatTime()` - 3 edges
4. `initializeSegments()` - 3 edges
5. `AudioSegment` - 3 edges
6. `AudioTimelineEditor()` - 3 edges
7. `Express Server` - 3 edges
8. `parseTimestamp()` - 2 edges
9. `parseCut()` - 2 edges
10. `Cut` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Vite Configuration` --conceptually_related_to--> `Express Server`  [INFERRED]
  vite.config.ts → server.ts
- `App Component` --calls--> `Audio Timeline Editor`  [EXTRACTED]
  src/App.tsx → src/components/AudioTimelineEditor.tsx
- `Audio Timeline Editor` --references--> `AudioSegment Interface`  [EXTRACTED]
  src/components/AudioTimelineEditor.tsx → src/types.ts
- `Audio Timeline Editor` --calls--> `processAudio Function`  [EXTRACTED]
  src/components/AudioTimelineEditor.tsx → src/audioProcessor.ts
- `Audio Timeline Editor` --references--> `Cut Interface`  [EXTRACTED]
  src/components/AudioTimelineEditor.tsx → src/audioProcessor.ts

## Hyperedges (group relationships)
- **Audio Editing Pipeline** — audiotimelineeditor, process_audio, types_audiosegment, cut, initialize_segments [EXTRACTED 1.00]
- **Transcript Analysis Flow** — audiotimelineeditor, server, parse_timestamp, parse_cut, cut [EXTRACTED 1.00]
- **Frontend-Backend Integration** — vite_config, server, audiotimelineeditor [INFERRED 0.85]

## Communities (14 total, 7 thin omitted)

### Community 0 - "Server Request Parsing"
Cohesion: 0.29
Nodes (7): app, jsonMatch, normalizedCuts, parseCut(), parseTimestamp(), thinkMatch, timeoutMs

### Community 1 - "Audio Timeline Editor"
Cohesion: 0.54
Nodes (5): AudioTimelineEditor(), AudioSegment, TimelineState, formatTime(), initializeSegments()

### Community 2 - "FFmpeg Audio Processing"
Cohesion: 0.67
Nodes (3): Cut, loadFFmpeg(), processAudio()

### Community 3 - "Express Server Utilities"
Cohesion: 0.5
Nodes (4): parseCut Function, parseTimestamp Function, Express Server, Vite Configuration

### Community 4 - "Timeline Formatting"
Cohesion: 0.5
Nodes (4): Audio Timeline Editor, formatTime Function, initializeSegments Function, TimelineState Interface

## Knowledge Gaps
- **18 isolated node(s):** `app`, `timeoutMs`, `thinkMatch`, `jsonMatch`, `normalizedCuts` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Audio Timeline Editor` connect `Timeline Formatting` to `FFmpeg Loading`, `Audio Data Structures`, `Audio Processor Core`, `React App Root`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `App Component` connect `React App Root` to `Timeline Formatting`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `AudioSegment Interface` connect `Audio Data Structures` to `Timeline Formatting`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `app`, `timeoutMs`, `thinkMatch` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
# ADR 0001: M0 trust and calculation boundaries

Status: Accepted from approved Knowledge baseline, 2026-09-05.

M0 keeps UI authorization advisory, denies direct authoritative state transitions in Firebase Rules, and centralizes command authorization in Functions. Project roles remain Firestore membership data; organization administration does not imply engineering approval. Issued and released artifacts are immutable.

The calculation boundary uses a deterministic mock fixture with versioned input/output hashes and `NOT CHECKED` status. It is not a FEM solver and cannot produce an authoritative engineering result.


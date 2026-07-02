---
type: northstar
slug: l1-shell
tier: L1
app: shell
ladders_up_to: l2-ojfbot
status: active
# Landed from the Northstar Roadtrip Frame leg (voice-CONFIRMED 2026-06-28, landed 2026-07-02).
# The CONFIRMED block pinned refs @0.1.0 — semver-on-refs is DESIGNED, not yet in schema v1.1,
# so refs here are unpinned; the pins are recorded in the offsite schema-evolution log.
properties:
  - id: P1
    name: "Session surface — describe and navigate running instances"
    target: "A shell session enumerates, describes, and navigates to running agentic-app instances from one navigable surface, replacing the static module compositor with a live instance view."
    current: 12
    verification: "shell holds a live instance registry; can list running instances with health/state; navigate-to resolves to a running instance; module-compositor code does not count toward this."
    ladders_up_to: "ns:l2-ojfbot#P1"
    okr_drivers: []
  - id: P2
    name: "Authorized mechanism — mediate instance lifecycle"
    target: "The shell triggers spawn / manage / teardown lifecycle actions on instances, routing to core's launcher; the shell mediates and authorizes, the launcher executes."
    current: 8
    verification: "shell lifecycle endpoints route to core launcher and return instance state transitions; spawn/teardown observable through the surface; routing-coupling to core launcher is a SYNTHESIS reference, not a depends_on cap (shell does not inherit launcher readiness)."
    ladders_up_to: "ns:l2-ojfbot#P1"
    okr_drivers: []
  - id: P3
    name: "Zero-trust boundary on instance actions"
    target: "No unauthenticated call can spawn, navigate-to, or manage any instance; every action carries identity and is authorization-checked at the surface boundary; no ambient trust between shell and the instances it manages; actions are auditable."
    current: 5
    verification: "every lifecycle/navigation endpoint rejects unauthenticated and unauthorized calls; audit log records who-acted-on-what; no ambient-trust path exists."
    ladders_up_to: "ns:l2-ojfbot#P2"
    okr_drivers: []
  - id: P4
    name: "Runtime cluster management"
    target: "The shell spawns, navigates, and manages clusters of instances as a unit (e.g. the F1 stack spawns/tears down together), not only individual instances; a cluster is a collection of instances with shared lifecycle."
    current: 0
    verification: "shell can spawn/teardown a named cluster as one operation; navigate within a cluster; cluster lifecycle state is observable."
    ladders_up_to: "ns:l2-ojfbot#P1"
    okr_drivers: []
---

# Northstar — Frame / shell (L1)

**Vision.** Frame (the shell repo) is a session surface that describes, spawns, manages, and
navigates running **instances** of agentic applications. "Instance" is used in the object-oriented
sense: core's launcher registrations are the class (the spec of how to spawn an app), a running app
is an instance of it, and a cluster is a collection of instances with a shared lifecycle. The shell
does not own the spawn primitive — that lives in core's launcher and is orchestrated by
workstation-yuri — the shell is the **authorizing surface** in front of it, providing insight
(describe/observe running instances) and authorized mechanism (spawn/manage/teardown/navigate),
with every action authenticated and authorization-checked at the surface boundary under zero-trust.
The current Carbon module-federation product-dashboard compositor is disposable; the durable
compass is **instance-federation, not module-federation**. Standalone apps (e.g. f1-pit-wall,
its ADR-0001) that refused to be UI modules are first-class instances here — federated as running
instances while keeping their own stacks.

## P1 — Session surface: describe and navigate running instances

Ladders to `ns:l2-ojfbot#P1` (delivery). The honest 12% credits frame-agent + the existing static
MF host as scaffolding only — the target is a live instance view, and module-compositor code does
not count. LADDER_STRESS at land: **l2#P1=strain** — P1's current wording ("Frame-composed
surfaces") strains against standalone-instance surfaces; 2nd recorded instance of the
L2-P1-widening pressure (f1-substrate leg was the 1st); the gate trips at 3.

## P2 — Authorized mechanism: mediate instance lifecycle

Ladders to `ns:l2-ojfbot#P1`. The spawn substrate exists scattered (core
`scripts/launcher/registrations/` + `launch.sh`; workstation-yuri orchestration) — shell
*recomposes* it behind an authorizing surface rather than rebuilding it. Forward reference
`ns:l1-core#P-launcher` stays a SYNTHESIS flag until core's leg lands (flag, do not cap).
LADDER_STRESS: **l2#P1=strain** (same widening pressure).

## P3 — Zero-trust boundary on instance actions

Ladders to `ns:l2-ojfbot#P2` (legibility). An auditable authorization boundary is fleet
self-measurement. Shares an axis with blogengine's Phase-C security blockers — the fleet lacks a
consistent auth boundary between surfaces (candidate future L2/fleet concern).
LADDER_STRESS: **l2#P2=clean**.

## P4 — Runtime cluster management

Ladders to `ns:l2-ojfbot#P1`. 0% — nothing exists; named now because the cluster is the unit the
F1 stack already wants. This property is the standing evidence for the designed-but-unbuilt
cluster tier (`ns:cluster-<name>#P<n>`), which stays in the schema-evolution log until a leg needs
it in a ref. LADDER_STRESS: **l2#P1=strain** (same widening pressure).

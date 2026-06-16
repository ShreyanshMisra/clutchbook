"""Per-game calibration tables.

Each supported title maps a verified :class:`SkillProfile` + an
:class:`Objective` to a fair success probability. Phase 1 ships heuristic
estimators (``chess``); these are designed to be swapped for empirical curves
fitted on real settlement data once we have volume (see roadmap §5).
"""

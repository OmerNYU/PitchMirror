## PitchMirror Documentation

This folder contains the canonical documentation for **PitchMirror**, a multimodal pitch‑coaching web app powered by Amazon Nova.

The root `README.md` is the high‑level entry point to the repo. Use this `INDEX.md` as the landing page for all deeper documentation.

---

### Audience guide

- **Hackathon judges / reviewers**
  - Start with: `architecture.md`, `demo-and-submission.md`.
  - Optional: `frontend.md`, `backend.md` for extra technical context.
- **Collaborators / contributors**
  - Start with: `backend.md`, `frontend.md`, `api.md`, `deployment.md`, `testing.md`.
  - Refer to: `troubleshooting.md`, `status.md`, `dev-notes.md` for operational details.
- **Future maintainers**
  - Start with: `architecture.md`, then drill into `backend.md`, `worker` details in `backend.md`, and `deployment.md`.
  - Use `testing.md` and `troubleshooting.md` when validating or debugging changes.

---

### Table of contents

- **System overview**
  - `architecture.md` – End‑to‑end architecture across frontend, backend, AWS, and Nova.
  - `status.md` – High‑level project status and freeze information.

- **Application components**
  - `backend.md` – Backend design, job lifecycle, modes, and report behavior.
  - `frontend.md` – Frontend routes, studio UX, and report rendering.
  - `api.md` – HTTP API contracts and examples.

- **Infrastructure & operations**
  - `deployment.md` – AWS resources, configuration, and deployment notes.
  - `testing.md` – How to test the system, including smoke tests.
  - `SMOKE_TEST.md` – Detailed end‑to‑end manual verification script.
  - `troubleshooting.md` – Known failure modes and how to debug them.

- **Demo & meta**
  - `demo-and-submission.md` – 3‑minute demo flow, story, and submission prep.
  - `dev-notes.md` – Short developer notes and conventions.

All documentation here is written to reflect the **frozen backend**, **polished frontend**, and **submission‑prep** state of PitchMirror.


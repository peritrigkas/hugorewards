#!/usr/bin/env node
// Undoes build-client / apply-client-identity: restores capacitor.config.json
// and android/ to their committed (Hugo) state, deleting generated files.
// See developent-docs/white-label-progress.md Epic 3.
import { restoreBaseline, IDENTITY_PATHS } from "./lib/clientManifest.mjs";

restoreBaseline();
console.log(`Restored ${IDENTITY_PATHS.join(" and ")} to their committed state.`);

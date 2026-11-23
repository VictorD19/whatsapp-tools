# R8 published only in the isolated pilot — 23 November 2026

Release shared-20261123-r8, code5ba02dd, is now current in /opt/zapchat-instagram-lab. The owner explicitly authorized the evaluator reply window and Meta concordances. The separate evaluator tenant may manually respond using its own authorized assets until2026-12-07T23:59:00.000Z. Owner sending remains off; no account or history was moved to the evaluator.

## Deployment validation

- Before backup: instagram-20261123T162011Z.dump.aesgcm; temporary restore verified,2users.
- After backup: instagram-20261123T162135Z.dump.aesgcm; temporary restore verified,2users.
- Nine reviewer/isolation checks passed, including owner sending off, distinct tenants, reviewer sending enabled, no owner accounts and cross-tenant message denial.
- Five login-configuration checks passed, preserving the original Instagram config and new Page-aware Facebook config.
- Eleven HTTPS checks passed after publication. The reply-route test uses a nonexistent fixture conversation and cannot reach a transport.
- The six principal container IDs and start times were unchanged before/after. No principal service was rebuilt, restarted or migrated.
- Reviewer login was tested in the browser and showed an empty isolated account with own-asset connection buttons and the expiring manual reply notice.
- One read of me/accounts using the already-authorized token returned exactly the expected linked Page. No token, Page token or private text was printed.

R7 remains available for rollback. The new image was built locally from immutable code after107Instagram tests and10host/gateway tests. Its compiled policy passed with the network disabled. This publication did not send new messages.

## Meta remaining gate

The current permission descriptions and concordances were saved; the dedicated service-review login was entered in the private draft field only. The old instagram_basic authorization screencast remains visible. New real-flow video attachment is not confirmed. A native file picker for the embedded browser is inaccessible to automation and native Chrome did not confirm selection. Sender-unsend and local deletion on the two existing demonstration messages were specifically authorized and completed. Both stored texts are empty, deduplication identifiers remain, and the outgoing Instagram copy is preserved. The complete recording includes these actions and verified service login; it decodes without errors. The app review is not submitted and not yet ready for submission.

## Final safety receipt

After the authorized unsend/local deletion, backup instagram-20261123T164325Z.dump.aesgcm was encrypted and restored successfully with two users. The six main services still matched the publication baseline, owner sending remained disabled and the isolated reviewer deadline remained 7 December 23:59 UTC. The temporary administrative key was removed at 16:44:28 UTC, preserving other entries.

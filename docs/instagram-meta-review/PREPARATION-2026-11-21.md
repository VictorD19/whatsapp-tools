# Preparation — 21 November 2026

## Verified today

- Meta roles: agenciainstapush still Pending; joaobosco.pro accepted. Do not resend
  or remove invitations blindly. The owner reports mobile acceptance failed.
- One authorized read of the existing test message identified agenciainstapush
  as the exact historical sender. No new message was sent.
- Public pilot owner login/read-only metadata at 17:42:49 UTC: one connected
  account, zero conversations, no last inbound. No Meta call or Direct sent.
- Hosted release remains R4 / 56c7293. No server change, main CRM restart or
  new infrastructure purchase was made today. Temporary SSH remains removed.

## Prepared on the separate branch, not deployed

The API already requires a valid explicit tenant/account/recipient scope, checks
it again before transport and rechecks the current 24h window. The host now also
validates the explicit scope before enabling the gateway's reply route. Only
instagram-review can opt into this controlled owner demonstration. Missing scope,
wrong tenant, identical/malformed IDs or ambiguous flags refuse startup. Existing
sendEnabled:false remains disabled. The reviewer tenant remains outbound-disabled.

The gateway preserves authentication for the API's tenant/recipient/window checks;
it does not itself trust a client-supplied scope. Other API routes, sync, admin
and arbitrary upstreams remain blocked. The Dockerfile includes the policy helper.
Tests use local HTTP fixtures only, with no Meta calls or outgoing Directs.

Reviewer instructions and the recording plan were consolidated to remove obsolete
claims that hosting, cancellation handling or operator deletion were unimplemented.
The complete real-flow video and reviewer reproduction remain explicit blockers.

## Remaining sequence

1. Resolve acceptance/login for the invited sender. Further Directs before that
   are not useful; do not ask the owner for repeated messages.
2. Build the immutable isolated release with the new guards, prepare backup and
   rollback. A new authorized access window is required for server publication.
3. Demonstrate actual eligible inbound, specifically authorized controlled reply,
   sender unsend and operator deletion on the same hosted version.
4. Complete reviewer reproduction for the claimed reply capability; the owner's
   narrow scope is not a general reviewer solution.
5. Persist the full screencast under instagram_manage_messages, verify all form
   data/attachments and dedicated access, then obtain required final agreement
   and submission confirmation. Draft 1690021079384646 is not ready to send yet.

Historical publication/backup evidence:
[20 November R4](../INSTAGRAM-PILOT-R4-PUBLISHED-2026-11-20.md).

# Reviewer material — draft, not submitted

**16 November current state:** continuously hosted on the existing SistemaZapChat
server. The dedicated `meta-review@example.com` login belongs to the separate
`instagram-meta-review` tenant, has no owner connection or conversations and is
not a superadministrator. The owner's authorized connection is in another tenant.
Only the review login may be issued in the private review form when the package
is ready; no credential has been shared. Website, login, tenant separation and
the active Meta webhook endpoint were verified. Real Direct delivery, Advanced
Access and the complete real-flow video are still unproven/pending. Historical
states below are superseded regarding hosting and reviewer isolation. See
../INSTAGRAM-SHARED-SERVER-DEPLOYMENT-2026-11-16.md.

15 November update: the isolated Website is available at
https://instagram-review.sistemazapchat.com/login and its OAuth callback was
verified with the owner's account. The temporary owner connection was then removed
from this separate database. Dedicated credentials have not been shared. Continuous
hosting, reviewer webhook delivery and the complete real-flow video remain pending;
do not submit this draft as complete. See ../INSTAGRAM-REVIEW-EXTERNAL-2026-11-15.md.

## instagram_basic — use description

ZapChat Social Lab is an isolated pilot for an Instagram Direct inbox in
SistemaZapChat CRM. A business administrator authorizes one professional Instagram
account using Meta Unified Login. We use the account ID and username to identify
the authorized connection, show its connection status and associate conversations
with the correct account and tenant. This permission is required for the requested
instagram_manage_messages integration. The pilot does not request advertising,
content publishing, comment management, insights or Human Agent access.

## instagram_manage_messages — use description

The pilot uses this permission to display eligible received Direct conversations,
message text and participant/message identifiers with timestamps
in its Conversations interface. The business explicitly chooses its own account
through Meta authorization. Access tokens are encrypted before storage. Webhook
signatures and account/recipient identifiers are validated. Data is scoped to the
authenticated business. Standby conversations are read-only.

Advanced Access is requested for eligible interactions involving people without
app roles, as explained by Meta Support in case 2256928134873004. Production CRM
is not part of this pilot deployment. At this preparation stage real outbound
replies and AI replies are disabled, and real-user webhook delivery has not yet
been demonstrated. The old local laboratory's five-minute history reconciliation
is a temporary contingency, is not installed in the hosted reviewer and is not
presented as real-time webhook delivery. Manual history import and real replies
are blocked by the reviewer gateway; do not demonstrate those paths as available.

This description must be revised to match the completed, demonstrable feature
before submission. Sender-unsend handling has been implemented and verified with
fixtures, not a demonstrated real sender event. Do not claim real replies or
operator deletion through the inbox UI until those paths are implemented and verified.

## Reviewer access — separate URL/account prepared, credentials not issued

The service uses its own email/password login. Meta Unified Login connects an
Instagram account after signing into the CRM; it is not the CRM sign-in mechanism.
Select the corresponding non-Facebook service-login option in the reviewer form.

1. Open the separate, authenticated pilot Website URL supplied in the private
   reviewer-access fields: https://instagram-review.sistemazapchat.com/login.
   Confirm continuous availability before submission.
2. Sign in using the dedicated service-review account supplied in those fields.
   Its email is `meta-review@example.com`. Its password must only be supplied in
   the private review fields, not in this document. Do not use the owner's
   `instagram-review@example.com` login or its authorized Instagram connection.
3. Open Instagram, then Conexão. Choose the Instagram connection button.
4. Complete Meta Unified Login using your own eligible Meta account and select
   exactly one professional Instagram account and its business portfolio.
   No ad account or additional permission is needed for this submission.
5. After the callback confirms connection, return to the pilot and refresh the
   connection state. Verify that the selected account username is displayed.
6. Open Conversas. Only conversations associated with this connected test account
   and this tenant may be shown. No production or owner customer history is supplied.
7. Follow the accompanying screencast for the completed messaging paths. These
   steps will be finalized after the blockers in DEMONSTRATION.md are addressed.
8. For disconnection, use Desconectar in the Instagram connection interface.
   This disables the local connection and clears its stored token; it does not
   itself erase conversation history or revoke permission within Meta.
9. Data-removal instructions are available at
   https://sistemazapchat.com/data-deletion and the privacy contact at
   https://sistemazapchat.com/privacy.

No login URL or credential is fabricated in this draft. Do not submit placeholders,
localhost addresses or the production CRM as a substitute for the review Website.

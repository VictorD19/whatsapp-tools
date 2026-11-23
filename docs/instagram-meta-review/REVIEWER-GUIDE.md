**23 November update:** hosted release remains R6, with real replies disabled.
The sender tester has accepted; the21November eligible message was readable via
Graph but not delivered to the pilot. Meta has now advised including the linked
Facebook Page with pages_show_list in a separate system-user configuration. It
is created; R7 code/image are prepared but not deployed or reauthorized. Do not
submit this draft until the real flow and reviewer reproduction are verified.
See [current workaround preparation](../INSTAGRAM-META-PAGE-WORKAROUND-2026-11-23.md).
Earlier state descriptions below are historical where superseded.

# Reviewer material — draft, not submitted

Current preparation: 21 November 2026. This document describes the hosted R4
and explicitly separates pending work. It supersedes older reviewer instructions.

## instagram_basic — use description

ZapChat Social Lab is an isolated Instagram Direct inbox pilot for SistemaZapChat
CRM. A business administrator selects one professional Instagram account through
Meta Unified Login. We use the authorized account ID and username to display the
connection and associate conversations with the correct business. We request
instagram_basic, instagram_manage_messages and public_profile only. Advertising,
publishing, comments, insights and Human Agent access are outside this review.

## instagram_manage_messages — use description

The pilot implements a Direct inbox with conversation text, participant/message
identifiers and timestamps. Data belongs to the authenticated business. Access
tokens are encrypted at rest. Webhooks require a valid signature and matching
account/recipient identifiers; standby conversations remain read-only. Sender
unsend processing removes stored content and prevents replay from restoring it.
An operator can also delete message content through the inbox.

R4 is continuously hosted at https://instagram-review.sistemazapchat.com/instagram.
The deletion interface and OAuth return are deployed. Real replies are disabled.
Live receipt, reply and sender-unsend have not been demonstrated in the hosted
version. Synthetic fixtures and historical Graph reads are not live evidence.
The old local five-minute reconciliation is not installed in the hosted reviewer.
Do not submit this description as a completed messaging demonstration yet.

Advanced Access is requested for eligible interactions involving people without
app roles. Meta Support case 2256928134873004 explains that Standard Access tests
require an app role for the sender as well as the receiving account. The invited
sender remains pending. Neither production CRM nor its customers are used here.

## Reviewer access

The service has its own email/password login. Meta Unified Login subsequently
connects an Instagram account; it does not replace the service login.

1. Open https://instagram-review.sistemazapchat.com/login.
2. Use the dedicated service credentials in the private review fields. The login
   is meta-review@example.com, in tenant instagram-meta-review. No password has
   been supplied to Meta yet. Never supply the owner's service or Meta passwords.
3. Open Instagram → Conexão. Select the connection button and authorize your own
   eligible professional account through Meta Unified Login. Select exactly one
   Instagram account and its portfolio. No ad account is required.
4. A successful callback returns to /instagram#conexao. Confirm the displayed
   username. Pending authorization or errors do not count as successful connection.
5. Open Conversas. Only this business's connected account and conversations can
   be shown. The review tenant has no access to the owner's connection/history.
6. Message receipt/reply/unsend steps must be finalized against the completed
   screencast and the actual reviewer configuration before submission. The new
   controlled-owner reply preparation does not enable reviewer replies.
7. Operator deletion is available from a displayed message. Disconnection disables
   the local connection and clears its token; it does not erase all history or
   revoke authorization inside Meta.
8. Public instructions: https://sistemazapchat.com/data-deletion and
   https://sistemazapchat.com/privacy.

Five additional tabs are previews, not features claimed in this submission.
Confirm continuous access and matching form instructions before sending review.
See [current preparation](PREPARATION-2026-11-21.md),
[publication evidence](../INSTAGRAM-PILOT-R4-PUBLISHED-2026-11-20.md) and the
[official review guide](https://developers.facebook.com/documentation/business-messaging/instagram-messaging/app-review/apps-for-other-businesses).

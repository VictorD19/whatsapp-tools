# Reviewer material — draft, not submitted

## instagram_basic — use description

ZapChat Social Lab is an isolated pilot for an Instagram Direct inbox in
SistemaZapChat CRM. A business administrator authorizes one professional Instagram
account using Meta Unified Login. We use the account ID and username to identify
the authorized connection, show its connection status and associate conversations
with the correct account and tenant. This permission is required for the requested
instagram_manage_messages integration. The pilot does not request advertising,
content publishing, comment management, insights or Human Agent access.

## instagram_manage_messages — use description

The pilot uses this permission to retrieve eligible Direct conversations and
display received message text and participant/message identifiers with timestamps
in its Conversations interface. The business explicitly chooses its own account
through Meta authorization. Access tokens are encrypted before storage. Webhook
signatures and account/recipient identifiers are validated. Data is scoped to the
authenticated business. Standby conversations are read-only.

Advanced Access is requested for eligible interactions involving people without
app roles, as explained by Meta Support in case 2256928134873004. Production CRM
is not part of this pilot deployment. At this preparation stage real outbound
replies and AI replies are disabled, and real-user webhook delivery has not yet
been demonstrated. The five-minute history reconciliation is a temporary
contingency and is not presented as real-time webhook delivery.

This description must be revised to match the completed, demonstrable feature
before submission. In particular, do not claim sender-unsend handling, real reply
or deletion through the inbox UI until those paths are implemented and verified.

## Reviewer access — instructions prepared, URL/account not issued

The service uses its own email/password login. Meta Unified Login connects an
Instagram account after signing into the CRM; it is not the CRM sign-in mechanism.
Select the corresponding non-Facebook service-login option in the reviewer form.

1. Open the separate, authenticated pilot Website URL supplied in the private
   reviewer-access fields. This URL is pending deployment and verification.
2. Sign in using the dedicated service-review account supplied in those fields.
   These credentials must not be the owner's existing local pilot login.
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

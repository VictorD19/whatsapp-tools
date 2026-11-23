# Meta reviewer guide — current pilot, 23 November 2026

R8 is hosted at https://instagram-review.sistemazapchat.com/instagram. The reviewer tenant was verified by API and browser: its own login, no owner accounts/messages, no superadministrator, own-asset connection controls. Manual replies are enabled only for that tenant until **7 December 2026, 23:59 UTC**. Owner sending is disabled. The draft is ready for the owner’s final submission decision: Meta enabled Enviar para análise after all permitted-use forms were completed. It has not been submitted.

## Service sign-in and business authorization

1. Open https://instagram-review.sistemazapchat.com/login. Use the dedicated service credentials in the private Meta access field. Do not use or request the owner’s Facebook/Instagram credentials.
2. Open Instagram → Conexão → Continuar com Facebook.
3. Use your own Facebook account. Select your professional Instagram account and its linked Facebook Page. Confirm profile/Direct and Page-list permissions, then Concluir.
4. The callback returns automatically to the connection panel. Confirm the selected Instagram username and open Conversas.
5. From a second Instagram account, send a Direct to your connected professional account. The server receives signed webhooks independently of the browser; the inbox refreshes every three seconds. No history import is enabled.
6. Select the sender, enter a manual reply in Sua resposta and click Enviar resposta within 24 hours of the latest inbound message. Standby conversations are read-only. The service rechecks tenant/account/conversation ownership, token, window and deadline before transport; retries use request IDs to avoid duplicate sending.
7. To test sender unsend handling, cancel the incoming message in the sending Instagram account. The CRM redacts its content and retains a deduplication marker.
8. To test local deletion, click Excluir do CRM on a message and confirm after reviewing. This erases local content, not the Instagram original. Pending/uncertain outbound messages cannot be erased before reconciliation.
9. The tabs marked Prévia — automations, AI, menus, results and test lab — are outside this permission request. No AI replies, history import, advertising, posting, comments, insights or Human Agent scope is claimed.

Meta’s official guide states that reviewers use their own Facebook accounts and do not need app roles: https://developers.facebook.com/documentation/business-messaging/instagram-messaging/app-review/apps-for-other-businesses . The same guide requires receive/reply/delete/unsend demonstration. The authorized demonstration of both actions was completed on 23 November using the same two existing messages.

## Permission uses

- instagram_basic: read and display the ID/username of the explicitly selected professional account and associate that connection with the signed-in CRM business.
- instagram_manage_messages: receive subscribed signed Direct webhooks, show conversations, reply manually inside 24 hours and process unsends/local deletion. Tokens are encrypted at rest; messages are isolated by tenant.
- pages_show_list: let the administrator select and confirm the linked Facebook Page during Facebook Login for Business. The linked Page asset resolves real delivery for the pilot, following support case2256928134873004.
- public_profile: standard Facebook profile permission retained in the Meta configuration/review. The additional advertising, publishing and comment review requests introduced by the Tech Provider conversion were removed from the draft.

## Verified evidence and submission state

A real authorized Direct arrived through messaging at 13:12 UTC on23November; its manual reply was confirmed by Meta and visible in Instagram at13:15UTC. Owner-to-owner demonstration sends were disabled afterwards. Eleven public checks and nine tenant-isolation checks passed after R8 publication. Backups before and after were restored with two users recovered; the six principal services retained IDs and start times.

Concordances and current descriptions are saved in Meta. The complete 99-second recording is persisted in instagram_manage_messages (video3186709034993456) and pages_show_list (final video1592441405985027). The final Page upload was saved, reopened and played in Meta: the service-login section and final sender-unsend/local-deletion section match the local final recording. instagram_basic retains its previous authorization screencast, accepted by the completed form. All four permission forms show Editar.

The dedicated service-review credential was entered only in the private Meta draft field after the owner authorized reviewer access. No personal Meta password or owner service credential was shared. The draft was reopened and the dedicated service credential was confirmed persisted without printing it.

Sender cancellation and local deletion were specifically authorized and completed. Read-only database verification confirmed both texts empty with provider/deduplication identifiers retained; the reply remained visible in Instagram. No additional Direct was sent or requested. Final submission remains a separate action and has not occurred.

Policies: https://sistemazapchat.com/privacy · https://sistemazapchat.com/data-deletion .

## Complete recording

Local artifact: output/instagram-meta-review-20261123/zapchat-instagram-meta-review-final-20261123.mp4. It includes verified service login, Page/Instagram authorization, real receive/reply, actual unsend and local deletion. Real captures were edited into sections with English captions; authorization was re-recorded after the original receive/reply, as disclosed. Password text and unrelated contact lists are masked. The complete local MP4 decoded without errors and the saved Meta video was checked directly.

## Final pre-submission confirmation

The dedicated service credential, business authorization instructions, 7 December 23:59 UTC manual-reply deadline and public policy URLs remain present in the private Meta draft. The live reviewer login URL returned HTTP200. Meta enabled Enviar para análise; it was not clicked. No server access, CRM principal change or new Direct was needed for this final attachment/form review. The administrative key remains revoked. The evaluator window must be reconsidered if review happens after its expiry; do not silently extend access.

# Meta reviewer guide — current pilot, 23 November 2026

R8 is hosted at https://instagram-review.sistemazapchat.com/instagram. The reviewer tenant was verified by API and browser: its own login, no owner accounts/messages, no superadministrator, own-asset connection controls. Manual replies are enabled only for that tenant until **7 December 2026, 23:59 UTC**. Owner sending is disabled. The draft remains unsubmitted while the final complete video attachment remains unverified.

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

## Verified evidence and remaining gate

A real authorized Direct arrived through messaging at 13:12 UTC on23November; its manual reply was confirmed by Meta and visible in Instagram at13:15UTC. Owner-to-owner demonstration sends were disabled afterwards. Eleven public checks and nine tenant-isolation checks passed after R8 publication. Backups before and after were restored with two users recovered; the six principal services retained IDs and start times.

Concordances and current descriptions were saved in Meta after explicit authorization. The old instagram_basic authorization clip is visible as a saved screencast. **The new real-flow video has not yet been verified as a persisted attachment.** The documented IAB file chooser did not open; access to the native picker belonging to the Codex app is disallowed. Native Chrome automation also did not confirm file selection. Do not report a successful upload based on a click or populated filename alone.

The dedicated service-review credential was entered only in the private Meta draft field after the owner authorized reviewer access. No personal Meta password or owner service credential was shared. The draft was reopened and the dedicated service credential was confirmed persisted without printing it.

Sender cancellation and local deletion were specifically authorized and completed. Read-only database verification confirmed both texts empty with provider/deduplication identifiers retained; the reply remained visible in Instagram. No additional Direct was sent or requested. Final submission remains a separate action and has not occurred.

Policies: https://sistemazapchat.com/privacy · https://sistemazapchat.com/data-deletion .

## Complete recording

Local artifact: output/instagram-meta-review-20261123/zapchat-instagram-meta-review-final-20261123.mp4. It includes verified service login, Page/Instagram authorization, real receive/reply, actual unsend and local deletion. Real captures were edited into sections with explanatory English captions; the authorization was re-recorded after the original receive/reply and this is disclosed. Password text and unrelated contact lists are masked. The full MP4 decoded without errors. Prepared is not the same as attached: confirm persistence in pages_show_list and instagram_manage_messages, and replace the older instagram_basic authorization-only clip with this complete recording. Do not submit the draft.

**Enviada à Meta em23/11/2026 após autorização final. Recebimento confirmado pelo status “Análise em andamento”**, pedido1690021079384646, aplicativo1684815669905187. Permissões: instagram_basic, pages_show_list, instagram_manage_messages e public_profile. Meta informa que a maioria é analisada em até20dias, sujeito a pendências. Nenhuma aprovação avançada foi concedida por este status. Piloto permanece isolado; CRM principal sem alteração. O acesso de resposta do avaliador mantém a expiração autorizada em07/12/2026às23:59UTC e deverá ser reavaliado se a análise ultrapassar esse prazo.

Os estados anteriores abaixo preservam a preparação antes do envio.

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

## Meta draft ready, not submitted

The owner completed the final recording uploads. The complete 99-second screencast is persisted in instagram_manage_messages and pages_show_list; the final Page recording was saved, reopened and visually checked at service login and the final cancellation/local-deletion section. instagram_basic retains its accepted authorization clip. All four permitted-use forms are complete, reviewer credentials/instructions are saved and Meta enabled Enviar para análise. No submission was made. The isolated reviewer window still ends7December2026 at23:59UTC.

## Final safety receipt

After the authorized unsend/local deletion, backup instagram-20261123T164325Z.dump.aesgcm was encrypted and restored successfully with two users. The six main services still matched the publication baseline, owner sending remained disabled and the isolated reviewer deadline remained 7 December 23:59 UTC. The temporary administrative key was removed at 16:44:28 UTC, preserving other entries.

// Opt-in for the owner's controlled demonstration, never a general send switch.
function controlledReplyEnvironment(meta) {
  if (meta?.sendEnabled === false) {
    if (meta.controlledReplyScope != null) throw Error('Remove inactive reply scope')
    return { INSTAGRAM_SEND_ENABLED: 'false' }
  }
  const scope = meta?.controlledReplyScope
  if (meta?.sendEnabled !== true || !scope || Array.isArray(scope) ||
      Object.keys(scope).sort().join(',') !== 'instagramId,participantId,tenantId' ||
      scope.tenantId !== 'instagram-review' ||
      typeof scope.instagramId !== 'string' || !/^\d{1,40}$/.test(scope.instagramId) ||
      typeof scope.participantId !== 'string' || !/^\d{1,40}$/.test(scope.participantId) ||
      scope.instagramId === scope.participantId) throw Error('Invalid controlled reply scope')
  return { INSTAGRAM_SEND_ENABLED: 'true', INSTAGRAM_CONTROLLED_REPLY_SCOPE: JSON.stringify(scope) }
}
module.exports = { controlledReplyEnvironment }

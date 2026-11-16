"use strict";

// Keep the desktop's existing compaction boundaries, including > vs >=.
function needsCurrentModel(from, to, tokens) {
  return Boolean(from && ((from.comp_hash && to.comp_hash && from.comp_hash !== to.comp_hash)
    || (from.context_window > to.context_window && tokens !== null && (tokens > (to.auto_compact_token_limit ?? Infinity) || tokens >= to.context_window))));
}

module.exports = { needsCurrentModel };

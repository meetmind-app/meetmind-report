/* LOREVI duration display contract v1.1
 * Report duration is minute-based and rounds any positive partial minute up.
 * Examples: 11s -> 1 min, 60s -> 1 min, 61s -> 2 min.
 */
(function installDurationV11(global) {
  'use strict';

  global.durationLabel = function durationLabelV11(seconds) {
    const s = Number(seconds);
    if (!Number.isFinite(s) || s <= 0) return '';
    const minutes = Math.ceil(s / 60);
    return `${minutes} ${MINUTE_SHORT[currentLang] || MINUTE_SHORT.en}`;
  };
})(window);

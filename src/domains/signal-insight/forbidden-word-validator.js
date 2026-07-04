// forbidden-word-validator.js — BD-038 machine-enforced forbidden word checker.
// BD-038: ALL AI outputs must pass this validator before being returned.
//         Any violation → throw ForbiddenWordError (output blocked).
// BD-031: Applies to all rule-based AI outputs (no LLM bypass possible).
// PR-057: Signal Insight Service

import { FORBIDDEN_WORDS, MEDICAL_ADVICE_DISCLAIMER } from './signal-insight-types.js';

/**
 * Error thrown when a forbidden word is detected in an AI output.
 * Catching this error and returning the output anyway is a BD-038 violation.
 */
export class ForbiddenWordError extends Error {
  /**
   * @param {string} word  — the matched pattern
   * @param {string} text  — the offending output text
   */
  constructor(word, text) {
    super(
      `[ForbiddenWordValidator] BD-038 violation: forbidden pattern "${word}" detected. ` +
      `Output blocked. Text: "${text.slice(0, 80)}${text.length > 80 ? '…' : ''}"`
    );
    this.name       = 'ForbiddenWordError';
    this.word       = word;
    this.outputText = text;
  }
}

/**
 * Validate that `text` contains no forbidden words/phrases (BD-038).
 * Also asserts that isMedicalAdvice is explicitly false.
 *
 * @param {string}  text            — the output text to validate
 * @param {boolean} isMedicalAdvice — must be exactly false
 * @throws {ForbiddenWordError}    if any forbidden pattern is matched
 * @throws {Error}                  if isMedicalAdvice !== false
 */
export function validateOutput(text, isMedicalAdvice) {
  if (isMedicalAdvice !== false) {
    throw new Error(
      '[ForbiddenWordValidator] BD-038 violation: isMedicalAdvice must be false. ' +
      `Got: ${JSON.stringify(isMedicalAdvice)}`
    );
  }

  if (typeof text !== 'string') {
    throw new Error('[ForbiddenWordValidator] text must be a string');
  }

  for (const pattern of FORBIDDEN_WORDS) {
    // Patterns may contain '.*' for simple wildcard matching
    const regex = new RegExp(pattern);
    if (regex.test(text)) {
      throw new ForbiddenWordError(pattern, text);
    }
  }
}

/**
 * Check whether text contains the required medical disclaimer (BD-038).
 * This is a soft check for internal auditing — use validateOutput for hard blocking.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function hasDisclaimer(text) {
  return typeof text === 'string' && text.includes(MEDICAL_ADVICE_DISCLAIMER);
}

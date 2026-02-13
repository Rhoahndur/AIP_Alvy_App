import { AlgorithmicMatchingEngine } from './matching-engine';

export { AlgorithmicMatchingEngine } from './matching-engine';
export { exactMatch } from './exact-matcher';
export { fuzzyMatch } from './fuzzy-matcher';
export { numericMatch } from './numeric-matcher';
export { levenshteinDistance } from './levenshtein';

const defaultEngine = new AlgorithmicMatchingEngine();
export default defaultEngine;

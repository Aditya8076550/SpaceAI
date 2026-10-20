import { runPipelineTestSuite } from './src/utils/pipelineTests';

console.log('--- EXECUTING TERRASENTINEL AI PIPELINE TEST SUITE ---');
const results = runPipelineTestSuite();
let allPassed = true;

results.forEach((r, idx) => {
  console.log(`\n[${idx + 1}/5] ${r.id}: ${r.name}`);
  console.log(`     Input:     ${r.inputSpecification}`);
  console.log(`     Expected:  ${r.expectedOutput}`);
  console.log(`     Measured:  ${r.measuredOutput}`);
  console.log(`     Status:    ${r.passed ? 'PASSED (✓)' : 'FAILED (✗)'} in ${r.executionTimeMs}ms`);
  console.log(`     Trace:     ${r.scientificTrace}`);
  if (!r.passed) allPassed = false;
});

console.log('\n------------------------------------------------------');
console.log(`FINAL RESULT: ${allPassed ? 'ALL TESTS PASSED (5/5)' : 'SOME TESTS FAILED'}`);
process.exit(allPassed ? 0 : 1);

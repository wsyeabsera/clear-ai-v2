import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function analyzeScenario(scenarioDir) {
  const metricsPath = path.join(scenarioDir, 'metrics.json');
  const executionPath = path.join(scenarioDir, 'execution.json');
  const planPath = path.join(scenarioDir, 'plan.json');
  
  if (!fs.existsSync(metricsPath)) return null;
  
  const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
  const execution = JSON.parse(fs.readFileSync(executionPath, 'utf8'));
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  
  // Check for step reference errors
  const hasStepRefError = execution.data?.executeTools?.results?.some(r => 
    r.error?.message?.includes('Invalid step reference')
  ) || false;
  
  return {
    scenario: metrics.scenario,
    successRate: parseInt(metrics.successRate),
    totalSteps: metrics.totalSteps,
    successfulSteps: metrics.successfulSteps,
    failedSteps: metrics.failedSteps,
    durationMs: metrics.totalDurationMs,
    hasStepRefError,
    planSteps: plan.data?.planQuery?.plan?.steps?.length || 0
  };
}

const resultsDir = 'benchmark-results';
const scenarios = [];

for (let i = 1; i <= 10; i++) {
  const scenarioNum = String(i).padStart(2, '0');
  const scenarioDirs = fs.readdirSync(resultsDir).filter(d => 
    d.startsWith(`scenario-${scenarioNum}`)
  );
  
  if (scenarioDirs.length > 0) {
    const result = analyzeScenario(path.join(resultsDir, scenarioDirs[0]));
    if (result) scenarios.push(result);
  }
}

// Generate report
console.log('# P0 Intelligence Upgrade Benchmark Results\n');
console.log('## Overall Performance\n');

const totalSuccess = scenarios.reduce((sum, s) => sum + s.successRate, 0);
const avgSuccess = (totalSuccess / scenarios.length).toFixed(1);
const stepRefErrors = scenarios.filter(s => s.hasStepRefError).length;

console.log(`- **Overall Success Rate**: ${avgSuccess}%`);
console.log(`- **Target**: 95%+`);
console.log(`- **Status**: ${parseFloat(avgSuccess) >= 95 ? '✅ TARGET MET' : '⚠️ BELOW TARGET'}`);
console.log(`- **Step Reference Errors**: ${stepRefErrors}/10 scenarios`);
console.log(`- **Total Scenarios**: ${scenarios.length}/10\n`);

console.log('## Scenario Results\n');
console.log('| # | Scenario | Success Rate | Steps | Duration | Step Ref Errors |');
console.log('|---|----------|--------------|-------|----------|-----------------|');

scenarios.forEach((s, i) => {
  const num = i + 1;
  const status = s.successRate === 100 ? '✅' : s.successRate >= 75 ? '⚠️' : '❌';
  const refError = s.hasStepRefError ? '❌' : '✅';
  console.log(`| ${num} | ${s.scenario} | ${status} ${s.successRate}% | ${s.successfulSteps}/${s.totalSteps} | ${s.durationMs}ms | ${refError} |`);
});

console.log('\n## Key Improvements\n');
console.log('### Step Reference Resolution');
console.log(`- Scenarios with step reference errors: ${stepRefErrors}/10`);
console.log(`- Expected: 0/10 (100% elimination)`);
console.log(`- Status: ${stepRefErrors === 0 ? '✅ SUCCESS' : '❌ NEEDS ATTENTION'}\n`);

console.log('### Plan Quality');
const highSuccess = scenarios.filter(s => s.successRate >= 90).length;
console.log(`- Scenarios with 90%+ success: ${highSuccess}/10`);
console.log(`- Expected: 10/10`);
console.log(`- Status: ${highSuccess === 10 ? '✅ SUCCESS' : '⚠️ PARTIAL'}\n`);

console.log('### Performance');
const avgDuration = (scenarios.reduce((sum, s) => sum + s.durationMs, 0) / scenarios.length).toFixed(0);
console.log(`- Average execution time: ${avgDuration}ms`);
console.log(`- Expected: < 100ms per scenario`);
console.log(`- Status: ${parseFloat(avgDuration) < 100 ? '✅ EXCELLENT' : '⚠️ ACCEPTABLE'}\n`);

// Detailed failures
const failures = scenarios.filter(s => s.successRate < 100);
if (failures.length > 0) {
  console.log('## Scenarios Requiring Attention\n');
  failures.forEach(f => {
    console.log(`### ${f.scenario}`);
    console.log(`- Success Rate: ${f.successRate}%`);
    console.log(`- Failed Steps: ${f.failedSteps}/${f.totalSteps}`);
    console.log(`- Step Reference Errors: ${f.hasStepRefError ? 'YES' : 'NO'}`);
    console.log('');
  });
}

console.log('## Conclusion\n');
if (parseFloat(avgSuccess) >= 95 && stepRefErrors === 0) {
  console.log('✅ **P0 Intelligence Upgrade SUCCESSFUL**');
  console.log('- Achieved 95%+ success rate target');
  console.log('- Eliminated step reference errors');
  console.log('- Ready for production deployment');
} else {
  console.log('⚠️ **P0 Intelligence Upgrade NEEDS REVIEW**');
  if (parseFloat(avgSuccess) < 95) {
    console.log(`- Success rate ${avgSuccess}% below 95% target`);
  }
  if (stepRefErrors > 0) {
    console.log(`- ${stepRefErrors} scenarios still have step reference errors`);
  }
  console.log('- Review failed scenarios and adjust implementation');
}

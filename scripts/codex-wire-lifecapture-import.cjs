const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'server.js');
let s = fs.readFileSync(p, 'utf8');
if (!s.includes('./src/project200-life-captures.js')) {
  s = s.replace(
    'import { completeProject200Onboarding, ensureProject200OnboardingSchema, getProject200Onboarding, initializeProject200Onboarding, markProject200OnboardingAvatarComplete, restartProject200Onboarding, saveProject200OnboardingProgress } from "./src/project200-onboarding.js";\n',
    'import { completeProject200Onboarding, ensureProject200OnboardingSchema, getProject200Onboarding, initializeProject200Onboarding, markProject200OnboardingAvatarComplete, restartProject200Onboarding, saveProject200OnboardingProgress } from "./src/project200-onboarding.js";\nimport { listProject200LifeCaptures, patchProject200LifeCapture, upsertProject200LifeCapture } from "./src/project200-life-captures.js";\n'
  );
}
fs.writeFileSync(p, s, 'utf8');
console.log('import wired');

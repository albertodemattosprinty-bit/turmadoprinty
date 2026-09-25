import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicProjectPath = new URL("../public/200/project.js", import.meta.url);
const mobileProjectPath = new URL("../mobile-200/www/200/project.js", import.meta.url);
const publicIndexPath = new URL("../public/200/index.html", import.meta.url);
const mobileIndexPath = new URL("../mobile-200/www/200/index.html", import.meta.url);

test("keeps financial goals inside the entry category selector on web and Android", async () => {
  const [publicProject, mobileProject, publicIndex, mobileIndex] = await Promise.all([
    readFile(publicProjectPath, "utf8"),
    readFile(mobileProjectPath, "utf8"),
    readFile(publicIndexPath, "utf8"),
    readFile(mobileIndexPath, "utf8"),
  ]);

  assert.equal(mobileProject, publicProject);
  assert.equal(mobileIndex, publicIndex);
  assert.doesNotMatch(publicIndex, /id="ilifeFinanceGoalSelect(?:Wrap)?"/);
  assert.match(publicProject, /<optgroup label="Metas financeiras">/);
  assert.match(publicProject, /\.filter\(\(goal\) => goal\?\.status === "ACTIVE"\)/);
  assert.match(publicProject, /category: financialGoal \? normalizeIlifeFinanceName\(financialGoal\.name/);
  assert.match(publicProject, /financialGoalId,/);
});

test("locks a goal selected from Missions or the Finance overview", async () => {
  const project = await readFile(publicProjectPath, "utf8");

  assert.match(project, /select\.disabled = Boolean\(state\.ilifeFinance\.depositGoalId\)/);
  assert.match(project, /openIlifeFinanceGoalDeposit\(goal\?\.financialGoal\)/);
  assert.match(project, /if \(!financialGoal \|\| financialGoal\.status !== "ACTIVE"\) return;/);
  assert.match(project, /data-ilife-finance-goal-deposit/);
  assert.match(project, /if \(goal\?\.status === "ACTIVE"\) openIlifeFinanceGoalDeposit\(goal\)/);
  assert.match(project, /if \(goal\?\.status !== "ACTIVE"\) return;/);
});

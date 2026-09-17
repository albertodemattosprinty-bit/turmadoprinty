// Shared by the goal preview and the API: all allocations are integer cents.
export function buildGradualFinancialGoalSchedule({ startOn, targetOn, targetAmountCents, initialDepositCents }) {
  const start = new Date(`${startOn}T00:00:00Z`);
  const days = Math.round((new Date(`${targetOn}T00:00:00Z`) - start) / 86400000);
  const total = Number(targetAmountCents);
  const initial = Number(initialDepositCents);
  if (!Number.isInteger(days) || days < 1 || days > 10958) throw new Error("Prazo inválido.");
  if (!Number.isSafeInteger(total) || total <= 0 || !Number.isSafeInteger(initial) || initial < 0 || initial > total) {
    throw new Error("O depósito de hoje deve ficar entre zero e o valor da meta.");
  }
  const remaining = total - initial;
  // If today's contribution exceeds the daily average, start the remaining
  // ramp at zero so even small goals can keep today's chosen contribution.
  const firstFuture = remaining >= initial * days ? initial : 0;
  const lastFuture = days === 1 ? remaining : (2 * remaining / days) - firstFuture;
  const values = Array.from({ length: days }, (_, index) => days === 1 ? remaining : Math.floor(firstFuture + (lastFuture - firstFuture) * index / (days - 1)));
  let remainder = remaining - values.reduce((sum, value) => sum + value, 0);
  for (let index = days - 1; index >= 0 && remainder > 0; index -= 1, remainder -= 1) values[index] += 1;
  return Array.from({ length: days + 1 }, (_, index) => {
    const amountCents = index === 0 ? initial : values[index - 1];
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    return { index: index + 1, label: `Dia ${index + 1}`, until: date.toISOString().slice(0, 10), amountCents };
  });
}

export const subscriptionPlans = [
  {
    id: "gratis",
    name: "Gratis",
    unitAmount: 0,
    intervalUnit: "MONTH",
    intervalLength: 1,
    billingCycles: 1
  },
  {
    id: "plus",
    name: "Plus",
    unitAmount: 990,
    intervalUnit: "MONTH",
    intervalLength: 1,
    billingCycles: 12
  },
  {
    id: "pro",
    name: "Pro",
    unitAmount: 1990,
    intervalUnit: "MONTH",
    intervalLength: 1,
    billingCycles: 12
  },
  {
    id: "life",
    name: "Life",
    unitAmount: 2990,
    intervalUnit: "MONTH",
    intervalLength: 1,
    billingCycles: 12
  }
];

export function findSubscriptionPlanById(planId) {
  return subscriptionPlans.find((plan) => plan.id === planId) || null;
}

export function buildSubscriptionPlans(planPrices = {}) {
  return subscriptionPlans.map((plan) => ({
    ...plan,
    unitAmount: Number(planPrices[plan.id]) >= 0 ? Number(planPrices[plan.id]) : plan.unitAmount
  }));
}

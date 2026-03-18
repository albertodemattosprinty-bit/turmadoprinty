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
    unitAmount: 200,
    intervalUnit: "MONTH",
    intervalLength: 1,
    billingCycles: 12
  },
  {
    id: "pro",
    name: "Pro",
    unitAmount: 300,
    intervalUnit: "MONTH",
    intervalLength: 1,
    billingCycles: 12
  },
  {
    id: "life",
    name: "Life",
    unitAmount: 400,
    intervalUnit: "MONTH",
    intervalLength: 1,
    billingCycles: 12
  }
];

export function findSubscriptionPlanById(planId) {
  return subscriptionPlans.find((plan) => plan.id === planId) || null;
}

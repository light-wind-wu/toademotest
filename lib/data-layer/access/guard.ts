import { err, ok, type Result } from "../types";
import { isAuthenticated, type MaybeActor } from "./actor";
import { POLICY, type Action, type Policy, type Rule } from "./permissions";

/**
 * The enforcement point. Repositories ask `authorize()` before every operation;
 * UI code can ask `can()` to show/hide controls. Both read the same {@link POLICY}
 * so there is exactly one source of truth.
 */

function actionMatches(rule: Rule, action: Action): boolean {
  return rule.actions === "*" || rule.actions.includes(action);
}

function resourceMatches(rule: Rule, resource: string): boolean {
  return rule.resource === "*" || rule.resource === resource;
}

/**
 * Does `actor` have *any* rule granting `action` on `resource`? When `record` is
 * provided, row-level `where` predicates are honoured. Deny-by-default: returns
 * false for the anonymous caller and for anyone without a matching rule.
 */
export function can(
  actor: MaybeActor,
  action: Action,
  resource: string,
  record?: unknown,
  policy: Policy = POLICY,
): boolean {
  if (!isAuthenticated(actor)) return false;
  const rules = policy[actor.role];
  if (!rules) return false;

  return rules.some((rule) => {
    if (!resourceMatches(rule, resource) || !actionMatches(rule, action)) return false;
    // `create` has no record to test; `list` is filtered per-row elsewhere.
    if (action === "create" || action === "list") return true;
    if (rule.where && record !== undefined) return rule.where(actor, record);
    return true;
  });
}

/**
 * Result-returning form of {@link can}, for repositories. Returns a `forbidden`
 * error (never throws) when denied, so denial flows through the same Result
 * channel as every other failure.
 */
export function authorize(
  actor: MaybeActor,
  action: Action,
  resource: string,
  record?: unknown,
  policy: Policy = POLICY,
): Result<void> {
  if (can(actor, action, resource, record, policy)) return ok(undefined);
  const who = isAuthenticated(actor) ? `role '${actor.role}'` : "an unauthenticated caller";
  return err(
    "forbidden",
    `Access denied: ${who} may not ${action} '${resource}'.`,
  );
}

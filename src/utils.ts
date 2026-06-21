export function getResultClass(result: string) {
  if (result === "Pass") return "badge badge-pass";
  if (result === "Fail") return "badge badge-fail";
  if (result === "Adjusted") return "badge badge-adjusted";
  return "badge";
}

export function displayValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "Not recorded";
}

export function formatRulesSourceLabel(
  rulesSource: "prototype" | "official"
) {
  return rulesSource === "official" ? "Official Oakrange rules" : "Prototype / demo rules";
}

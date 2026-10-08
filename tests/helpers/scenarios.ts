/** Related checks share one contract test, without hiding failures or skipping
 * later scenarios when one fails. No nested tests inflate the reported count. */
export async function scenarios(cases: { name: string; run: () => unknown }[]) {
  const failures: Error[] = [];
  for (const scenario of cases) {
    try {
      await scenario.run();
    } catch (cause) {
      failures.push(
        new Error(
          `${scenario.name}: ${cause instanceof Error ? cause.message : String(cause)}`,
          { cause },
        ),
      );
    }
  }
  if (failures.length)
    throw new AggregateError(
      failures,
      failures.map((e) => e.message).join("\n\n"),
    );
}

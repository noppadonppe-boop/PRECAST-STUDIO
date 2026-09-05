// Retain artifact snapshots/history; invalidate the project's dependent gate states.
export function invalidateDownstream(afterGate: number, reason: string) {
  const update: Record<string, string> = { downstreamState: 'outOfDate', downstreamReason: reason };
  for (let gate = afterGate + 1; gate <= 7; gate += 1) update[`gateStates.G${gate}`] = 'outOfDate';
  return update;
}

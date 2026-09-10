export function HumanApproval() {
  return (
    <section aria-label="Human approval required" className="approval-panel" role="dialog">
      <span aria-hidden="true">⌁</span>
      <div><h3>Human approval required</h3><p>The selected quote is outside the configured simulation budget. No payment state can begin until policy changes.</p></div>
    </section>
  );
}

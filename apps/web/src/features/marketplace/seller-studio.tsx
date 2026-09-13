"use client";

import { useState } from "react";
import { Button } from "@blockterms/ui";

export function SellerStudio() {
  const [providerType, setProviderType] = useState("human");
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [credentialKind, setCredentialKind] = useState("organization");
  const [exported, setExported] = useState(false);

  function exportDraft() {
    const manifest = {
      state: "draft",
      provider: { type: providerType },
      manifest: {
        name,
        verificationProfile: "graph-eip1186-v1",
        access: {
          visibility,
          requiredCredentials: visibility === "credential-gated" ? [{ kind: credentialKind }] : [],
        },
      },
      evidence: "not-published",
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "blockterms-product-draft.json"; anchor.click(); URL.revokeObjectURL(url); setExported(true);
  }

  return (
    <section className="seller-studio">
      <div className="seller-form">
        <label>Provider type<select aria-label="Provider type" value={providerType} onChange={(event) => setProviderType(event.target.value)}><option value="human">Human</option><option value="agent">Agent</option><option value="organization">Organization</option></select></label>
        <label>Product name<input aria-label="Product name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Same-block treasury snapshot" /></label>
        <label>Buyer access<select aria-label="Buyer access" value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="public">Public catalog</option><option value="credential-gated">Credential-gated private</option></select></label>
        {visibility === "credential-gated" ? <label>Required credential<select aria-label="Required credential" value={credentialKind} onChange={(event) => setCredentialKind(event.target.value)}><option value="organization">Organization / KYB</option><option value="zk-tls">zkTLS access claim</option><option value="wallet-control">Wallet control</option><option value="custom">Custom verifier</option></select></label> : null}
        <label>Verification profile<input readOnly value="graph-eip1186-v1" /></label>
        <label>Publication state<input readOnly value="Draft — curator review required" /></label>
        <Button disabled={name.trim().length < 3} onClick={exportDraft}>Export draft manifest</Button>
        {exported ? <p role="status">Draft exported. No listing was published.</p> : null}
      </div>
      <ol className="publication-gates">
        <li><span>01</span><div><h2>Schema validation</h2><p>Strict manifest, supported data shape, bounded fields and no secret-bearing keys.</p></div></li>
        <li><span>02</span><div><h2>Sandbox delivery</h2><p>The delivered sample must match the committed digest and executable proof profile.</p></div></li>
        <li><span>03</span><div><h2>Collateral coverage</h2><p>Advertised warranty must be covered before an active listing can receive orders.</p></div></li>
        <li><span>04</span><div><h2>Curator decision</h2><p>A credential can support eligibility; it does not prove the data is correct.</p></div></li>
      </ol>
    </section>
  );
}

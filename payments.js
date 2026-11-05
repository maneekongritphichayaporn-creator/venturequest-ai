(() => {
  const captureKey = "vq-seen-captures";
  const seen = new Set(JSON.parse(localStorage.getItem(captureKey) || "[]"));
  const events = new EventSource("/api/events");

  events.onmessage = event => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === "community_signal") {
        if (seen.has(message.captureId)) return;
        seen.add(message.captureId);
        while (seen.size > 500) seen.delete(seen.values().next().value);
        localStorage.setItem(captureKey, JSON.stringify(Array.from(seen)));
        projects = projects.map(project => project.id === message.projectId
          ? { ...project, raised: Number(project.raised || 0) + Number(message.amount || 0), backers: Number(project.backers || 0) + 1 }
          : project);
        save();
        render();
        const venture = projects.find(project => project.id === message.projectId);
        const nextExperiment = venture?.firstExperiment ? ` AI next test: ${venture.firstExperiment}` : "";
        toast(`PayPal Sandbox confirmed — ${venture?.name || "venture"} signal updated.${nextExperiment}`);
      } else if ((message.type === "sandbox_payout" || message.type === "payout_status")) {
        toast("Sandbox game award queued: " + message.status);
      }
    } catch (error) {
      console.warn("VentureQuest event could not be processed.", error);
    }
  };

  async function addPayoutButton() {
    const actions = document.querySelector("#pitch-support")?.parentElement;
    if (!actions) return;
    let button = document.querySelector("#sandbox-payout");
    if (!button) {
      button = document.createElement("button");
      button.id = "sandbox-payout";
      button.className = "btn light";
      button.textContent = "Send $1 Sandbox game award";
      actions.append(button);
      button.onclick = async () => {
        if (!selectedProject) return;
        button.disabled = true;
        button.textContent = "Sending Sandbox award…";
        try {
          const response = await fetch("/api/paypal/payout", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ projectId: selectedProject.id, scenario: "90-day market simulation" })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Payout was not created.");
          toast("Sandbox award queued: " + data.status);
        } catch (error) {
          toast(error.message || "Payout failed.");
        } finally {
          button.disabled = false;
          button.textContent = "Send $1 Sandbox game award";
        }
      };
    }
    try {
      const response = await fetch("/api/config");
      const config = await response.json();
      button.hidden = !(config.paypalClientId && config.payoutsEnabled);
    } catch {
      button.hidden = true;
    }
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-pitch]")) setTimeout(addPayoutButton, 0);
  });
})();

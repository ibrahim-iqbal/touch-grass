import Modal from "./Modal.jsx";

export default function HelpDrawer({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} drawer labelledBy="help-heading">
      <h2 id="help-heading">how it works</h2>
      <details open>
        <summary>what do i do?</summary>
        <p>tap the mic and say your time, energy, and where you are — e.g. "20 minutes, high energy, near the park". you'll get one dare to go do.</p>
      </details>
      <details>
        <summary>how does a dare count?</summary>
        <p>tap "prove it outside", snap a photo once you're actually out there. that's what counts it toward your dares, streak, and stats — just hearing the dare doesn't.</p>
      </details>
      <details>
        <summary>what's the streak?</summary>
        <p>one proof photo per day keeps it going. miss a day and it resets to zero, so the pips track a run of consecutive days, not total dares.</p>
      </details>
      <details>
        <summary>no mic or camera — now what?</summary>
        <p>no mic support falls back to a random dare automatically. no camera just means you can't submit proof on that device — everything else still works.</p>
      </details>
      <details>
        <summary>is my data private?</summary>
        <p>everything lives in your browser's local storage, nothing is sent anywhere unless you paste an api key in settings for nicer voice or AI-generated dares — those go straight from your browser to that provider, never through us.</p>
      </details>
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={onClose}>got it</button>
      </div>
    </Modal>
  );
}

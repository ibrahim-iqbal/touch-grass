import Modal from "./Modal.jsx";

// centered modal (not a drawer) — the video feed wants focus. The video/canvas
// refs come from useCamera so it owns the stream lifecycle.
export default function CameraModal({ open, onClose, onSnap, videoRef, canvasRef }) {
  return (
    <Modal open={open} onClose={onClose} label="camera proof">
      <video ref={videoRef} id="camera-feed" autoPlay playsInline />
      <canvas ref={canvasRef} className="hidden" />
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>cancel</button>
        <button className="btn btn-primary" onClick={onSnap}>snap proof</button>
      </div>
    </Modal>
  );
}

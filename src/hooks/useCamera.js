import { useState, useRef, useEffect, useCallback } from "react";

// camera proof — ported from the vanilla proof/camera handlers, keeping the
// defensive getUserMedia timeout (it can hang forever on a device with no
// camera rather than reject) and the average-brightness "probably outside"
// heuristic.
export function useCamera({ onHint, onProof }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [proofDisabled, setProofDisabled] = useState(false);

  // attach the stream once the <video> is actually in the DOM
  useEffect(() => {
    if (cameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOpen]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const closeCamera = useCallback(() => {
    stopStream();
    setCameraOpen(false);
  }, [stopStream]);

  const openCamera = useCallback(async () => {
    if (proofDisabled) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onHint("camera isn't available on this device or browser");
      return;
    }
    setProofDisabled(true);
    onHint("opening camera...");
    try {
      let timedOut = false;
      const mediaPromise = navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      // if the real call resolves after we've timed out, don't leave an orphaned
      // stream running (camera light stuck on)
      mediaPromise
        .then((stream) => {
          if (timedOut) stream.getTracks().forEach((t) => t.stop());
        })
        .catch(() => {});
      streamRef.current = await Promise.race([
        mediaPromise,
        new Promise((_, reject) =>
          setTimeout(() => {
            timedOut = true;
            reject(new DOMException("timed out", "TimeoutError"));
          }, 8000)
        ),
      ]);
      setCameraOpen(true);
      onHint("say it again anytime for a new dare");
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        onHint("camera permission denied — allow camera access to add proof");
      } else if (err.name === "TimeoutError") {
        onHint("camera didn't respond, try again");
      } else {
        onHint("couldn't access camera: " + err.message);
      }
    } finally {
      setProofDisabled(false);
    }
  }, [proofDisabled, onHint]);

  const snapProof = useCallback(
    (currentDare) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const w = video?.videoWidth;
      const h = video?.videoHeight;
      if (!w || !h) {
        onHint("camera isn't ready yet, give it a second and try again");
        return;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      // ponytail: honest heuristic, not real vision — average brightness as a
      // loose "probably outside in daylight" signal.
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4 * 97) {
        sum += data[i] + data[i + 1] + data[i + 2];
        count++;
      }
      const brightness = count ? sum / count / 3 : 0;
      const thumb = canvas.toDataURL("image/jpeg", 0.8);

      onProof(currentDare, brightness > 60, thumb);
      closeCamera();
    },
    [onHint, onProof, closeCamera]
  );

  // safety: stop the camera if the component unmounts mid-stream
  useEffect(() => stopStream, [stopStream]);

  return { videoRef, canvasRef, cameraOpen, proofDisabled, openCamera, snapProof, closeCamera };
}

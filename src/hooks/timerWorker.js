self.onmessage = (e) => {
  const { type, duration } = e.data;

  if (type === "start") {
    // Small predictable delay (simulate "spring started")
    setTimeout(() => {
      self.postMessage({ type: "startDone" });
    }, duration ?? 0);
  }

  if (type === "finish") {
    setTimeout(() => {
      self.postMessage({ type: "finishDone" });
    }, duration);
  }
};
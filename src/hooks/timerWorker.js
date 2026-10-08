// Timers for useAnimateCards: a worker's timers keep running at full speed
// when the tab is in the background
self.onmessage = (e) => {
  const { id, duration } = e.data;
  setTimeout(() => self.postMessage({ id }), duration);
};

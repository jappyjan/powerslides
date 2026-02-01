// Expose in-page viewerData to the content script via DOM event.
document.dispatchEvent(
  new CustomEvent('slide-control-viewer-data', { detail: viewerData })
);

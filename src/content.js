function isPdfPage() {
  if (document.contentType === "application/pdf") return true;
  if (location.pathname.toLowerCase().endsWith(".pdf")) return true;
  return false;
}

console.log("Is PDF:", isPdfPage());

if(isPdfPage()) {
  console.log("pdf_url", location.href);
}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "REQUEST_PDF_URL") {
    if (!isPdfPage()) {
      sendResponse({ pdfUrl: null });
      return;
    }
    console.log("Sending PDF URL to popup:", location.href);
    sendResponse({ pdfUrl: location.href });
  }
});

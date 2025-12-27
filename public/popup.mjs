import * as pdfjsLib from "./pdfjs/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  chrome.runtime.getURL("pdfjs/pdf.worker.mjs");

async function requestPdfUrlFromTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tab.id,
      { type: "REQUEST_PDF_URL" },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
        } else {
          resolve(response?.pdfUrl || null);
        }
      }
    );
  });
}

async function fetchPdfBytes(url) {
  const res = await fetch(url);
  if(!res.ok) throw new Error("Failed to fetch PDF");
  return await res.arrayBuffer();
}

async function loadPdf(buffer) {
  return await pdfjsLib.getDocument({ data: buffer }).promise;
}
async function extractPageText(pdf, pageNumber=1) {
  const page = await pdf.getPage(pageNumber);
  const tc = await page.getTextContent();
  return tc.items.map(item => item.str).join(" ");
}

function normalizeText(text) {
  return text.replace(/\s+/g," ").replace(/\s([.,;:!?])/g, "$1").trim();
}

function splitIntoSentences(text) {
  return text.split(/(?<=[.!?])\s+/);
}

document.getElementById("readBtn").addEventListener("click", async () => {
  try {
    const pdfUrl = await requestPdfUrlFromTab();
    if (!pdfUrl) {
      alert("No PDF detected on this tab");
      return;
    }
    console.log("✅ PDF URL:", pdfUrl);

    const buffer = await fetchPdfBytes(pdfUrl);
    console.log("✅ PDF fetched, bytes:", buffer.byteLength);

    const pdf = await loadPdf(buffer);
    console.log("✅ PDF loaded");
    console.log("Total pages:", pdf.numPages);

    const page1Text = await extractPageText(pdf, 1);
    console.log("✅ Extracted text from page 1:", page1Text);

    const cleanText =normalizeText(page1Text);
    alert("✅ Normalized text:\n\n" + cleanText.slice(0, 1000));

    const sentences=splitIntoSentences(cleanText);
    const topSentences = sentences.slice(0,8);
    
    const result =await chrome.runtime.sendMessage({
      type: "EMBED_AND_SCORE",
      documentID: crypto.randomUUID(),
      topSentences
    });

    console.log("Full result:", result);
    if(!result || !Array.isArray(result.scored)) {
      console.error("Invalid result from embedding service");
      return;
    }
    result.scored.forEach(s =>
      console.log(`${s.score.toFixed(4)}: ${s.sentence}`)
    );

  } catch (e) {
    console.error(e);
    alert("Failed to read PDF");
  }
});

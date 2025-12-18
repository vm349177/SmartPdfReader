import * as pdfjsLib from "./pdfjs/pdf.mjs";
import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  chrome.runtime.getURL("pdfjs/pdf.worker.mjs");

let embedder = null;

async function loadEmbedder() {
  if(!embedder){
    console.log("Loading embedder...");
    embedder =await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
    console.log("Embedder loaded");
  }
  return embedder;
}

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

function normalizeUrl(text) {
  return text.replace(/\s+/g," ").replace(/\s([.,;:!?])/g, "$1").trim();
}

function splitIntoSentences(text) {
  return text.split(/(?<=[.!?])\s+/);
}

async function embedSentences(sentences) {
  const model = await loadEmbedder();
  const embeddings = await model(sentences,{
    pooling: "mean",
    normalize: true
  });
  return embeddings.tolist();
}

function meanVec(vectors) {
  const dim = vectors[0].length;
  const mean = new Array(dim).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      mean[i] += vec[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    mean[i] /= vectors.length;
  }
  return mean;
}

function cosineSim(a,b){
  let dot=0,na=0,nb=0;
  for(let i=0;i<a.length;i++){
    dot += a[i]*b[i];
    na += a[i]*a[i];
    nb += b[i]*b[i];
  }
  return dot / (Math.sqrt(na)*Math.sqrt(nb));
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

    const cleanText =normalizeUrl(page1Text);
    alert("✅ Normalized text:\n\n" + cleanText.slice(0, 1000));

    const sentences=splitIntoSentences(cleanText);
    const topSentences = sentences.slice(0,8);
    const sentenceEmbeddings = await embedSentences(topSentences);
    const docembeddings = await embedSentences(sentenceEmbeddings);
    const scored = topSentences.map((s,i)=>({
      sentence: s,
      score: cosineSim(sentenceEmbeddings[i], docembeddings)
    }));

    scored.sort((a,b)=> b.score - a.score);
    console.log("Sentence importance:");
    scored.forEach(element => {
      console.log(`${element.score.toFixed(4)}: ${element.sentence}`);
    });

  } catch (e) {
    console.error(e);
    alert("Failed to read PDF");
  }
});

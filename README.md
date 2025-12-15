# SmartPdfReader
Chrome extension that can read a PDF opened in Chrome and extract clean text
```
smart-read-aloud/
│
├── manifest.json
├── content.js          ← injected into PDF page
├── pdfjs/              ← PDF.js library
│   ├── pdf.min.js
│   └── pdf.worker.min.js
├── panel.html          ← (optional) text viewer
├── panel.js
└── styles.css
```

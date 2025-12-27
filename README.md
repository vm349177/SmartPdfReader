# SmartPdfReader
Chrome extension that can read a PDF opened in Chrome and extract clean text

## Project Structure
```
smart-read-aloud/
│
├── build
│    └── assets/              ← PDF.js library
│       ├── icon1
│       └── icon2
├── public
│    ├── manifest.json
│    ├── popup.mjs
│    └── pdfjs/              ← PDF.js library
│       ├── pdf.min.js
│       └── pdf.worker.min.js
├── src
│    ├── content.js
│    ├── popup.html          ← (optional) text viewer
│    ├── service_worker.js
│    └── styles.css
├── package.json
└── webpack.config.js
```

## Architecture
- popup.html (popup.mjs) creates a dialog box having read aloud option which when clicked
  -askes for pdf link from content.js
  -extracts sentences using pdfjs library
  -send the extracted sentences to background.js
- background.js run feature extraction and NLP ,creating importance scores 

## NLP
Used Transformer.js feature extraction pipeline (CSP makes it hard) followed this extention [example](https://github.com/huggingface/transformers.js/tree/main/examples/extension)
- Current Plan 
  - Read feature extraction(what it does)
  - an importance calculation formula
  - Learn about TTS

## how to run
- Install Node.js check npm command works
```
npm install
```
```
npm run build
```
- Upload the build file in chrome://extensions/ (use load unpacked option after switching to developer mode)
- Open a PDF using chrome click on extentions tab then read aloud and inspect the read aloud dialog box (console says everything)

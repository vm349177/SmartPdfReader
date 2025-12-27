import {pipeline} from "@huggingface/transformers";

class PipelineSingleton{
    static task = "feature-extraction";
    static model = "Xenova/all-MiniLM-L6-v2"
    static options = {quantized: true};
    static instance = null;

    static async getInstance(progress_callback=null) {
        this.instance ??=pipeline(
            this.task,
            this.model,
            this.options,
            progress_callback
        );
        return this.instance;
    }
}

function meanVec(vectors) {
    const dim = vectors[0].length;
    const mean = new Array(dim).fill(0);
    for(const v of vectors) {
        for(let i = 0; i < dim; i++) {
            mean[i] += v[i];
        }
    }
    for(let i = 0; i < dim; i++) {
        mean[i] /= vectors.length;
    }
    return mean;
}

function cosineSim(a,b){
    let dot = 0,na=0,nb=0;
    for( let i=0;i<a.length;i++){
        dot+=a[i]*b[i];
        na+=a[i]**2;
        nb+=b[i]**2;
    }
    return dot/(Math.sqrt(na)*Math.sqrt(nb));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if(msg.type === "EMBED_AND_SCORE") {
        console.log("Embedding and scoring sentences:", msg.topSentences);
        handelEmbedding(msg.topSentences)
        .then(scored=>sendResponse({scored}))
        .catch(e=> sendResponse({error: e.message}))
        return true;
    }
});

async function handelEmbedding(topSentences) {
    const model = await PipelineSingleton.getInstance();
    const output = await model(topSentences,{
        pooling:"mean",
        normalize: true
    });
    const embeddings = output.tolist();
    const docEmbedding = meanVec(embeddings);
    return topSentences.map((s, i) => ({
        sentence: s,
        score: cosineSim(embeddings[i], docEmbedding)
    })).sort((a,b) => b.score - a.score);
}
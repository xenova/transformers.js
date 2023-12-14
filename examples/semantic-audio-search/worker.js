
import { env, AutoTokenizer, ClapTextModelWithProjection } from '@xenova/transformers';
import { getCachedFile } from './utils';

// Skip local model check
env.allowLocalModels = false;

class ApplicationSingleton {
    static model_id = 'Xenova/larger_clap_music_and_speech';
    static BASE_URL = 'https://huggingface.co/datasets/Xenova/MusicBenchEmbedded/resolve/main/';

    static tokenizer = null;
    static text_model = null;
    static embeddings = null;

    static async getInstance(progress_callback = null) {
        this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, { progress_callback });
        this.text_model ??= ClapTextModelWithProjection.from_pretrained(this.model_id, {
            progress_callback,
            quantized: true, // TODO allow user to select quantized or not
        });
        this.embeddings ??= new Promise(
            (resolve, reject) => {
                getCachedFile(this.BASE_URL + 'audio-embeddings_52768-512_32bit.bin')
                    .then((buffer) => {
                        resolve(new Float32Array(buffer));
                    })
                    .catch(reject);
            }
        );

        return Promise.all([this.tokenizer, this.text_model, this.embeddings]);
    }
}


function cosineSimilarity(query_embeds, database_embeds) {
    const EMBED_DIM = 512;

    const numDB = database_embeds.length / EMBED_DIM;
    const similarityScores = new Array(numDB);

    for (let i = 0; i < numDB; ++i) {
        const startOffset = i * EMBED_DIM;
        const dbVector = database_embeds.slice(startOffset, startOffset + EMBED_DIM);

        let dotProduct = 0;
        let normEmbeds = 0;
        let normDB = 0;

        for (let j = 0; j < EMBED_DIM; ++j) {
            const embedValue = query_embeds[j];
            const dbValue = dbVector[j];

            dotProduct += embedValue * dbValue;
            normEmbeds += embedValue * embedValue;
            normDB += dbValue * dbValue;
        }

        similarityScores[i] = dotProduct / (Math.sqrt(normEmbeds) * Math.sqrt(normDB));
    }

    return similarityScores;
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    // Get the tokenizer, model, and embeddings. When called for the first time,
    // this will load the files and cache them for future use.
    const [tokenizer, text_model, embeddings] = await ApplicationSingleton.getInstance(self.postMessage);

    // Send the output back to the main thread
    self.postMessage({ status: 'ready' });

    // Run tokenization
    const text_inputs = tokenizer(event.data.query, { padding: true, truncation: true });

    // Compute embeddings
    const { text_embeds } = await text_model(text_inputs);

    // Compute similarity scores
    const scores = cosineSimilarity(text_embeds.data, embeddings);

    const output = scores
        .map((score, i) => [score, i]) // Save index
        .sort((a, b) => b[0] - a[0]) // Sort by scores
        .slice(0, 100); // Get top 100 results

    // Send the output back to the main thread
    self.postMessage({
        status: 'complete',
        output: output,
    });
});

import { AutoTokenizer, CLIPTextModelWithProjection } from "@xenova/transformers";
import { createClient } from '@supabase/supabase-js'

// Use the Singleton pattern to enable lazy construction of the pipeline.
// NOTE: We wrap the class in a function to prevent code duplication (see below).
const S = () => class ApplicationSingleton {
    static model_id = 'Xenova/clip-vit-base-patch16';
    static tokenizer = null;
    static text_model = null;
    static database = null;

    static async getInstance() {
        // Load tokenizer and text model
        if (this.tokenizer === null) {
            this.tokenizer = AutoTokenizer.from_pretrained(this.model_id);
        }

        if (this.text_model === null) {
            this.text_model = CLIPTextModelWithProjection.from_pretrained(this.model_id, {
                quantized: false,
            });
        }

        if (this.database === null) {
            this.database = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_ANON_KEY,
            )
        }

        return Promise.all([
            this.tokenizer,
            this.text_model,
            this.database,
        ]);
    }
}

let ApplicationSingleton;
if (process.env.NODE_ENV !== 'production') {
    // When running in development mode, attach the pipeline to the
    // global object so that it's preserved between hot reloads.
    // For more information, see https://vercel.com/guides/nextjs-prisma-postgres
    if (!global.ApplicationSingleton) {
        global.ApplicationSingleton = S();
    }
    ApplicationSingleton = global.ApplicationSingleton;
} else {
    ApplicationSingleton = S();
}
export default ApplicationSingleton;

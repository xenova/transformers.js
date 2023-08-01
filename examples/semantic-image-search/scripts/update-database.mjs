// Helper script to update the database with image embeddings

import { AutoProcessor, RawImage, CLIPVisionModelWithProjection } from '@xenova/transformers';
import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_SECRET_KEY) {
    throw new Error('Missing `SUPABASE_SECRET_KEY` environment variable.')
}

// Create a single supabase client for interacting with your database
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
)

let { data, error } = await supabase
    .from('images')
    .select('*')
    .neq('ignore', true)
    .is('image_embedding', null);

if (error) {
    throw error;
}

// Load processor and vision model
const model_id = 'Xenova/clip-vit-base-patch16';
const processor = await AutoProcessor.from_pretrained(model_id);
const vision_model = await CLIPVisionModelWithProjection.from_pretrained(model_id, {
    quantized: false,
});

for (const image_data of data) {
    let image;
    try {
        image = await RawImage.read(image_data.photo_image_url);
    } catch (e) {
        // Unable to load image, so we ignore it
        console.warn('Ignoring image due to error', e)
        await supabase
            .from('images')
            .update({ ignore: true })
            .eq('photo_id', image_data.photo_id)
            .select()
        continue;
    }

    // Read image and run processor
    let image_inputs = await processor(image);

    // Compute embeddings
    const { image_embeds } = await vision_model(image_inputs);
    const embed_as_list = image_embeds.tolist()[0];

    // https://supabase.com/docs/guides/ai/vector-columns#storing-a-vector--embedding
    const { data, error } = await supabase
        .from('images')
        .update({ image_embedding: embed_as_list })
        .eq('photo_id', image_data.photo_id)
        .select()

    if (error) {
        console.error('error', error)
    } else {
        console.log('success', image_data.photo_id)
    }
}

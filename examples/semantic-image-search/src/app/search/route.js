// Create a custom request handler for the /classify route.
// For more information, see https://nextjs.org/docs/app/building-your-application/routing/router-handlers

import { NextResponse } from 'next/server'
import ApplicationSingleton from '../app.js'

const parseInputs = (searchParams) => {
    const text = searchParams.get('text');
    if (!text) {
        return {
            error: 'Missing text parameter',
        };
    }
    const threshold = searchParams.get('threshold');
    const match_threshold = Number(threshold ?? 0.1);
    if (isNaN(match_threshold) || match_threshold < 0 || match_threshold > 1) {
        return {
            error: `Invalid threshold parameter "${threshold}" (should be a number between 0 and 1)`,
        };
    }

    const limit = searchParams.get('limit');
    const match_count = Number(limit ?? 25);
    if (isNaN(match_count) || !Number.isInteger(match_count) || match_count < 0 || match_count > 1000) {
        return {
            error: `Invalid limit parameter "${limit}" (should be an integer between 0 and 1000)`,
        };
    }

    return { text, match_threshold, match_count }
}

// TODO: add caching

export async function GET(request) {
    const parsedInputs = parseInputs(request.nextUrl.searchParams);
    if (parsedInputs.error) {
        return NextResponse.json({
            error: parsedInputs.error,
        }, { status: 400 });
    }

    // Valid inputs, so we can proceed
    const { text, match_threshold, match_count } = parsedInputs;

    // Get the tokenizer, model, and database singletons. When called for the first time,
    // this will load the models and cache them for future use.
    const [tokenizer, text_model, database] = await ApplicationSingleton.getInstance();

    // Run tokenization
    let text_inputs = tokenizer(text, { padding: true, truncation: true });

    // Compute embeddings
    const { text_embeds } = await text_model(text_inputs);
    const query_embedding = text_embeds.tolist()[0];

    // TODO add pagination?
    let { data: images, error } = await database
        .rpc('match_images', {
            query_embedding,
            match_threshold,
            match_count,
        });
    if (error) {
        console.warn('Error fetching images', error);
        return NextResponse.json({
            error: 'An error occurred while fetching images',
        }, { status: 500 });
    }


    return NextResponse.json(images);
}

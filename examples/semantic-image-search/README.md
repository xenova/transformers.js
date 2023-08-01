
# Semantic Image Search

This example shows you how to use Transformers.js to create a semantic image search engine. Check out the demo [here](https://huggingface.co/spaces/Xenova/semantic-image-search).

![Semantic Image Search Demo](https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/semantic-image-search-min.png)

## Getting Started

### Dataset
This application uses images from [The Unsplash Dataset](https://github.com/unsplash/datasets), which you can download [here](https://unsplash.com/data/lite/latest). All you need for this demo is the `photos.tsv000` TSV file, which contains the metadata for all the images.


### Connecting to Supabase

After creating a new [Supabase](https://supabase.com/) project, you'll need to:

1. Create an `images` table and import the data from `photos.tsv000`. 

2. Add a column for `image_embeddings`:

    ```sql
    -- Add a new vector column with a dimension of 512
    alter table images add column image_embedding vector(512);
    ```

3. Add your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SECRET_KEY` keys to a `.env.local` file (see `.env.local.example` for template).

4. Update the image embeddings in your database by running the following command:
    ```bash
    SUPABASE_URL=your-project-url \
    SUPABASE_SECRET_KEY=your-secret-key \
    node scripts/update-database.mjs
    ```

    *Note:* This will take a while. Also, since queries are capped at 1000 returned rows, you'll need to run this command multiple times to insert all 25000 rows.

5. Create a new `match_images` [database function](https://supabase.com/docs/guides/database/functions):

    ```sql
    -- https://supabase.com/blog/openai-embeddings-postgres-vector
    create or replace function match_images (
        query_embedding vector(512),
        match_threshold float,
        match_count int
    )
    returns table (
        photo_id text,
        photo_url text,
        photo_image_url text,
        photo_width int,
        photo_height int,
        photo_aspect_ratio float,
        photo_description text,
        ai_description text,
        blur_hash text,
        similarity float
    )
    language sql stable
    as $$
    select
        photo_id,
        photo_url,
        photo_image_url,
        photo_width,
        photo_height,
        photo_aspect_ratio,
        photo_description,
        ai_description,
        blur_hash,
        1 - (image_embedding <=> query_embedding) as similarity
    from images
    where 1 - (image_embedding <=> query_embedding) > match_threshold
    order by similarity desc
    limit match_count;
    $$;
    ```

5. Add a [database policy](https://supabase.com/docs/guides/auth/row-level-security#policies) to allow users to view the database:

    ```sql
    create policy "policy_name"
    on public.images
    for select using (
        true
    );
    ```

### Development

You can now run the development server with:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


const path = require('path');
const { pipeline, env } = require('..');

// Only use local models
env.remoteModels = false;
// env.remoteModels = true; // Uncomment to test online

function isDeepEqual(obj1, obj2, {
    tol = 1e-3
} = {}) {
    // Get the keys of both objects
    const obj1Keys = Object.keys(obj1);
    const obj2Keys = Object.keys(obj2);

    // If the objects have different number of keys, they're not equal
    if (obj1Keys.length !== obj2Keys.length) {
        return false;
    }

    // Compare each key-value pair recursively
    for (const key of obj1Keys) {
        const val1 = obj1[key];
        const val2 = obj2[key];

        // If the values are objects, compare them recursively
        if (typeof val1 === 'object' && typeof val2 === 'object') {
            if (!isDeepEqual(val1, val2)) {
                return false;
            }
        } else if (typeof val1 !== typeof val2) {
            // Types are not the same
            return false;
        } else if (typeof val1 === 'number') {
            return Math.abs(val1 - val2) <= tol;
        } else if (val1 !== val2) {
            // If the values are not objects, compare them directly
            return false;
        }
    }

    // If all key-value pairs are equal, the objects are deep equal
    return true;
}

async function embeddings() {

    // Load embeddings pipeline (uses  by default)
    let embedder = await pipeline('embeddings', 'sentence-transformers/all-MiniLM-L6-v2')


    // Provide sentences
    let sentences = [
        'This framework generates embeddings for each input sentence',
        'Sentences are passed as a list of string.',
        'The quick brown fox jumps over the lazy dog.'
    ]

    let start = performance.now();

    // Run sentences through embedder
    let output = await embedder(sentences)


    let duration = performance.now() - start;

    // Convert Tensor to JS list
    output = output.tolist();

    // Compute pairwise cosine similarity
    // for (let i = 0; i < sentences.length; ++i) {
    //     for (let j = i + 1; j < sentences.length; ++j) {
    //         console.log(`(${i},${j}):`, embedder.cos_sim(output[i], output[j]))
    //     }
    // }

    let pairwiseScores = [[output[0], output[1]], [output[0], output[2]], [output[1], output[2]]].map(x => embedder.cos_sim(...x))


    // Dispose pipeline
    await embedder.dispose()

    return [isDeepEqual(
        pairwiseScores,
        [0.502872309810269, 0.11088411026413121, 0.09602621986931259]
    ), duration];
}


async function text_classification() {
    let classifier = await pipeline('text-classification', 'distilbert-base-uncased-finetuned-sst-2-english');

    let texts = [
        "This was a masterpiece. Not completely faithful to the books, but enthralling from beginning to end. Might be my favorite of the three.",
        "I hated the movie"
    ];

    let start = performance.now();

    let outputs1 = await classifier("I hated the movie");
    let outputs2 = await classifier("I hated the movie", {
        topk: 2
    });
    let outputs3 = await classifier(texts);
    let outputs4 = await classifier(texts, {
        topk: 2
    });

    let duration = performance.now() - start;

    // Dispose pipeline
    await classifier.dispose()

    return [isDeepEqual(
        outputs1,
        [
            { "label": "NEGATIVE", "score": 0.9997429847717285 }
        ]
    ) && isDeepEqual(
        outputs2,
        [
            { "label": "NEGATIVE", "score": 0.9997429847717285 },
            { "label": "POSITIVE", "score": 0.0002570444776210934 }
        ]
    ) && isDeepEqual(
        outputs3,
        [
            { "label": "POSITIVE", "score": 0.9994572997093201 },
            { "label": "NEGATIVE", "score": 0.9997275471687317 }
        ]
    ) && isDeepEqual(
        outputs4,
        [[
            { "label": "POSITIVE", "score": 0.9994572997093201 },
            { "label": "NEGATIVE", "score": 0.0005426819552667439 }
        ], [
            { "label": "NEGATIVE", "score": 0.9997275471687317 },
            { "label": "POSITIVE", "score": 0.00027245949604548514 }
        ]]
    ), duration];
}


async function token_classification() {
    let classifier = await pipeline('token-classification', 'Davlan/bert-base-multilingual-cased-ner-hrl');

    let texts = [
        "The Golden State Warriors are an American professional basketball team based in San Francisco.",
        "My name is Sarah and I live in London."
    ];

    let start = performance.now();

    let outputs1 = await classifier(texts[0]);
    let outputs2 = await classifier(texts);

    let duration = performance.now() - start;

    // Dispose pipeline
    await classifier.dispose()

    return [isDeepEqual(
        outputs1,
        [
            { entity: "B-ORG", score: 0.9998535513877869, index: 2, word: "Golden", start: null, end: null },
            { entity: "I-ORG", score: 0.9998612999916077, index: 3, word: "State", start: null, end: null },
            { entity: "I-ORG", score: 0.999866247177124, index: 4, word: "Warriors", start: null, end: null },
            { entity: "B-LOC", score: 0.9997050166130066, index: 13, word: "San", start: null, end: null },
            { entity: "I-LOC", score: 0.9987282156944275, index: 14, word: "Francisco", start: null, end: null }
        ]
    ) && isDeepEqual(
        outputs2,
        [
            [
                { entity: "B-ORG", score: 0.9998375773429871, index: 2, word: "Golden", start: null, end: null },
                { entity: "I-ORG", score: 0.9998642206192017, index: 3, word: "State", start: null, end: null },
                { entity: "I-ORG", score: 0.9998642802238464, index: 4, word: "Warriors", start: null, end: null },
                { entity: "B-LOC", score: 0.9996914863586426, index: 13, word: "San", start: null, end: null },
                { entity: "I-LOC", score: 0.9989780783653259, index: 14, word: "Francisco", start: null, end: null }
            ], [
                { entity: "B-PER", score: 0.997977614402771, index: 4, word: "Sarah", start: null, end: null },
                { entity: "B-LOC", score: 0.9996902346611023, index: 9, word: "London", start: null, end: null }
            ]
        ]
    ), duration];
}


async function zero_shot_classification() {
    let classifier = await pipeline('zero-shot-classification', 'facebook/bart-large-mnli');


    let sequences_to_classify = ['one day I will see the world', 'I love making pizza'];
    let candidate_labels = ['travel', 'cooking', 'dancing'];

    let start = performance.now();

    let outputs1 = await classifier(sequences_to_classify[0], candidate_labels);
    let outputs2 = await classifier(sequences_to_classify, candidate_labels);
    let outputs3 = await classifier(sequences_to_classify, candidate_labels, {
        multi_label: true
    })

    let duration = performance.now() - start;

    // Dispose pipeline
    await classifier.dispose()

    return [isDeepEqual(
        outputs1,
        {
            sequence: "one day I will see the world",
            labels: ["travel", "dancing", "cooking"],
            scores: [0.4261703487477968, 0.2903585771517135, 0.28347107410048983]
        }
    ) && isDeepEqual(
        outputs2,
        [{
            sequence: "one day I will see the world",
            labels: ["travel", "dancing", "cooking"],
            scores: [0.4261703487477968, 0.2903585771517135, 0.28347107410048983]
        }, {
            sequence: "I love making pizza",
            labels: ["cooking", "travel", "dancing"],
            scores: [0.4660367922118968, 0.2756005926506238, 0.2583626151374795]
        }]
    ) && isDeepEqual(
        outputs3,
        [{
            sequence: "one day I will see the world",
            labels: ["travel", "dancing", "cooking"],
            scores: [0.7108286792234982, 0.5763787804099745, 0.44303326070949994]
        }, {
            sequence: "I love making pizza",
            labels: ["cooking", "travel", "dancing"],
            scores: [0.8527619536354446, 0.7899589317978243, 0.5838912691496106]
        }]
    ), duration];

}

async function masked_language_modelling() {

    let unmasker = await pipeline('fill-mask', 'bert-base-uncased');

    let start = performance.now();

    let outputs1 = await unmasker("Once upon a [MASK].");
    let outputs2 = await unmasker([
        "Once upon a [MASK].",
        "[MASK] is the capital of England."
    ]);

    let duration = performance.now() - start;

    // Dispose pipeline
    await unmasker.dispose()

    return [isDeepEqual(
        outputs1,
        [
            {
                "score": 0.9318257570266724,
                "token": 2051,
                "token_str": "time",
                "sequence": "once upon a time."
            },
            {
                "score": 0.009929785504937172,
                "token": 13342,
                "token_str": "mattress",
                "sequence": "once upon a mattress."
            },
            {
                "score": 0.0021786263678222895,
                "token": 3959,
                "token_str": "dream",
                "sequence": "once upon a dream."
            },
            {
                "score": 0.001881834352388978,
                "token": 2940,
                "token_str": "hill",
                "sequence": "once upon a hill."
            },
            {
                "score": 0.0017424898687750101,
                "token": 2154,
                "token_str": "day",
                "sequence": "once upon a day."
            }
        ]
    ) && isDeepEqual(
        outputs2,
        [[
            {
                "score": 0.9828392863273621,
                "token": 2051,
                "token_str": "time",
                "sequence": "once upon a time."
            },
            {
                "score": 0.0027356224600225687,
                "token": 13342,
                "token_str": "mattress",
                "sequence": "once upon a mattress."
            },
            {
                "score": 0.00038447941187769175,
                "token": 2504,
                "token_str": "level",
                "sequence": "once upon a level."
            },
            {
                "score": 0.0003801222483161837,
                "token": 2940,
                "token_str": "hill",
                "sequence": "once upon a hill."
            },
            {
                "score": 0.0003801104612648487,
                "token": 6480,
                "token_str": "lifetime",
                "sequence": "once upon a lifetime."
            }
        ], [
            {
                "score": 0.3269098699092865,
                "token": 2414,
                "token_str": "london",
                "sequence": "london is the capital of england."
            },
            {
                "score": 0.06448942422866821,
                "token": 2009,
                "token_str": "it",
                "sequence": "it is the capital of england."
            },
            {
                "score": 0.03533688560128212,
                "token": 7067,
                "token_str": "bristol",
                "sequence": "bristol is the capital of england."
            },
            {
                "score": 0.025355694815516472,
                "token": 5087,
                "token_str": "manchester",
                "sequence": "manchester is the capital of england."
            },
            {
                "score": 0.023570900782942772,
                "token": 6484,
                "token_str": "birmingham",
                "sequence": "birmingham is the capital of england."
            }
        ]]
    ), duration];
}

async function question_answering() {

    let question = 'Who was Jim Henson?'
    let context = 'Jim Henson was a nice puppet.'

    let answerer = await pipeline('question-answering', 'distilbert-base-uncased-distilled-squad');

    let start = performance.now();

    let outputs = await answerer(question, context);
    let outputs2 = await answerer(question, context, {
        topk: 3,
    });

    let duration = performance.now() - start;

    // Dispose pipeline
    await answerer.dispose()

    return [isDeepEqual(
        outputs,
        { answer: 'a nice puppet', score: 0.5664517526948352 }
    ) && isDeepEqual(
        outputs2,
        [
            { answer: 'a nice puppet', score: 0.5664517526948352 },
            { answer: 'nice puppet', score: 0.1698902336448853 },
            { answer: 'puppet', score: 0.14046057793125577 }
        ]
    ), duration];
}

async function summarization() {

    let summarizer = await pipeline('summarization', 'sshleifer/distilbart-cnn-6-6')

    let texts = [
        `The tower is 324 metres (1,063 ft) tall, about the same height as an 81-storey building, and the tallest structure in Paris. Its base is square, measuring 125 metres (410 ft) on each side. During its construction, the Eiffel Tower surpassed the Washington Monument to become the tallest man-made structure in the world, a title it held for 41 years until the Chrysler Building in New York City was finished in 1930. It was the first structure to reach a height of 300 metres. Due to the addition of a broadcasting aerial at the top of the tower in 1957, it is now taller than the Chrysler Building by 5.2 metres (17 ft). Excluding transmitters, the Eiffel Tower is the second tallest free-standing structure in France after the Millau Viaduct.`,
        `The Amazon rainforest (Portuguese: Floresta Amazônica or Amazônia; Spanish: Selva Amazónica, Amazonía or usually Amazonia; French: Forêt amazonienne; Dutch: Amazoneregenwoud), also known in English as Amazonia or the Amazon Jungle, is a moist broadleaf forest that covers most of the Amazon basin of South America. This basin encompasses 7,000,000 square kilometres (2,700,000 sq mi), of which 5,500,000 square kilometres (2,100,000 sq mi) are covered by the rainforest. This region includes territory belonging to nine nations. The majority of the forest is contained within Brazil, with 60% of the rainforest, followed by Peru with 13%, Colombia with 10%, and with minor amounts in Venezuela, Ecuador, Bolivia, Guyana, Suriname and French Guiana. States or departments in four nations contain "Amazonas" in their names. The Amazon represents over half of the planet's remaining rainforests, and comprises the largest and most biodiverse tract of tropical rainforest in the world, with an estimated 390 billion individual trees divided into 16,000 species.`
    ]

    let start1 = performance.now();

    let summary = await summarizer(texts, {
        top_k: 0,
        do_sample: false,
    });

    let duration1 = performance.now() - start1;

    // Dispose pipeline
    await summarizer.dispose()


    // This case also tests `forced_bos_token_id`
    let summarizer2 = await pipeline('summarization', 'facebook/bart-large-cnn');


    let start2 = performance.now();

    let summary2 = await summarizer2(texts[0], {
        top_k: 0,
        do_sample: false,
    });

    let duration2 = performance.now() - start2;

    // Dispose pipeline
    await summarizer2.dispose()

    return [isDeepEqual(
        summary,
        [{
            "summary_text": " The Eiffel Tower is 324 metres tall, and the tallest structure in Paris. It is the second tallest free-standing structure in France after the Millau Viaduct."
        },
        {
            "summary_text": " The Amazon is a moist broadleaf forest that covers most of the Amazon basin of South America. The majority of the forest is contained within Brazil, with 60% of the rainforest, followed by Peru with 13%. The Amazon represents over half the planet's remaining rainfore"
        }]
    ) && isDeepEqual(
        summary2,
        [
            { summary_text: "During its construction, the Eiffel Tower surpassed the Washington Monument to become the tallest man-made structure in the world. The tower is 324 metres (1,063 ft) tall, about the same height as an 81-storey building." }
        ]
    ), duration1 + duration2];
}

async function translation() {

    let translator = await pipeline('translation_en_to_de', 't5-small')

    let texts = [
        'Hello, how are you?',
        'My name is Maria.',
    ]

    let start = performance.now();

    let translation1 = await translator('Hello, how are you?', {
        top_k: 0,
        do_sample: false
    })
    let translation2 = await translator(texts, {
        top_k: 0,
        do_sample: false
    })

    let duration = performance.now() - start;

    // Dispose pipeline
    await translator.dispose()

    return [isDeepEqual(
        translation1,
        [{ "translation_text": "Hallo, wie sind Sie?" }]

    ) && isDeepEqual(
        translation2,
        [
            { 'translation_text': 'Hallo, wie sind Sie?' },
            { 'translation_text': 'Mein Name ist Maria.' }
        ]
    ), duration];
}

async function text_generation() {

    let generator = await pipeline('text-generation', 'distilgpt2')

    let start = performance.now();

    let output1 = await generator('Once upon a time, there was a', {
        max_new_tokens: 10,
        top_k: 0,
        do_sample: false
    })

    let output2 = await generator('Once upon a time, there was a', {
        max_new_tokens: 10,
        num_beams: 2,
        num_return_sequences: 2,
        top_k: 0,
        do_sample: false
    })

    let output3 = await generator([
        'Once upon a time, there was a',
        'I enjoy walking with my cute dog',
    ], {
        max_new_tokens: 10,
        num_beams: 2,
        num_return_sequences: 2,
        top_k: 0,
        do_sample: false
    })

    let duration = performance.now() - start;

    // Dispose pipeline
    await generator.dispose()

    return [isDeepEqual(
        output1,
        [
            { "generated_text": "Once upon a time, there was a time when the world was not the same.\n" }
        ]
    ) && isDeepEqual(
        output2,
        [
            { "generated_text": "Once upon a time, there was a lot of discussion about the need for a new," },
            { "generated_text": "Once upon a time, there was a lot of discussion about the need for a new and" }
        ]
    ) && isDeepEqual(
        output3,
        [[
            { "generated_text": "Once upon a time, there was a lot of discussion about the need for a new," },
            { "generated_text": "Once upon a time, there was a lot of discussion about the need for a new and" }
        ], [
            { "generated_text": "I enjoy walking with my cute dog and I love to play with him. I love" },
            { "generated_text": "I enjoy walking with my cute dog and I love to play with her. I love" }
        ]]
    ), duration];
}


async function text2text_generation() {
    let generator1 = await pipeline('text2text-generation', 'google/flan-t5-small');

    let start1 = performance.now();

    let output1 = await generator1(
        "Premise:  At my age you will probably have learnt one lesson. " +
        "Hypothesis:  It's not certain how many lessons you'll learn by your thirties. " +
        "Does the premise entail the hypothesis?",
        {
            top_k: 0,
            do_sample: false
        }
    )

    let duration1 = performance.now() - start1;


    let generator2 = await pipeline('text2text-generation', 'google/flan-t5-base');

    let start2 = performance.now();
    let output2 = await generator2(`
        Q: Roger has 5 tennis balls. He buys 2 more cans of tennis balls. Each can
        has 3 tennis balls. How many tennis balls does he have now?
        A: Roger started with 5 balls. 2 cans of 3 tennis balls each is 6 tennis balls.
        5 + 6 = 11. The answer is 11.

        Q: A juggler can juggle 16 balls. Half of the balls are golf balls, and half
        of the golf balls are blue. How many blue golf balls are there?
    `, {
        top_k: 0,
        do_sample: false
    });

    let duration2 = performance.now() - start2;

    // Dispose pipelines
    await Promise.all([generator1.dispose(), generator2.dispose()])

    return [isDeepEqual(
        output1,
        ['it is not possible to tell']
    ) && isDeepEqual(
        output2,
        ['There are 16 / 2 = 8 golf balls. There are 8 / 2 = 4 blue golf balls. The answer is 4.']
    ), duration1 + duration2];
}

async function code_generation() {
    // Specifically test that `added_tokens` are added correctly

    let generator = await pipeline('text-generation', 'Salesforce/codegen-350M-mono')

    let start = performance.now();

    let output1 = await generator('def fib(n):', {
        max_new_tokens: 45,
        top_k: 0,
        do_sample: false
    });

    let duration = performance.now() - start;

    // Dispose pipeline
    await generator.dispose()

    return [isDeepEqual(
        output1,
        [
            { "generated_text": "def fib(n):\n    if n == 0:\n        return 0\n    elif n == 1:\n        return 1\n    else:\n        return fib(n-1) + fib(n-2)\n\n" }
        ]
    ), duration];
}


async function speech2text_generation() {
    // TODO add test case
    // let audio = './tests/assets/jfk.wav';
    // let transcriber = await pipeline('automatic-speech-recognition')
    // let output = await transcriber(audio);
    // console.log(output);

    return [true, 0];
}


async function image_to_text() {
    let captioner = await pipeline('image-to-text', 'nlpconnect/vit-gpt2-image-captioning')


    let url = 'https://huggingface.co/datasets/mishig/sample_images/resolve/main/savanna.jpg';
    let urls = [
        'https://huggingface.co/datasets/mishig/sample_images/resolve/main/football-match.jpg',
        'https://huggingface.co/datasets/mishig/sample_images/resolve/main/airport.jpg'
    ]

    let start = performance.now();

    let output1 = await captioner(url, {
        top_k: 0,
        do_sample: false
    })

    let output2 = await captioner(url, {
        max_new_tokens: 20,
        num_beams: 2,
        num_return_sequences: 2,
        top_k: 0,
        do_sample: false
    })

    let output3 = await captioner(urls, {
        top_k: 0,
        do_sample: false
    })

    let output4 = await captioner(urls, {
        max_new_tokens: 20,
        num_beams: 2,
        num_return_sequences: 2,
        top_k: 0,
        do_sample: false
    })

    let duration = performance.now() - start;

    // Dispose pipeline
    await captioner.dispose()

    return [isDeepEqual(
        output1,
        [{
            "generated_text": "a herd of giraffes and zebras are grazing in a field"
        }]
    ) && isDeepEqual(
        output2,
        [{
            "generated_text": "a herd of giraffes and zebras grazing in a field"
        }, {
            "generated_text": "a herd of giraffes and zebras are grazing in a field"
        }]
    ) && isDeepEqual(
        output3,
        [
            [{ "generated_text": "a soccer player kicking a soccer ball during a game" }],
            [{ "generated_text": "a plane is parked at an airport with a lot of people" }]
        ]
    ) && isDeepEqual(
        output4,
        [[
            { "generated_text": "a soccer player kicking a soccer ball during a game" },
            { "generated_text": "a soccer player kicking a soccer ball during a match" }
        ], [
            { "generated_text": "airplanes parked at an airport" },
            { "generated_text": "airplanes are parked at an airport" }
        ]]
    ), duration];

}


async function image_classification() {
    let classifier = await pipeline('image-classification', 'google/vit-base-patch16-224');


    let url = 'https://huggingface.co/datasets/mishig/sample_images/resolve/main/tiger.jpg';
    let urls = [
        'https://huggingface.co/datasets/mishig/sample_images/resolve/main/palace.jpg',
        'https://huggingface.co/datasets/mishig/sample_images/resolve/main/teapot.jpg'
    ]

    let start = performance.now();
    let output1 = await classifier(url)
    let output2 = await classifier(url, {
        topk: 2
    });
    let output3 = await classifier(urls)
    let output4 = await classifier(urls, {
        topk: 2
    });
    let duration = performance.now() - start;

    // Dispose pipeline
    await classifier.dispose()

    return [isDeepEqual(
        output1,
        [{ "label": "tiger, Panthera tigris", "score": 0.7911674380302429 }]
    ) && isDeepEqual(
        output2,
        [{ "label": "tiger, Panthera tigris", "score": 0.7911674380302429 }, { "label": "tiger cat", "score": 0.20425112545490265 }]
    ) && isDeepEqual(
        output3,
        [{ "label": "palace", "score": 0.9975974559783936 }, { "label": "teapot", "score": 0.9849203824996948 }]
    ) && isDeepEqual(
        output4,
        [
            [{ "label": "palace", "score": 0.9975974559783936 }, { "label": "monastery", "score": 0.0007480724016204476 }],
            [{ "label": "teapot", "score": 0.9849203824996948 }, { "label": "coffeepot", "score": 0.008069870993494987 }]
        ]
    ), duration];

}


async function image_segmentation() {
    let segmenter = await pipeline('image-segmentation', 'facebook/detr-resnet-50-panoptic')

    let img = path.join(__dirname, '../assets/images/cats.jpg')

    let start = performance.now();
    let outputs = await segmenter(img);

    // Just calculate sum of mask (to avoid having to check the whole mask)
    outputs.forEach(x => x.mask = x.mask.data.reduce((acc, curr) => {
        if (curr > 0) {
            acc += 1;
        }
        return acc;
    }, 0));

    let duration = performance.now() - start;

    // Dispose pipeline
    await segmenter.dispose()

    return [isDeepEqual(
        outputs,
        [
            { score: 0.9967514276504517, label: 'cat', mask: 58924 },
            { score: 0.998571515083313, label: 'remote', mask: 4241 },
            { score: 0.999416172504425, label: 'remote', mask: 2280 },
            { score: 0.9635734558105469, label: 'couch', mask: 172312 },
            { score: 0.999547004699707, label: 'cat', mask: 52395 }
        ]
    ), duration];

}

async function zero_shot_image_classification() {

    let classifier = await pipeline('zero-shot-image-classification', 'openai/clip-vit-base-patch16');

    let url = 'https://huggingface.co/datasets/mishig/sample_images/resolve/main/football-match.jpg';
    let urls = [
        'https://huggingface.co/datasets/mishig/sample_images/resolve/main/football-match.jpg',
        'https://huggingface.co/datasets/mishig/sample_images/resolve/main/airport.jpg',
        'https://huggingface.co/datasets/mishig/sample_images/resolve/main/savanna.jpg',
    ]

    let classes = ['football', 'airport', 'animals'];

    let start = performance.now();

    let output1 = await classifier(url, classes);
    let output2 = await classifier(urls, classes);

    let duration = performance.now() - start;

    // Dispose pipeline
    await classifier.dispose()

    return [isDeepEqual(
        output1,
        [
            { "score": 0.9934590458869934, "label": "football" },
            { "score": 0.0007887096726335585, "label": "airport" },
            { "score": 0.005752227734774351, "label": "animals" }
        ]
    ) && isDeepEqual(
        output2,
        [
            [
                { "score": 0.9938763976097107, "label": "football" },
                { "score": 0.0007706438773311675, "label": "airport" },
                { "score": 0.005352961830794811, "label": "animals" }
            ], [
                { "score": 0.00042657132144086063, "label": "football" },
                { "score": 0.997478187084198, "label": "airport" },
                { "score": 0.0020952688064426184, "label": "animals" }
            ], [
                { "score": 0.014750242233276367, "label": "football" },
                { "score": 0.021008191630244255, "label": "airport" },
                { "score": 0.9642415642738342, "label": "animals" }
            ]
        ]
    ), duration];
}


async function object_detection() {
    let detector = await pipeline('object-detection', 'facebook/detr-resnet-50')

    let url = 'https://huggingface.co/datasets/mishig/sample_images/resolve/main/savanna.jpg';
    let urls = ['https://huggingface.co/datasets/mishig/sample_images/resolve/main/airport.jpg']

    // TODO add batched test cases when supported

    let start = performance.now();

    let output1 = await detector(url, {
        threshold: 0.9,
    });

    let output2 = await detector(urls, {
        threshold: 0.9,
        percentage: true
    });

    let duration = performance.now() - start;

    // Dispose pipeline
    await detector.dispose()

    return [isDeepEqual(
        output1,
        {
            "boxes": [
                [358.7606209516525, 247.36226856708527, 402.14368879795074, 315.4741019010544],
                [110.0420343875885, 237.36174881458282, 233.3449423313141, 323.1463783979416],
                [6.167297065258026, 147.96502590179443, 221.5736523270607, 260.91010093688965],
                [186.66354596614838, 231.2074738740921, 321.6980177164078, 305.78231513500214],
                [349.1101884841919, 95.70672154426575, 547.1087765693665, 310.6894862651825]
            ],
            "classes": [24, 24, 25, 24, 25],
            "scores": [0.9990543723106384, 0.9987652897834778, 0.9860252737998962, 0.997667133808136, 0.9986326694488525],
            "labels": ["zebra", "zebra", "giraffe", "zebra", "giraffe"]
        },
    ) && isDeepEqual(
        output2,
        [{
            "boxes": [
                [0.4284285604953766, 0.5051715075969696, 0.4905807673931122, 0.5450733006000519],
                [0.6921858489513397, 0.33420196175575256, 1.016784816980362, 0.9818757474422455],
                [0.7528624832630157, 0.5306279957294464, 0.8514151275157928, 0.6537223756313324],
                [0.5119757056236267, 0.5140881687402725, 0.5615171790122986, 0.5465199798345566],
                [0.33254460990428925, 0.5169002115726471, 0.35381682217121124, 0.6282477080821991],
                [0.42312371730804443, 0.4445413798093796, 0.5735017657279968, 0.5278995186090469],
                [0.18738143146038055, 0.40505293011665344, 0.4653054028749466, 0.5265144407749176],
                [0.5737103521823883, 0.4582572281360626, 0.7308457791805267, 0.6411504447460175],
                [0.5117709636688232, 0.5142771750688553, 0.5613124370574951, 0.5452155321836472],
                [0.5707400292158127, 0.46061643958091736, 0.7277757674455643, 0.6379677355289459]
            ],
            "classes": [8, 6, 1, 8, 1, 5, 5, 8, 3, 6],
            "scores": [0.911045253276825, 0.9961543679237366, 0.9976616501808167, 0.9338068962097168, 0.9982594847679138, 0.9954741597175598, 0.9979778528213501, 0.9158956408500671, 0.9502778649330139, 0.994942843914032],
            "labels": ["truck", "bus", "person", "truck", "person", "airplane", "airplane", "truck", "car", "bus"]
        }]
    ), duration];

}


// hide unused initializer and node arguments warnings
console._warn = console.warn;
console.warn = (...data) => {
    if (!data[0].includes('CleanUnusedInitializersAndNodeArgs')) {
        console._warn(...data);
    }
};

// Define tests
let tests = {
    'Text classification:': text_classification,
    'Token classification:': token_classification,
    'Zero-shot classification': zero_shot_classification,
    'Masked language modelling:': masked_language_modelling,
    'Question answering:': question_answering,
    'Summarization:': summarization,
    'Translation:': translation,
    'Text-to-text generation:': text2text_generation,
    'Text generation:': text_generation,
    'Code generation:': code_generation,
    'Embeddings:': embeddings,
    'Speech-to-text generation:': speech2text_generation,
    'Image-to-text:': image_to_text,
    'Image classification:': image_classification,
    'Image segmentation:': image_segmentation,
    'Zero-shot image classification:': zero_shot_image_classification,
    'Object detection:': object_detection,
};

// run tests
(async () => {
    let results = {};
    for (const [name, fn] of Object.entries(tests)) {
        results[name] = await fn();
        console.log(name, results[name]);
    }

    // Display final results in a table
    console.table(results);
})();

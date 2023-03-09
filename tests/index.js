
// Fix "ReferenceError: self is not defined" bug when running directly with node
// https://github.com/microsoft/onnxruntime/issues/13072
global.self = global;

const { pipeline, env } = require('..')

// Disable spawning worker threads for testing.
// This is done by setting numThreads to 1
env.onnx.wasm.numThreads = 1

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
        } else if (typeof val1 === 'number' && Math.abs(val1 - val2) > tol) {
            return false;
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

    // Run sentences through embedder
    let output = await embedder(sentences)

    // Compute pairwise cosine similarity
    // for (let i = 0; i < sentences.length; ++i) {
    //     for (let j = i + 1; j < sentences.length; ++j) {
    //         console.log(`(${i},${j}):`, embedder.cos_sim(output[i], output[j]))
    //     }
    // }

    let pairwiseScores = [[output[0], output[1]], [output[0], output[2]], [output[1], output[2]]].map(x => embedder.cos_sim(...x))

    return isDeepEqual(
        pairwiseScores,
        [0.8195198760573937, 0.6200714107649917, 0.5930511190112736]
    )
}


async function text_classification() {
    let classifier = await pipeline('text-classification', 'distilbert-base-uncased-finetuned-sst-2-english');

    let outputs1 = await classifier("I hated the movie");

    let outputs2 = await classifier("I hated the movie", {
        topk: 2
    });

    let texts = [
        "This was a masterpiece. Not completely faithful to the books, but enthralling from beginning to end. Might be my favorite of the three.",
        "I hated the movie"
    ];
    let outputs3 = await classifier(texts);
    let outputs4 = await classifier(texts, {
        topk: 2
    });

    return isDeepEqual(
        outputs1,
        [
            { "label": "NEGATIVE", "score": 0.9997429555167534 }
        ]
    ) && isDeepEqual(
        outputs2,
        [
            { "label": "NEGATIVE", "score": 0.9997429555167534 },
            { "label": "POSITIVE", "score": 0.00025704448324659145 }
        ]
    ) && isDeepEqual(
        outputs3,
        [
            { "label": "POSITIVE", "score": 0.9994557111289131 },
            { "label": "NEGATIVE", "score": 0.9997253840917294 }
        ]
    ) && isDeepEqual(
        outputs4,
        [[
            { "label": "POSITIVE", "score": 0.9994557111289131 },
            { "label": "NEGATIVE", "score": 0.0005442888710869216 }
        ], [
            { "label": "NEGATIVE", "score": 0.9997253840917294 },
            { "label": "POSITIVE", "score": 0.0002746159082707414 }
        ]]
    );
}

async function masked_language_modelling() {

    let unmasker = await pipeline('fill-mask', 'bert-base-uncased');

    let outputs1 = await unmasker("Once upon a [MASK].");

    let outputs2 = await unmasker([
        "Once upon a [MASK].",
        "[MASK] is the capital of England."
    ]);

    return isDeepEqual(
        outputs1,
        [
            { "score": 0.9318257314398266, "token": 2051, "token_str": "time", "sequence": "once upon a time." },
            { "score": 0.009929785838375943, "token": 13342, "token_str": "mattress", "sequence": "once upon a mattress." },
            { "score": 0.0021786265124432657, "token": 3959, "token_str": "dream", "sequence": "once upon a dream." },
            { "score": 0.0018818342753219423, "token": 2940, "token_str": "hill", "sequence": "once upon a hill." },
            { "score": 0.00174248982811121, "token": 2154, "token_str": "day", "sequence": "once upon a day." }
        ]
    ) && isDeepEqual(
        outputs2,
        [[
            { "score": 0.9828392675760468, "token": 2051, "token_str": "time", "sequence": "once upon a time." },
            { "score": 0.0027356224197534066, "token": 13342, "token_str": "mattress", "sequence": "once upon a mattress." },
            { "score": 0.00038447941793688455, "token": 2504, "token_str": "level", "sequence": "once upon a level." },
            { "score": 0.0003801222442318874, "token": 2940, "token_str": "hill", "sequence": "once upon a hill." },
            { "score": 0.00038011046274777236, "token": 6480, "token_str": "lifetime", "sequence": "once upon a lifetime." }
        ], [
            { "score": 0.3269098717200096, "token": 2414, "token_str": "london", "sequence": "london is the capital of england." },
            { "score": 0.0644894252551537, "token": 2009, "token_str": "it", "sequence": "it is the capital of england." },
            { "score": 0.03533688491081099, "token": 7067, "token_str": "bristol", "sequence": "bristol is the capital of england." },
            { "score": 0.025355694884844824, "token": 5087, "token_str": "manchester", "sequence": "manchester is the capital of england." },
            { "score": 0.023570900878368342, "token": 6484, "token_str": "birmingham", "sequence": "birmingham is the capital of england." }
        ]]
    );
}

async function question_answering() {

    let question = 'Who was Jim Henson?'
    let context = 'Jim Henson was a nice puppet.'

    let answerer = await pipeline('question-answering', 'distilbert-base-uncased-distilled-squad');
    let outputs = await answerer(question, context);

    let outputs2 = await answerer(question, context, {
        topk: 3,
    });

    return isDeepEqual(
        outputs,
        { answer: 'a nice puppet', score: 0.5664517462147087 }
    ) && isDeepEqual(
        outputs2,
        [
            { answer: 'a nice puppet', score: 0.5664517462147087 },
            { answer: 'nice puppet', score: 0.1698902311892322 },
            { answer: 'puppet', score: 0.14046058679856901 }
        ]
    );
}

async function summarization() {

    let summarizer = await pipeline('summarization', 'sshleifer/distilbart-cnn-6-6')

    let texts = [
        `The tower is 324 metres (1,063 ft) tall, about the same height as an 81-storey building, and the tallest structure in Paris. Its base is square, measuring 125 metres (410 ft) on each side. During its construction, the Eiffel Tower surpassed the Washington Monument to become the tallest man-made structure in the world, a title it held for 41 years until the Chrysler Building in New York City was finished in 1930. It was the first structure to reach a height of 300 metres. Due to the addition of a broadcasting aerial at the top of the tower in 1957, it is now taller than the Chrysler Building by 5.2 metres (17 ft). Excluding transmitters, the Eiffel Tower is the second tallest free-standing structure in France after the Millau Viaduct.`,
        `The Amazon rainforest (Portuguese: Floresta Amazônica or Amazônia; Spanish: Selva Amazónica, Amazonía or usually Amazonia; French: Forêt amazonienne; Dutch: Amazoneregenwoud), also known in English as Amazonia or the Amazon Jungle, is a moist broadleaf forest that covers most of the Amazon basin of South America. This basin encompasses 7,000,000 square kilometres (2,700,000 sq mi), of which 5,500,000 square kilometres (2,100,000 sq mi) are covered by the rainforest. This region includes territory belonging to nine nations. The majority of the forest is contained within Brazil, with 60% of the rainforest, followed by Peru with 13%, Colombia with 10%, and with minor amounts in Venezuela, Ecuador, Bolivia, Guyana, Suriname and French Guiana. States or departments in four nations contain "Amazonas" in their names. The Amazon represents over half of the planet's remaining rainforests, and comprises the largest and most biodiverse tract of tropical rainforest in the world, with an estimated 390 billion individual trees divided into 16,000 species.`
    ]
    let summary = await summarizer(texts)
    return isDeepEqual(
        summary,
        [{
            summary_text: " The Eiffel Tower is 324 metres tall, about the same height as an 81-storey building. It is the second tallest free-standing structure in France after the Millau Viaduct."
        }, {
            summary_text: " The Amazon rainforest is a moist broadleaf forest that covers most of the Amazon basin of South America. The Amazon represents over half of the planet's remaining rainforests."
        }]
    )
}

async function translation() {

    let translator = await pipeline('translation_en_to_de', 't5-small')

    let translation1 = await translator('Hello, how are you?')
    let texts = [
        'Hello, how are you?',
        'My name is Maria.',
    ]

    let translation2 = await translator(texts)

    return isDeepEqual(
        translation1,
        [{ "translation_text": "Hallo, wie sind Sie?" }]

    ) && isDeepEqual(
        translation2,
        [
            { 'translation_text': 'Hallo, wie sind Sie?' },
            { 'translation_text': 'Mein Name ist Maria.' }
        ]
    )
}

async function text_generation() {

    let generator = await pipeline('text-generation', 'distilgpt2')

    let output1 = await generator('Once upon a time, there was a', {
        max_new_tokens: 10,
    })

    let output2 = await generator('Once upon a time, there was a', {
        max_new_tokens: 10,
        num_beams: 2,
        num_return_sequences: 2
    })

    let output3 = await generator([
        'Once upon a time, there was a ',
        'My favorite food is',
    ], {
        max_new_tokens: 10,
        num_beams: 2,
        num_return_sequences: 2
    })

    return isDeepEqual(
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
        ],
        [
            { "generated_text": "My favorite food is the red-and-yellow-and-yellow" },
            { "generated_text": "My favorite food is the red-and-yellow-and-white" }
        ]]
    );
}


async function text2text_generation() {
    let generator1 = await pipeline('text2text-generation', 'google/flan-t5-small')
    let output1 = await generator1(
        "Premise:  At my age you will probably have learnt one lesson. " +
        "Hypothesis:  It's not certain how many lessons you'll learn by your thirties. " +
        "Does the premise entail the hypothesis?"
    )

    let generator2 = await pipeline('text2text-generation', 'google/flan-t5-base')
    let output2 = await generator2(`
        Q: Roger has 5 tennis balls. He buys 2 more cans of tennis balls. Each can
        has 3 tennis balls. How many tennis balls does he have now?
        A: Roger started with 5 balls. 2 cans of 3 tennis balls each is 6 tennis balls.
        5 + 6 = 11. The answer is 11.

        Q: A juggler can juggle 16 balls. Half of the balls are golf balls, and half
        of the golf balls are blue. How many blue golf balls are there?
    `);

    return isDeepEqual(
        output1,
        ['it is not possible to tell']
    ) && isDeepEqual(
        output2,
        ['The number of golf balls is 16 / 2 = 8 golf balls. The number of blue golf balls is 8 / 2 = 4 golf balls. The answer is 4.']
    )
}

async function speech2text_generation() {
    // TODO add test case
    // let audio = './tests/assets/jfk.wav';
    // let transcriber = await pipeline('automatic-speech-recognition')
    // let output = await transcriber(audio);
    // console.log(output);

    return true;
}

// hide unused initializer and node arguments warnings
console._warn = console.warn;
console.warn = (...data) => {
    if (!data[0].includes('CleanUnusedInitializersAndNodeArgs')) {
        console._warn(...data);
    }
};

// run tests
(async () => {
    console.log('Text classification:', await text_classification())
    console.log('Masked language modelling:', await masked_language_modelling())
    console.log('Question answering:', await question_answering())
    console.log('Summarization:', await summarization())
    console.log('Translation:', await translation())
    console.log('Text generation:', await text_generation())
    console.log('Embeddings:', await embeddings())
    console.log('Text-to-text generation:', await text2text_generation())
    console.log('Speech-to-text generation:', await speech2text_generation())

})();

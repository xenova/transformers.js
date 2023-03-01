async function text_classification() {
    let model_path = '/models/onnx/quantized/distilbert-base-uncased-finetuned-sst-2-english/sequence-classification'

    let classifier = await pipeline('text-classification', model_path);

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
    let model_path = '/models/onnx/quantized/bert-base-uncased/masked-lm'
    let classifier = await pipeline('fill-mask', model_path);


    let outputs1 = await classifier("Once upon a [MASK].");

    let outputs2 = await classifier([
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
    let model_path = '/models/onnx/quantized/distilbert-base-uncased-distilled-squad/question-answering'

    let question = 'Who was Jim Henson?'
    let context = 'Jim Henson was a nice puppet.'

    let answerer = await pipeline('question-answering', model_path);
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
    let model_path = '/models/onnx/quantized/sshleifer/distilbart-cnn-6-6/seq2seq-lm-with-past'
    let summarizer = await pipeline('summarization', model_path)

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
    let model_path = '/models/onnx/quantized/t5-small/seq2seq-lm-with-past'
    let translator = await pipeline('translation_en_to_de', model_path)

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
    let model_path = '/models/onnx/quantized/distilgpt2/causal-lm-with-past';
    let generator = await pipeline('text-generation', model_path)

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

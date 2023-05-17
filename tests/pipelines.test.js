
import { pipeline } from '../src/transformers.js';
import { init, m, MAX_TEST_EXECUTION_TIME } from './init.js';


// Initialise the testing environment
init();


function compare(val1, val2, tol = 0.1) {
    if (
        (val1 !== null && val2 !== null) &&
        (typeof val1 === 'object' && typeof val2 === 'object')
    ) {
        // Both are non-null objects

        if (Array.isArray(val1) && Array.isArray(val2)) {
            expect(val1).toHaveLength(val2.length);

            for (let i = 0; i < val1.length; ++i) {
                compare(val1[i], val2[i], tol);
            }

        } else {
            expect(Object.keys(val1)).toHaveLength(Object.keys(val2).length);

            for (let key in val1) {
                compare(val1[key], val2[key]);
            }
        }

    } else {
        // At least one of them is not an object
        // First check that both have the same type
        expect(typeof val1).toEqual(typeof val2);

        if (typeof val1 === 'number' && (!Number.isInteger(val1) || !Number.isInteger(val2))) {
            // If both are numbers and at least one of them is not an integer
            expect(val1).toBeCloseTo(val2, tol);
        } else {
            // Perform equality test
            expect(val1).toEqual(val2);
        }
    }
}


// NOTE:
// Due to a memory leak in Jest, we cannot have multiple tests for a single model.
// This is due to how model construction and destruction occurs, in `beforeAll` and `afterAll`, respectively.
// As a result, each test is responsible for exactly one model, but we run multiple inputs through it.
// By encapsulating model construction and destruction in a single `it` block, we avoid these memory issues.
describe('Pipelines', () => {

    describe('Text classification', () => {

        // List all models which will be tested
        const models = [
            'distilbert-base-uncased-finetuned-sst-2-english',
        ];

        it(models[0], async () => {
            let classifier = await pipeline('text-classification', m(models[0]));
            let texts = [
                "This was a masterpiece. Not completely faithful to the books, but enthralling from beginning to end. Might be my favorite of the three.",
                "I hated the movie"
            ];

            // single
            {
                let outputs = await classifier("I hated the movie");
                let expected = [
                    { "label": "NEGATIVE", "score": 0.9996212720870972 }
                ];
                compare(outputs, expected);
            }

            // single + topk
            {
                let outputs = await classifier("I hated the movie", {
                    topk: 2
                });
                let expected = [
                    { "label": "NEGATIVE", "score": 0.9996212720870972 },
                    { "label": "POSITIVE", "score": 0.0003787268069572747 }
                ];
                compare(outputs, expected);
            }

            // batched
            {
                let outputs = await classifier(texts);

                let expected = [
                    { "label": "POSITIVE", "score": 0.9993746876716614 },
                    { "label": "NEGATIVE", "score": 0.9996694326400757 }
                ];

                compare(outputs, expected);
            }


            // batched + topk
            {
                let outputs = await classifier(texts, {
                    topk: 2
                });

                let expected = [[
                    { "label": "POSITIVE", "score": 0.9993746876716614 },
                    { "label": "NEGATIVE", "score": 0.0006253048195503652 }
                ], [
                    { "label": "NEGATIVE", "score": 0.9996694326400757 },
                    { "label": "POSITIVE", "score": 0.00033057318069040775 }
                ]];

                compare(outputs, expected);
            }


            await classifier.dispose();

        }, MAX_TEST_EXECUTION_TIME);
    });

    describe('Token classification', () => {

        // List all models which will be tested
        const models = [
            'Davlan/bert-base-multilingual-cased-ner-hrl',
        ];

        it(models[0], async () => {
            let classifier = await pipeline('token-classification', m(models[0]));
            let texts = [
                "The Golden State Warriors are an American professional basketball team based in San Francisco.",
                "My name is Sarah and I live in London."
            ];

            // single
            {
                let outputs = await classifier(texts[0]);

                let expected = [
                    { entity: "B-ORG", score: 0.9998535513877869, index: 2, word: "Golden", start: null, end: null },
                    { entity: "I-ORG", score: 0.9998612999916077, index: 3, word: "State", start: null, end: null },
                    { entity: "I-ORG", score: 0.999866247177124, index: 4, word: "Warriors", start: null, end: null },
                    { entity: "B-LOC", score: 0.9997050166130066, index: 13, word: "San", start: null, end: null },
                    { entity: "I-LOC", score: 0.9987282156944275, index: 14, word: "Francisco", start: null, end: null }
                ];

                compare(outputs, expected, 0.05);

            }

            // batched
            {
                let outputs = await classifier(texts);

                let expected = [
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
                ];

                compare(outputs, expected, 0.05);
            }

            await classifier.dispose();

        }, MAX_TEST_EXECUTION_TIME);
    });

    describe('Zero-shot classification', () => {

        // List all models which will be tested
        const models = [
            'facebook/bart-large-mnli',
        ];

        it(models[0], async () => {
            let classifier = await pipeline('zero-shot-classification', m(models[0]));

            let sequences_to_classify = ['one day I will see the world', 'I love making pizza'];
            let candidate_labels = ['travel', 'cooking', 'dancing'];

            // single
            {
                let outputs = await classifier(sequences_to_classify[0], candidate_labels);
                let expected = {
                    sequence: "one day I will see the world",
                    labels: ["travel", "dancing", "cooking"],
                    scores: [0.4261703487477968, 0.2903585771517135, 0.28347107410048983]
                }

                compare(outputs, expected, 0.2);

            }

            // batched
            {
                let outputs = await classifier(sequences_to_classify, candidate_labels);
                let expected = [{
                    sequence: "one day I will see the world",
                    labels: ["travel", "dancing", "cooking"],
                    scores: [0.4261703487477968, 0.2903585771517135, 0.28347107410048983]
                }, {
                    sequence: "I love making pizza",
                    labels: ["cooking", "travel", "dancing"],
                    scores: [0.4660367922118968, 0.2756005926506238, 0.2583626151374795]
                }];

                compare(outputs, expected, 0.2);

            }


            // batched + multilabel
            {
                let outputs = await classifier(sequences_to_classify, candidate_labels, {
                    multi_label: true
                })
                let expected = [{
                    sequence: "one day I will see the world",
                    labels: ["travel", "dancing", "cooking"],
                    scores: [0.7108286792234982, 0.5763787804099745, 0.44303326070949994]
                }, {
                    sequence: "I love making pizza",
                    labels: ["cooking", "travel", "dancing"],
                    scores: [0.8527619536354446, 0.7899589317978243, 0.5838912691496106]
                }];

                compare(outputs, expected);

            }

            await classifier.dispose();
        }, MAX_TEST_EXECUTION_TIME);
    });

    describe('Masked language modelling', () => {

        // List all models which will be tested
        const models = [
            'bert-base-uncased',
        ];

        it(models[0], async () => {
            let unmasker = await pipeline('fill-mask', m(models[0]));
            let texts = [
                "Once upon a [MASK].",
                "[MASK] is the capital of England."
            ];

            // single
            {
                let outputs = await unmasker(texts[0]);
                let expected = [
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
                ];
                compare(outputs, expected);

            }


            // batched
            {
                let outputs = await unmasker(texts);

                let expected = [[
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
                ]];

                compare(outputs, expected);

            }

            await unmasker.dispose();
        }, MAX_TEST_EXECUTION_TIME);
    });

    describe('Question answering', () => {
        let question = 'Who was Jim Henson?'
        let context = 'Jim Henson was a nice puppet.'


        // List all models which will be tested
        const models = [
            'distilbert-base-uncased-distilled-squad',
        ];

        it(models[0], async () => {
            let answerer = await pipeline('question-answering', m(models[0]));

            // single
            {
                let outputs = await answerer(question, context);
                let expected = { answer: 'a nice puppet', score: 0.5664517526948352 };

                compare(outputs, expected, 0.2);
            }

            // single + topk
            {
                let outputs = await answerer(question, context, {
                    topk: 3,
                });
                let expected = [
                    { answer: 'a nice puppet', score: 0.5664517526948352 },
                    { answer: 'nice puppet', score: 0.1698902336448853 },
                    { answer: 'puppet', score: 0.14046057793125577 }
                ];

                compare(outputs, expected, 0.2);

            }
            await answerer.dispose();
        }, MAX_TEST_EXECUTION_TIME);
    });

    describe('Summarization', () => {

        // List all models which will be tested
        const models = [
            'sshleifer/distilbart-cnn-6-6',
            'facebook/bart-large-cnn',
        ];

        let texts = [
            `The tower is 324 metres (1,063 ft) tall, about the same height as an 81-storey building, and the tallest structure in Paris. Its base is square, measuring 125 metres (410 ft) on each side. During its construction, the Eiffel Tower surpassed the Washington Monument to become the tallest man-made structure in the world, a title it held for 41 years until the Chrysler Building in New York City was finished in 1930. It was the first structure to reach a height of 300 metres. Due to the addition of a broadcasting aerial at the top of the tower in 1957, it is now taller than the Chrysler Building by 5.2 metres (17 ft). Excluding transmitters, the Eiffel Tower is the second tallest free-standing structure in France after the Millau Viaduct.`,
            `The Amazon rainforest (Portuguese: Floresta Amazônica or Amazônia; Spanish: Selva Amazónica, Amazonía or usually Amazonia; French: Forêt amazonienne; Dutch: Amazoneregenwoud), also known in English as Amazonia or the Amazon Jungle, is a moist broadleaf forest that covers most of the Amazon basin of South America. This basin encompasses 7,000,000 square kilometres (2,700,000 sq mi), of which 5,500,000 square kilometres (2,100,000 sq mi) are covered by the rainforest. This region includes territory belonging to nine nations. The majority of the forest is contained within Brazil, with 60% of the rainforest, followed by Peru with 13%, Colombia with 10%, and with minor amounts in Venezuela, Ecuador, Bolivia, Guyana, Suriname and French Guiana. States or departments in four nations contain "Amazonas" in their names. The Amazon represents over half of the planet's remaining rainforests, and comprises the largest and most biodiverse tract of tropical rainforest in the world, with an estimated 390 billion individual trees divided into 16,000 species.`
        ];

        it(models[0], async () => {
            let summarizer = await pipeline('summarization', m(models[0]));

            // batched
            {
                let summary = await summarizer(texts, {
                    top_k: 0,
                    do_sample: false,
                });
                expect(summary).toHaveLength(2);
                expect(summary[0].summary_text.length).toBeGreaterThan(50);
                expect(summary[1].summary_text.length).toBeGreaterThan(50);
            }
            await summarizer.dispose();

        }, MAX_TEST_EXECUTION_TIME);


        it(models[1], async () => {
            let summarizer = await pipeline('summarization', m(models[1]));

            // batched + `forced_bos_token_id`
            {
                let summary = await summarizer(texts[0], {
                    top_k: 0,
                    do_sample: false,
                });
                expect(summary).toHaveLength(1);
                expect(summary[0].summary_text.length).toBeGreaterThan(50);
            }

            await summarizer.dispose();

        }, MAX_TEST_EXECUTION_TIME);
    });

    describe('Translation', () => {

        // List all models which will be tested
        const models = [
            't5-small',

            // Multilingual model
            'facebook/nllb-200-distilled-600M',
        ];

        it(models[0], async () => {
            let translator = await pipeline('translation_en_to_de', m(models[0]));
            let texts = [
                'Hello, how are you?',
                'My name is Maria.',
            ]

            // single
            {
                let translation = await translator(texts[0], {
                    top_k: 0,
                    do_sample: false
                });

                let expected = [
                    { "translation_text": "Hallo, wie sind Sie?" }
                ];

                compare(translation, expected);
            }

            // batched
            {
                let output = await translator(texts, {
                    top_k: 0,
                    do_sample: false
                });

                let expected = [
                    { 'translation_text': 'Hallo, wie sind Sie?' },
                    { 'translation_text': 'Mein Name ist Maria.' }
                ];

                compare(output, expected);

            }

            await translator.dispose();
        }, MAX_TEST_EXECUTION_TIME);


        it(models[1], async () => {
            let translator = await pipeline('translation', m(models[1]));
            let texts = [
                'Hello world!',
                'I like to walk my dog.',
            ]

            // single
            {
                let translation = await translator(texts[0], {
                    src_lang: 'eng_Latn',
                    tgt_lang: 'arb_Arab'
                });

                let expected = [
                    { 'translation_text': 'مرحباً عالمياً' }
                ];

                compare(translation, expected);
            };

            // single + back-translation
            {
                let translation1 = await translator(texts[1], {
                    // src_lang: 'eng_Latn',
                    tgt_lang: 'ell_Grek'
                });
                let translation2 = await translator(translation1[0].translation_text, {
                    src_lang: 'ell_Grek',
                    tgt_lang: 'eng_Latn'
                });

                let expected = [
                    { translation_text: 'Μου αρέσει να περπατάω το σκυλί μου.' }
                ]

                compare(translation1, expected);

                let expectedBack = [
                    { translation_text: texts[1] }
                ]
                compare(translation2, expectedBack);

            }

            await translator.dispose();
        }, MAX_TEST_EXECUTION_TIME);
    });

    describe('Text-to-text generation', () => {

        // List all models which will be tested
        const models = [
            'google/flan-t5-small',
            'google/flan-t5-base',
        ];

        it(models[0], async () => {
            let generator = await pipeline('text2text-generation', m(models[0]));
            let text = "Premise:  At my age you will probably have learnt one lesson. " +
                "Hypothesis:  It's not certain how many lessons you'll learn by your thirties. " +
                "Does the premise entail the hypothesis?";

            {
                let outputs = await generator(text, {
                    top_k: 0,
                    do_sample: false
                });
                expect(outputs).toHaveLength(1);
                expect(outputs[0].length).toBeGreaterThan(10);
            }

            await generator.dispose();

        }, MAX_TEST_EXECUTION_TIME);

        it(models[1], async () => {
            let generator = await pipeline('text2text-generation', m(models[1]));
            let text = `
            Q: Roger has 5 tennis balls. He buys 2 more cans of tennis balls. Each can
            has 3 tennis balls. How many tennis balls does he have now?
            A: Roger started with 5 balls. 2 cans of 3 tennis balls each is 6 tennis balls.
            5 + 6 = 11. The answer is 11.

            Q: A juggler can juggle 16 balls. Half of the balls are golf balls, and half
            of the golf balls are blue. How many blue golf balls are there?`;

            // single
            {
                let outputs = await generator(text, {
                    top_k: 0,
                    do_sample: false
                });
                expect(outputs).toHaveLength(1);
                expect(outputs[0].length).toBeGreaterThan(10);
            }
            await generator.dispose();
        }, MAX_TEST_EXECUTION_TIME);
    });

    describe('Text generation', () => {

        // List all models which will be tested
        const models = [
            'distilgpt2',

            'Salesforce/codegen-350M-mono',
        ];

        it(models[0], async () => {
            let generator = await pipeline('text-generation', m(models[0]));
            let texts = [
                'Once upon a time, there was a',
                'I enjoy walking with my cute dog',
            ];

            // single
            {
                let output = await generator(texts[0], {
                    max_new_tokens: 10,
                    top_k: 0,
                    do_sample: false
                })
                expect(output).toHaveLength(1);
                expect(output[0].generated_text.length).toBeGreaterThan(texts[0].length);
            }

            // single + `num_beams` + `num_return_sequences`
            {
                let output = await generator(texts[0], {
                    max_new_tokens: 10,
                    num_beams: 2,
                    num_return_sequences: 2,
                    top_k: 0,
                    do_sample: false
                })
                expect(output).toHaveLength(2);
                expect(output[0].generated_text.length).toBeGreaterThan(texts[0].length);
                expect(output[1].generated_text.length).toBeGreaterThan(texts[0].length);

            }

            // batched + `num_beams` + `num_return_sequences`
            {
                let output = await generator(texts, {
                    max_new_tokens: 10,
                    num_beams: 2,
                    num_return_sequences: 2,
                    top_k: 0,
                    do_sample: false
                });
                expect(output).toHaveLength(2);
                expect(output[0]).toHaveLength(2);
                expect(output[0][0].generated_text.length).toBeGreaterThan(texts[0].length);
                expect(output[0][1].generated_text.length).toBeGreaterThan(texts[0].length);
                expect(output[1]).toHaveLength(2);
                expect(output[1][0].generated_text.length).toBeGreaterThan(texts[1].length);
                expect(output[1][1].generated_text.length).toBeGreaterThan(texts[1].length);

            }

            await generator.dispose();

        }, MAX_TEST_EXECUTION_TIME);


        it(models[1], async () => {
            let generator = await pipeline('text-generation', m(models[1]));
            let code = 'def fib(n):';

            // single + `added_tokens`
            {
                let output = await generator(code, {
                    max_new_tokens: 45,
                    top_k: 0,
                    do_sample: false
                })
                expect(output).toHaveLength(1);
                expect(output[0].generated_text.length).toBeGreaterThan(code.length);
            }
            await generator.dispose();

        }, MAX_TEST_EXECUTION_TIME);
    });

    describe('Feature extraction', () => {

        // List all models which will be tested
        const models = [
            'sentence-transformers/all-MiniLM-L6-v2',

        ];

        it(models[0], async () => {
            let extractor = await pipeline('feature-extraction', m(models[0]));

            // Provide sentences
            let sentences = [
                'This framework generates embeddings for each input sentence',
                'Sentences are passed as a list of string.',
                'The quick brown fox jumps over the lazy dog.'
            ]

            // compare features
            {
                let output = await extractor(sentences);

                // Convert Tensor to JS list
                output = output.tolist();

                // Compute pairwise cosine similarity
                // for (let i = 0; i < sentences.length; ++i) {
                //     for (let j = i + 1; j < sentences.length; ++j) {
                //         console.log(`(${i},${j}):`, extractor.cos_sim(output[i], output[j]))
                //     }
                // }

                let pairwiseScores = [[output[0], output[1]], [output[0], output[2]], [output[1], output[2]]].map(x => extractor.cos_sim(...x))

                let expected = [0.502872309810269, 0.11088411026413121, 0.09602621986931259]
                compare(pairwiseScores, expected);
            }
            await extractor.dispose();

        }, MAX_TEST_EXECUTION_TIME);
    });

    // TODO
    // describe('Speech-to-text generation', () => {

    //     // List all models which will be tested
    //     const models = [
    //         'openai/whisper-tiny.en',
    //     ];

    //     it(models[0], async () => {
    //         let transcriber = await pipeline('automatic-speech-recognition', m(models[0]));
    //         let audio = './tests/assets/jfk.wav';

    //         {
    //             let output = await transcriber(audio);
    //             expect(output);
    //         }
    //         await transcriber.dispose();

    //     }, MAX_TEST_EXECUTION_TIME);
    // });

    describe('Image-to-text', () => {

        // List all models which will be tested
        const models = [
            'nlpconnect/vit-gpt2-image-captioning',
        ];

        it(models[0], async () => {
            let captioner = await pipeline('image-to-text', m(models[0]));

            let url = 'https://huggingface.co/datasets/mishig/sample_images/resolve/main/savanna.jpg';
            let urls = [
                'https://huggingface.co/datasets/mishig/sample_images/resolve/main/football-match.jpg',
                'https://huggingface.co/datasets/mishig/sample_images/resolve/main/airport.jpg'
            ]

            // single
            {
                let output = await captioner(url, {
                    top_k: 0,
                    do_sample: false
                })
                // let expected = [
                //     { "generated_text": "a herd of giraffes and zebras grazing in a field" }
                // ]

                expect(output).toHaveLength(1);
                expect(output[0].generated_text.length).toBeGreaterThan(10);
            }

            // single + generation options
            {
                let output = await captioner(url, {
                    max_new_tokens: 20,
                    num_beams: 2,
                    num_return_sequences: 2,
                    top_k: 0,
                    do_sample: false
                })
                // let expected = [
                //     { "generated_text": "a herd of giraffes and zebras grazing in a field" },
                //     { "generated_text": "a herd of giraffes and zebras in a grassy field" }
                // ]

                expect(output).toHaveLength(2);
                expect(output[0].generated_text.length).toBeGreaterThan(10);
                expect(output[1].generated_text.length).toBeGreaterThan(10);

            }

            // batched
            {
                let output = await captioner(urls, {
                    top_k: 0,
                    do_sample: false
                })
                // let expected = [
                //     [{ "generated_text": "two men are kicking a soccer ball in a soccer game" }],
                //     [{ "generated_text": "a plane on the tarmac with a passenger bus" }]
                // ]

                expect(output).toHaveLength(2);
                expect(output[0]).toHaveLength(1);
                expect(output[0][0].generated_text.length).toBeGreaterThan(10);
                expect(output[1]).toHaveLength(1);
                expect(output[1][0].generated_text.length).toBeGreaterThan(10);
            }

            // batched + generation options
            {
                let output = await captioner(urls, {
                    max_new_tokens: 20,
                    num_beams: 2,
                    num_return_sequences: 2,
                    top_k: 0,
                    do_sample: false
                })
                // let expected = [
                //     [
                //         { "generated_text": "two men are kicking a soccer ball on a field" },
                //         { "generated_text": "two men are kicking a soccer ball in a soccer game" }
                //     ], [
                //         { "generated_text": "a plane on a tarmac with a group of buses" },
                //         { "generated_text": "a plane on a tarmac with a group of people on the ground" }
                //     ]
                // ];

                expect(output).toHaveLength(2);
                expect(output[0]).toHaveLength(2);
                expect(output[0][0].generated_text.length).toBeGreaterThan(10);
                expect(output[0][1].generated_text.length).toBeGreaterThan(10);
                expect(output[1]).toHaveLength(2);
                expect(output[1][0].generated_text.length).toBeGreaterThan(10);
                expect(output[1][1].generated_text.length).toBeGreaterThan(10);

            }
            await captioner.dispose();
        }, MAX_TEST_EXECUTION_TIME);
    });

    describe('Image classification', () => {

        // List all models which will be tested
        const models = [
            'google/vit-base-patch16-224',
        ];

        it(models[0], async () => {
            let classifier = await pipeline('image-classification', m(models[0]));

            let url = 'https://huggingface.co/datasets/mishig/sample_images/resolve/main/tiger.jpg';
            let urls = [
                'https://huggingface.co/datasets/mishig/sample_images/resolve/main/palace.jpg',
                'https://huggingface.co/datasets/mishig/sample_images/resolve/main/teapot.jpg'
            ]

            // single
            {
                let outputs = await classifier(url);

                let expected = [
                    { "label": "tiger, Panthera tigris", "score": 0.607988178730011 }
                ];

                compare(outputs, expected, 0.2);

            }

            // single + topk
            {
                let outputs = await classifier(url, {
                    topk: 2
                });

                let expected = [
                    { "label": "tiger, Panthera tigris", "score": 0.607988178730011 },
                    { "label": "tiger cat", "score": 0.3877776563167572 }
                ];

                compare(outputs, expected, 0.2);
            }


            // batched
            {
                let outputs = await classifier(urls);

                let expected = [
                    { "label": "palace", "score": 0.9986862540245056 },
                    { "label": "teapot", "score": 0.987880527973175 }
                ];

                compare(outputs, expected);
            }

            // batched + topk
            {
                let outputs = await classifier(urls, {
                    topk: 2
                });

                let expected = [
                    [
                        { "label": "palace", "score": 0.9986862540245056 },
                        { "label": "castle", "score": 0.00037879671435803175 }
                    ],
                    [
                        { "label": "teapot", "score": 0.987880527973175 },
                        { "label": "coffeepot", "score": 0.006591461598873138 }
                    ]
                ];

                compare(outputs, expected);
            }

            await classifier.dispose();
        }, MAX_TEST_EXECUTION_TIME);
    });

    describe('Image segmentation', () => {

        // List all models which will be tested
        const models = [
            'facebook/detr-resnet-50-panoptic',
        ];

        it(models[0], async () => {
            let segmenter = await pipeline('image-segmentation', m(models[0]), {
                // Quantized version of model produces incorrect results
                quantized: false,
            })
            let img = 'https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/coco_sample.png';

            // single
            {
                let outputs = await segmenter(img);

                let expected = [
                    { score: 0.9916538596153259, label: 'cat', mask: 58998 },
                    { score: 0.9987397789955139, label: 'remote', mask: 4164 },
                    { score: 0.9994599223136902, label: 'remote', mask: 2275 },
                    { score: 0.9730215072631836, label: 'couch', mask: 176980 },
                    { score: 0.9993911385536194, label: 'cat', mask: 52670 }
                ];

                let outputLabels = outputs.map(x => x.label);
                let expectedLabels = expected.map(x => x.label);

                expect(outputLabels).toHaveLength(expectedLabels.length);
                expect(outputLabels.sort()).toEqual(expectedLabels.sort())
            }

            await segmenter.dispose();

        }, MAX_TEST_EXECUTION_TIME);
    });

    describe('Zero-shot image classification', () => {

        // List all models which will be tested
        const models = [
            'openai/clip-vit-base-patch32',
        ];

        it(models[0], async () => {
            let classifier = await pipeline('zero-shot-image-classification', m(models[0]));

            let url = 'https://huggingface.co/datasets/mishig/sample_images/resolve/main/football-match.jpg';
            let urls = [
                'https://huggingface.co/datasets/mishig/sample_images/resolve/main/football-match.jpg',
                'https://huggingface.co/datasets/mishig/sample_images/resolve/main/airport.jpg',
                'https://huggingface.co/datasets/mishig/sample_images/resolve/main/savanna.jpg',
            ]

            let classes = ['football', 'airport', 'animals'];

            // single
            {
                let output = await classifier(url, classes);

                let expected = [
                    { "score": 0.992206871509552, "label": "football" },
                    { "score": 0.0013248942559584975, "label": "airport" },
                    { "score": 0.006468251813203096, "label": "animals" }
                ]
                compare(output, expected, 0.1);

            }


            // batched
            {
                let output = await classifier(urls, classes);

                let expected = [
                    [
                        { "score": 0.9919875860214233, "label": "football" },
                        { "score": 0.0012227334082126617, "label": "airport" },
                        { "score": 0.006789708975702524, "label": "animals" }
                    ], [
                        { "score": 0.0003043194592464715, "label": "football" },
                        { "score": 0.998708188533783, "label": "airport" },
                        { "score": 0.0009874969255179167, "label": "animals" }
                    ], [
                        { "score": 0.015163016505539417, "label": "football" },
                        { "score": 0.016037866473197937, "label": "airport" },
                        { "score": 0.9687991142272949, "label": "animals" }
                    ]
                ];
                compare(output, expected, 0.1);

            }
            await classifier.dispose();
        }, MAX_TEST_EXECUTION_TIME);
    });

    describe('Object detection', () => {

        // List all models which will be tested
        const models = [
            'facebook/detr-resnet-50',
        ];

        it(models[0], async () => {
            let detector = await pipeline('object-detection', m(models[0]));

            // TODO add batched test cases when supported
            let url = 'https://huggingface.co/datasets/mishig/sample_images/resolve/main/savanna.jpg';
            let urls = ['https://huggingface.co/datasets/mishig/sample_images/resolve/main/airport.jpg']

            // single + threshold
            {
                let output = await detector(url, {
                    threshold: 0.9,
                });

                // let expected = {
                //     "boxes": [
                //         [352.8210112452507, 247.36732184886932, 390.5271676182747, 318.09066116809845],
                //         [111.15852802991867, 235.34255504608154, 224.96717244386673, 325.21119117736816],
                //         [13.524770736694336, 146.81672930717468, 207.97560095787048, 278.6452639102936],
                //         [187.396682202816, 227.97491312026978, 313.05202156305313, 300.26460886001587],
                //         [201.60082161426544, 230.86223602294922, 312.1393972635269, 306.5505266189575],
                //         [365.85242718458176, 95.3144109249115, 526.5485098958015, 313.17670941352844]
                //     ],
                //     "classes": [24, 24, 25, 24, 24, 25],
                //     "scores": [0.9989480376243591, 0.9990893006324768, 0.9690554738044739, 0.9274907112121582, 0.9714975953102112, 0.9989491105079651],
                //     "labels": ["zebra", "zebra", "giraffe", "zebra", "zebra", "giraffe"]
                // };

                let num_classes = output.boxes.length;
                expect(num_classes).toBeGreaterThan(1);
                expect(output.classes.length).toEqual(num_classes);
                expect(output.scores.length).toEqual(num_classes);
                expect(output.labels.length).toEqual(num_classes);

            }

            // single + threshold + percentage
            {
                let output = await detector(urls, {
                    threshold: 0.9,
                    percentage: true
                });

                // let expected = [{
                //     "boxes": [
                //         [0.7231650948524475, 0.32641804218292236, 0.981127917766571, 0.9918863773345947],
                //         [0.7529061436653137, 0.52558633685112, 0.8229959607124329, 0.6482008993625641],
                //         [0.5080368518829346, 0.5156279355287552, 0.5494132041931152, 0.5434067696332932],
                //         [0.33636586368083954, 0.5217841267585754, 0.3535611182451248, 0.6151944994926453],
                //         [0.42090220749378204, 0.4482414871454239, 0.5515891760587692, 0.5207531303167343],
                //         [0.1988394856452942, 0.41224047541618347, 0.45213085412979126, 0.5206181704998016],
                //         [0.5063001662492752, 0.5170856416225433, 0.5478668659925461, 0.54373899102211],
                //         [0.5734506398439407, 0.4508090913295746, 0.7049560993909836, 0.6252130568027496],
                //     ],
                //     "classes": [6, 1, 8, 1, 5, 5, 3, 6],
                //     "scores": [0.9970788359642029, 0.996989905834198, 0.9505048990249634, 0.9984546899795532, 0.9942372441291809, 0.9989550709724426, 0.938920259475708, 0.9992448091506958],
                //     "labels": ["bus", "person", "truck", "person", "airplane", "airplane", "car", "bus"]
                // }];

                expect(output).toHaveLength(urls.length);

                let num_classes = output[0].boxes.length;
                expect(num_classes).toBeGreaterThan(1);
                expect(output[0].classes.length).toEqual(num_classes);
                expect(output[0].scores.length).toEqual(num_classes);
                expect(output[0].labels.length).toEqual(num_classes);
            }

            await detector.dispose();
        }, MAX_TEST_EXECUTION_TIME);
    });
});

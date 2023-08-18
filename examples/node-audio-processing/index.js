import { pipeline } from '@xenova/transformers';
import wavefile from 'wavefile';

// Load model
let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');

// Load audio data
let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav';
let buffer = Buffer.from(await fetch(url).then(x => x.arrayBuffer()))

// Read .wav file and convert it to required format
let wav = new wavefile.WaveFile(buffer);
wav.toBitDepth('32f'); // Pipeline expects input as a Float32Array
wav.toSampleRate(16000); // Whisper expects audio with a sampling rate of 16000
let audioData = wav.getSamples();
if (Array.isArray(audioData)) {
    if (audioData.length > 1) {
        const SCALING_FACTOR = Math.sqrt(2);

        // Merge channels (into first channel to save memory)
        for (let i = 0; i < audioData[0].length; ++i) {
            audioData[0][i] = SCALING_FACTOR * (audioData[0][i] + audioData[1][i]) / 2;
        }
    }

    // Select first channel
    audioData = audioData[0];
}

// Run model
let start = performance.now();
let output = await transcriber(audioData);
let end = performance.now();
console.log(`Execution duration: ${(end - start) / 1000} seconds`);
console.log(output);
// { text: ' And so my fellow Americans ask not what your country can do for you, ask what you can do for your country.' }

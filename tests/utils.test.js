
import { AutoProcessor } from '../src/transformers.js';
import { mel_filter_bank } from '../src/utils/audio.js';

import { MAX_TEST_EXECUTION_TIME } from './init.js';

describe('Utilities', () => {

    describe('Audio utilities', () => {

        it('should calculate MEL filters', async () => {

            // NOTE: Uses official HF implementation as reference:
            const processor = await AutoProcessor.from_pretrained('openai/whisper-tiny.en');
            const config = processor.feature_extractor.config;

            // True MEL filters
            const original_mel_filters = config.mel_filters;

            // Calculated MEL filters
            const calculated_mel_filters = mel_filter_bank(
                1 + Math.floor(config.n_fft / 2), // num_frequency_bins
                config.feature_size, // num_mel_filters
                0.0, // min_frequency,
                22050.0, // max_frequency
                config.sampling_rate, // sampling_rate
                "slaney", // norm
                "slaney", // mel_scale
            );

            let offset = 0;
            let maxdiff = 0;
            for (let i = 0; i < original_mel_filters.length; ++i) {
                for (let j = 0; j < original_mel_filters[i].length; ++j) {
                    const expected = original_mel_filters[i][j];
                    const calculated = calculated_mel_filters.data[offset++];

                    const diff = Math.abs(expected - calculated);
                    maxdiff = Math.max(maxdiff, diff);
                }
            }

            expect(maxdiff).toBeLessThan(1e-6);

        }, MAX_TEST_EXECUTION_TIME);

    });
});

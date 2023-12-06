
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
                Math.floor(1 + config.n_fft / 2), // num_frequency_bins
                config.feature_size, // num_mel_filters
                0.0, // min_frequency
                8000.0, // max_frequency
                config.sampling_rate, // sampling_rate
                "slaney", // norm
                "slaney", // mel_scale
            );

            const original = original_mel_filters.flat();
            const calculated = calculated_mel_filters.flat();

            // Compute max difference
            const maxdiff = original.reduce((maxdiff, _, i) => {
                const diff = Math.abs(original[i] - calculated[i]);
                return Math.max(maxdiff, diff);
            }, -Infinity);
            expect(maxdiff).toBeGreaterThanOrEqual(0);
            expect(maxdiff).toBeLessThan(1e-6);

        }, MAX_TEST_EXECUTION_TIME);

    });
});

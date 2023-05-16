
import { AutoProcessor } from '../src/transformers.js';
import { getMelFilters } from '../src/utils/audio.js';

import { MAX_TEST_EXECUTION_TIME, m } from './init.js';

describe('Utilities', () => {

    describe('Audio utilities', () => {

        it('should calculate MEL filters', async () => {

            // NOTE: Uses official HF implementation as reference:
            let processor = await AutoProcessor.from_pretrained('openai/whisper-tiny.en');

            let config = processor.feature_extractor.config;

            let maxdiff = 0;

            // True MEL filters
            let original_mel_filters = config.mel_filters;

            // Calculated MEL filters
            let calculated_mel_filters = getMelFilters(config.sampling_rate, config.n_fft, config.feature_size);

            for (let i = 0; i < original_mel_filters.length; ++i) {
                for (let j = 0; j < original_mel_filters[i].length; ++j) {
                    const expected = original_mel_filters[i][j];
                    const calculated = calculated_mel_filters[i][j];

                    const diff = Math.abs(expected - calculated);
                    maxdiff = Math.max(maxdiff, diff);
                }
            }

            expect(maxdiff).toBeLessThan(1e-6);

        }, MAX_TEST_EXECUTION_TIME);

    });
});

import { AutoProcessor, hamming, hanning, mel_filter_bank } from "../../src/transformers.js";
import { getFile } from "../../src/utils/hub.js";
import { RawImage } from "../../src/utils/image.js";

import { MAX_TEST_EXECUTION_TIME } from "../init.js";
import { compare } from "../test_utils.js";

describe("Utilities", () => {
  describe("Audio utilities", () => {
    it(
      "should calculate MEL filters",
      async () => {
        // NOTE: Uses official HF implementation as reference:
        const processor = await AutoProcessor.from_pretrained("openai/whisper-tiny.en");
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
      },
      MAX_TEST_EXECUTION_TIME,
    );

    it(
      "should calculate window",
      async () => {
        compare(hanning(10), new Float64Array([0.0, 0.11697777844051105, 0.41317591116653485, 0.75, 0.9698463103929542, 0.9698463103929542, 0.75, 0.41317591116653485, 0.11697777844051105, 0.0]));
        compare(hamming(10), new Float64Array([0.08000000000000002, 0.1876195561652702, 0.46012183827321207, 0.7700000000000001, 0.9722586055615179, 0.9722586055615179, 0.7700000000000001, 0.46012183827321207, 0.1876195561652702, 0.08000000000000002]));
      },
      MAX_TEST_EXECUTION_TIME,
    );
  });

  describe("Hub utilities", () => {
    it("Read data from blob", async () => {
      const blob = new Blob(["Hello, world!"], { type: "text/plain" });
      const blobUrl = URL.createObjectURL(blob);
      const data = await getFile(blobUrl);
      expect(await data.text()).toBe("Hello, world!");
    });
  });

  describe("Image utilities", () => {
    it("Read image from URL", async () => {
      const image = await RawImage.fromURL("https://picsum.photos/300/200");
      expect(image.width).toBe(300);
      expect(image.height).toBe(200);
      expect(image.channels).toBe(3);
    });

    it("Can resize image", async () => {
      const image = await RawImage.fromURL("https://picsum.photos/300/200");
      const resized = await image.resize(150, 100);
      expect(resized.width).toBe(150);
      expect(resized.height).toBe(100);
    });

    it("Can resize with aspect ratio", async () => {
      const image = await RawImage.fromURL("https://picsum.photos/300/200");
      const resized = await image.resize(150, null);
      expect(resized.width).toBe(150);
      expect(resized.height).toBe(100);
    });

    it("Returns original image if width and height are null", async () => {
      const image = await RawImage.fromURL("https://picsum.photos/300/200");
      const resized = await image.resize(null, null);
      expect(resized.width).toBe(300);
      expect(resized.height).toBe(200);
    });
  });
});

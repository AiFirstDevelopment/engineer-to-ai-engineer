// Text to vector, on this machine. The model is all-MiniLM-L6-v2, a small sentence-embedding
// model: it turns any text into 384 numbers, so that texts with similar meaning get vectors that
// point the same way. It is downloaded once, into node_modules/@huggingface/transformers/.cache.
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

const MODEL = "Xenova/all-MiniLM-L6-v2";

let extractor: FeatureExtractionPipeline | undefined;

export async function embed(text: string): Promise<Float32Array> {
  extractor ??= await pipeline("feature-extraction", MODEL);
  // One vector per text (mean over its tokens), scaled to length 1.
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return output.data as Float32Array;
}

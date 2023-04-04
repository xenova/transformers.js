/**
 * Constructs a pipeline for a specified task with optional model and progress callback.
 *
 * @async
 * @function
 * @param {string} task - The task to perform, e.g. "text-generation".
 * @param {string} [model=null] - The name of the pre-trained model to use. If not specified, the default model for the task will be used.
 * @param {object} [options] - Optional parameters for the pipeline.
 * @param {function} [options.progress_callback=null] - A function to call with progress updates.
 * @returns {Promise<Pipeline>} A Pipeline object for the specified task.
 * @todo fix error below
 * @throws {Error} If an unsupported pipeline is requested.
 */
export function pipeline(task: string, model?: string, { progress_callback }?: {
    progress_callback?: Function;
}): Promise<Pipeline>;
/**
 * Pipeline class for executing a natural language processing task.
 * @extends Callable
 */
declare class Pipeline extends Callable {
    /**
     * Creates a new instance of Pipeline.
     * @param {string} task - The natural language processing task to be performed.
     * @param {object} tokenizer - The tokenizer object to be used for tokenizing input texts.
     * @param {object} model - The model object to be used for processing input texts.
     */
    constructor(task: string, tokenizer: object, model: object);
    task: string;
    tokenizer: any;
    model: any;
    /**
     * Disposes the model.
     * @returns {Promise<void>} - A promise that resolves when the model has been disposed.
     */
    dispose(): Promise<void>;
    /**
     * Executes the natural language processing task.
     * @param {any} texts - The input texts to be processed.
     * @returns {Promise<any>} - A promise that resolves to an array containing the inputs and outputs of the task.
     */
    _call(texts: any): Promise<any>;
}
import { Callable } from "./utils.js";
export {};

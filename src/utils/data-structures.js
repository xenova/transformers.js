
/**
 * Efficient Heap-based Implementation of a Priority Queue.
 * It uses an array-based binary heap, where the root is at index `0`, and the
 * children of node `i` are located at indices `2i + 1` and `2i + 2`, respectively.
 * 
 * Adapted from the following sources:
 * - https://stackoverflow.com/a/42919752/13989043 (original)
 * - https://github.com/belladoreai/llama-tokenizer-js (minor improvements)
 */
export class PriorityQueue {

    /**
     * Create a new PriorityQueue.
     * @param {Function} comparator Comparator function to determine priority. Defaults to a MaxHeap.
     */
    constructor(comparator = (a, b) => a > b) {
        this._heap = [];
        this._comparator = comparator;
    }

    /**
     * The size of the queue
     */
    get size() {
        return this._heap.length;
    }

    /**
     * Check if the queue is empty.
     * @returns {boolean} `true` if the queue is empty, `false` otherwise.
     */
    isEmpty() {
        return this.size === 0;
    }

    /**
     * Return the element with the highest priority in the queue.
     * @returns {any} The highest priority element in the queue.
     */
    peek() {
        return this._heap[0];
    }

    /**
     * Add one or more elements to the queue.
     * @param  {...any} values The values to push into the queue.
     * @returns {number} The new size of the queue.
     */
    push(...values) {
        return this.extend(values);
    }

    /**
     * Add multiple elements to the queue.
     * @param {any[]} values The values to push into the queue.
     * @returns {number} The new size of the queue.
     */
    extend(values) {
        for (const value of values) {
            this._heap.push(value);
            this._siftUp();
        }
        return this.size;
    }

    /**
     * Remove and return the element with the highest priority in the queue.
     * @returns {any} The element with the highest priority in the queue.
     */
    pop() {
        const poppedValue = this.peek();
        const bottom = this.size - 1;
        if (bottom > 0) {
            this._swap(0, bottom);
        }
        this._heap.pop();
        this._siftDown();
        return poppedValue;
    }

    /**
     * Replace the element with the highest priority in the queue with a new value.
     * @param {*} value The new value.
     * @returns {*} The replaced value.
     */
    replace(value) {
        const replacedValue = this.peek();
        this._heap[0] = value;
        this._siftDown();
        return replacedValue;
    }

    /**
     * Compute the index for the parent of the node at index `i`.
     * @param {number} i The index of the node to get the parent of.
     * @returns {number} The index of the parent node.
     * @private
     */
    _parent(i) {
        return ((i + 1) >>> 1) - 1;
    }

    /**
     * Compute the index for the left child of the node at index `i`.
     * @param {number} i The index of the node to get the left child of.
     * @returns {number} The index of the left child.
     * @private
     */
    _left(i) {
        return (i << 1) + 1;
    }

    /**
     * Compute the index for the right child of the node at index `i`.
     * @param {number} i The index of the node to get the right child of.
     * @returns {number} The index of the right child.
     * @private
     */
    _right(i) {
        return (i + 1) << 1;
    }

    /**
     * Check if the element at index `i` is greater than the element at index `j`.
     * @param {number} i The index of the first element to compare.
     * @param {number} j The index of the second element to compare.
     * @returns {boolean} `true` if the element at index `i` is greater than the element at index `j`, `false` otherwise.
     * @private
     */
    _greater(i, j) {
        return this._comparator(this._heap[i], this._heap[j]);
    }

    /**
     * Swap the elements at indices `i` and `j`.
     * @param {number} i The index of the first element to swap.
     * @param {number} j The index of the second element to swap.
     * @private
     */
    _swap(i, j) {
        const temp = this._heap[i];
        this._heap[i] = this._heap[j];
        this._heap[j] = temp;
    }

    /**
     * Maintain the heap property by updating positions in the heap,
     * starting at the last element and moving up the heap.
     * @private
     */
    _siftUp() {
        let node = this.size - 1;
        while (node > 0 && this._greater(node, this._parent(node))) {
            this._swap(node, this._parent(node));
            node = this._parent(node);
        }
    }
    /**
     * Maintain the heap property by updating positions in the heap,
     * starting at the first element and moving down the heap.
     * @private
     */
    _siftDown() {
        let node = 0;
        while (
            (this._left(node) < this.size && this._greater(this._left(node), node)) ||
            (this._right(node) < this.size && this._greater(this._right(node), node))
        ) {
            const maxChild = (this._right(node) < this.size && this._greater(this._right(node), this._left(node)))
                ? this._right(node)
                : this._left(node);
            this._swap(node, maxChild);
            node = maxChild;
        }
    }
}

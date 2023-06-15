
/**
 * Deep equality test (for arrays and objects) with tolerance for floating point numbers
 * @param {any} val1 The first item
 * @param {any} val2 The second item
 * @param {number} tol Tolerance for floating point numbers
 */
export function compare(val1, val2, tol = 0.1) {
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
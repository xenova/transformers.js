
/**
 * Check if two arrays are the same:
 * Adapted from https://stackoverflow.com/a/16436975/13989043
 * @param {any[]} a 
 * @param {any[]} b 
 * @returns {boolean} True if the arrays are equal, false if not
 */
function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export function isDeepEqual(obj1, obj2, {
    tol = 1e-3
} = {}) {
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
        return arraysEqual(obj1, obj2);
    }

    // Get the keys of both objects
    const obj1Keys = Object.keys(obj1);
    const obj2Keys = Object.keys(obj2);

    // If the objects have different number of keys, they're not equal
    if (obj1Keys.length !== obj2Keys.length) {
        return false;
    }

    // Compare each key-value pair recursively
    for (const key of obj1Keys) {
        const val1 = obj1[key];
        const val2 = obj2[key];

        // If the values are objects, compare them recursively
        if (typeof val1 === 'object' && typeof val2 === 'object') {
            if (!isDeepEqual(val1, val2)) {
                return false;
            }
        } else if (typeof val1 !== typeof val2) {
            // Types are not the same
            return false;
        } else if (typeof val1 === 'number') {
            return Math.abs(val1 - val2) <= tol;
        } else if (val1 !== val2) {
            // If the values are not objects, compare them directly
            return false;
        }
    }

    // If all key-value pairs are equal, the objects are deep equal
    return true;
}

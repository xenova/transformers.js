
// Returns a radom hex color code, i.e. #CD5C5C
function generateRandomColor(){
    let maxVal = 0xFFFFFF;
    let randomNumber = Math.random() * maxVal; 
    randomNumber = Math.floor(randomNumber);
    randomNumber = randomNumber.toString(16);
    let randColor = randomNumber.padStart(6, 0);   
    return `#${randColor.toUpperCase()}`
}


function getScaledCoordinates(box, img) {
    // Get the original dimensions of the image
    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;

    // Get the scaled dimensions of the image
    const scaledWidth = img.offsetWidth; // The image should be exactly 400px wide
    const scaledHeight = img.offsetHeight;

    // Calculate the scaling factor
    const scale = scaledWidth / originalWidth;

    // Scale the box boundaries according to the scaled image
    let ymax = box.ymax * scale;
    let xmax = box.xmax * scale;
    let ymin = box.ymin * scale;
    let xmin = box.xmin * scale;
    
    // Make sure the minimum values are are at least 0 and the maximum values
    // are less than the width/height of the image
    ymin = Math.max(0, box.ymin * scale) 
    xmin = Math.max(0, box.xmin * scale) 
    ymax = Math.min(scaledHeight, ymax)
    xmax = Math.min(scaledWidth, xmax)
    
    return {
        ymin,
        xmin,
        ymax,
        xmax
    }
}


// Removes all the elements with a given class from the DOM
function removeElements(className) {
    const HTMLcollection = document.getElementsByClassName(className)
    Array.from(HTMLcollection).forEach(element => element.remove())
}

export { generateRandomColor, removeElements, getScaledCoordinates }
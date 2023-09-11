# Building a Vanilla JavaScript Application

In this tutorial, you’ll build a simple JavaScript application that detects objects in images using Transformers.js. The app requires no server, external libraries, or build tools... all you need is a code editor and a browser!

Here's how it works: the user uploads an image to the browser via the “Upload image” button. The app then downloads an AI model, runs the image through it, and finally displays an overview of where the different objects are located, like this:

![Demo](https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/js-detection-interence-zebra.png)

**************************Useful links:**************************

- [Demo site](https://huggingface.co/spaces/Scrimba/javascript-object-detector)
- [Interactive code walk-through (scrim)](https://scrimba.com/scrim/co87f4ae7aea87a94a732f298)
- [Source code](https://huggingface.co/spaces/Scrimba/javascript-object-detector/tree/main)

## Step 1:  Setup the HTML and CSS

The first thing we'll do is create some markup and styling. Create an in `index.html` file with a basic HTML skeleton, and add the following `<main>` tag to the `<body>`:

```html
<main>
	<label class="upload-button">
		<input id="file-upload" type="file" accept="image/png,image/jpeg"/>
		<img class="upload-icon" src="upload-icon.png" /> 
	  	Upload image
	</label>
	<div id="image-container"></div>
	<p id="status"></p>
</main>
```

Let’s break it down:

We’re adding an `<input>` element with `type="file"`. This gives the user the ability to pick an image from their local files. The default styling for this element looks pretty bad, so we are going to style it as a nice button instead. The easiest way to achieve this is to wrap the `<input>` element in a `<label>`, hide the input, and then style the label as a button.

We’re also adding an empty `<div>` container for displaying the image, plus an empty `<p>` tag that we'll use to give status updates to the user as we're downloading and running the model, as both of these operations take some time.

Next, add the following CSS rules in a `style.css` file and and link it to the HTML:

```css
html, body {
    margin: 20px;
    font-family: Arial, Helvetica, sans-serif;
}

main {
    margin: 0 auto;
    width: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.upload-button {
	border: 2px solid black;
    padding: 8px 16px;
    cursor: pointer;
	border-radius: 6px;
    display: flex;
    align-items: center;
}

input[type="file"] {
    display: none;
}

.upload-icon {
    width: 30px;
    margin-right: 10px;
}

#image-container {
    margin-top: 20px;
    position: relative;
}

#image-container img {
    width: 400px;
}

```

If you drag and drop the `index.html` file into a browser, you should see the following:

![Demo](https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/js-detection-btn.png)


## Step 2:  JavaScript setup

The next step is to link our HTML file to a script. Add the following tag at the end of the `<body>` in the HTML file:

```html
<script src="./index.js" type="module"></script>
```

The `type="module"` attribute is important, as it turns our file into a JavaScript module, meaning that we’ll be able to use imports and exports. This immediately comes in handy, as we’ll import the Transformers.js library from their CDN via the import keyword at the top of our `index.js` file:

```js
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.3';
```

We also need to import a few useful functions from `utils.js` (that we’ll use towards the end of the tutorial) as well as grab ahold of all the DOM elements we need to access via JavaScript.

```js
const fileUploadElement = document.getElementById('file-upload');
const imageContainer = document.getElementById("image-container");
const statusParagraph = document.getElementById("status");
```

## Step 3:  Create the image uploader

The next step is to enable users to upload images. To achieve this, we will listen for "change" events from the `fileUploadElement` and use a `FileReader()` to read the content of the image:

```js
fileUploadElement.addEventListener('change', function(e) {
    const file = e.target.files[0];
    const fr = new FileReader();
    fr.onload = onFileReaderLoad;
    fr.readAsDataURL(file);
});
```

Once the image has been properly loaded into the browser, the `onFileReaderLoad` callback function will be invoked, which will give us access to all the necessary data about the image. 

Let’s display the image to the user by doing the following:

```js
function onFileReaderLoad(e) {
    const base64String = e.target.result;
    const imageEl = document.createElement('img')
    imageEl.src = base64String;
    imageContainer.appendChild(imageEl);		
}
```

At this point, you might be wondering what `base64String` is all about. Since we aren’t using a server, we can't host the image via a URL. Instead, we’ll grab ahold of the *base64* version of the image, which simply is a long string of characters and symbols. This string can be embedded into our HTML, allowing us to display the image without the need for a server.

Try to run the app and upload an image to the browser to make sure your code is working properly. You should see your image displayed underneath the button like this:

![Demo](https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/js-detection-btn-img.png)

## Step 4:  Download and run the model

We’re finally ready to start interacting with Transformers.js! This will be done within a function called  `runModel()`. We’ll invoke this one at the end of our `onFileReaderLoad()` function:

```js
function onFileReaderLoad(e) {
    const base64String = e.target.result;
    const imageEl = document.createElement('img')
    imageEl.src = base64String;
    imageContainer.appendChild(imageEl);

		runModel(imageEl);
		
}
```

The `runModel()` function needs to be asynchronous, as we’ll use the `await` keyword when we’re downloading and running the model. Let’s look at the first two lines of `runModel()`:

```js
async function runModel(imageEl) {
    statusParagraph.textContent = "Loading model..."
    const detector = await pipeline('object-detection', 'Xenova/detr-resnet-50');
    // ...
}
```

The first thing we’re doing is to update the text in the `statusParagraph` so that the user knows that we’re about to download the model, as this can take some time. Then, we start downloading it by invoking the `pipeline()` function that we imported at the top of our file.

We’re passing two arguments into the `pipeline()` function. The first one tells Transformers.js what kind of task we want to perform. In our case, that is `object-detection`, but there are tons of other tasks you can perform as well. Here’s a few of them.

- `text-generation`
- `sentiment-analysis`
- `summarization`
- `automatic-speech-recognition`

…and many more. See a full overview [here.](https://huggingface.co/docs/transformers.js/pipelines#tasks)

The second argument in the `pipeline()` function specifies which underlying model we would like to use to solve the given task, as each task can usually be solved by many different models. We will use `'Xenova/detr-resnet-50'`, as it is a small but powerful model for object detection in images. It is only about 20MB in size, so it will be reasonably fast to download.

<aside>
💡 Please note that the browser will freeze when downloading the model. This is because JavaScript is single-threaded, so it can only do one thing at a time. To avoid this , you’ll need to use a web worker to download the model in the background.

</aside>

Once the model has been downloaded, we're ready to perform the so-called inference, which simply means to run the model with some data. This is done via the `detector()` function that was returned from the `pipeline()`. 

Modify your `runModel()` function to look like the following:

```js
async function runModel(imageEl) {
	statusParagraph.textContent = "Loading model..."
	const detector = await pipeline('object-detection', 'Xenova/detr-resnet-50');
	status.textContent = "Analysing ..."
	statusParagraph.textContent = "Analysing ..."  
	const output = await detector(imageEl.src, { threshold: 0.9 });
	console.log(output);
}
```

As you can see, we’re passing `imageEl.src` (the base64 string) as the first argument in the `detector()` function, and an options object as the second one. In the options object, we're setting the `threshold` property to 0.9. This means that we want the model to be 90% confident before claiming it has detected an object in the image. The lower you set this value, the more objects it'll detect, but the more mistakes it'll make as well.

Try to run the app, upload an image, and open up the console. You should see the `output` variable logged out like this: 

![Demo](https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/js-detection-console.png)


In the example above, we uploaded the image of the two elephants, so the `output` variable holds an array with two objects. Both objects have a key called `label`, which has the value “elephant”.  The also have `box` objects that contains the coordinates for each of the animals. 

Notice that the score is more than 0.99 for both, which means that the models is almost 100% sure it spotted two elephants. And indeed it did.

## Step 5:  Render the boxes

The final step is to turn the `box` coordinates into rectangles around each of the elephants.

At the end of our `runModel()` function, we’ll loop through each of the objects in the `output` array, and then call `renderBox()` while passing in the given object and the `imageEl`.

```js
output.forEach(object => {
	renderBox(object, imageEl)
})
```

Before we create that `renderBox()` function, we need to import some utilities. Follow these two steps to do that:

1. Add [this utils.js file](https://huggingface.co/spaces/Scrimba/javascript-object-detector/blob/main/utils.js) to the same directory as `index.js`. It contains a few helper functions that will prevent the `index.js` file from growing too large. I won’t go into details about the code, but I’ve added code comments that explains each of the functions.
2. Import the functions from `utils.js` by adding this line at the top of `index.js`:
    
```js
import { generateRandomColor, removeElements, getScaledCoordinates } from './utils.js'
```
    

With that out of the way, let’s create the `renderBox()` function. Look through the code below and read the comments to understand what’s going on:

```js
function renderBox(data, imageEl) {
    const { box, label} = data;

	// We're setting the width of the image to 400px when rendering it,
	// so we need to scale the coordinates accordingly as well 
    const {xmax, xmin, ymax, ymin } = getScaledCoordinates(box, imageEl)

	// Getting a random color for the box and label
    const color = generateRandomColor();

    // Calculate the width and height of the bounding box
    const boxWidth = xmax - xmin;
    const boxHeight = ymax - ymin;

    // Draw the box
    const boundingBoxElement = document.createElement("div");
    boundingBoxElement.className = "bounding-box";
    boundingBoxElement.style.border = `2px solid ${color}`
    boundingBoxElement.style.left = xmin + "px";
    boundingBoxElement.style.top = ymin + "px";
    boundingBoxElement.style.width = boxWidth + "px";
    boundingBoxElement.style.height = boxHeight + "px";
    imageContainer.appendChild(boundingBoxElement);

    // Draw the label
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    labelSpan.className = "bounding-box-label";
    labelSpan.style.backgroundColor = color;
    labelSpan.style.left = xmin + "px";
    labelSpan.style.top = (ymin - 12) + "px";
    imageContainer.appendChild(labelSpan);
}
```

The bounding box and label span also need some styling, so add the following to the `style.css` file:

```css
.bounding-box {
    position: absolute;
    box-sizing: border-box;
}
  
.bounding-box-label {
    position: absolute;
    color: white;
    font-size: 12px;
}
```

Now we just have one more task left, which is to remove these boxes and labels from the DOM if the users uploads a new image. To achieve that, we’ll invoke the `removeElements()` function (imported from `utils.js`) in the body of the `onFileReaderLoad()` , like this: 

```js
removeElements("bounding-box-label");
removeElements("bounding-box");
```

And that’s it!

You have now built a fully functioning AI app that detects objects in images using nothing but a browser. No external server, no APIs, no build tools. Pretty cool!

![Demo](https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/js-detection-btn-inference-elephant.png)


The app is live at the following URL: [https://huggingface.co/spaces/Scrimba/javascript-object-detector](https://huggingface.co/spaces/Scrimba/javascript-object-detector)

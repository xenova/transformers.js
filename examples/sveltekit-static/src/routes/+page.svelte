<script>
	import { onMount } from 'svelte';
	export const prerender = true;
	let pipelineWorker;
	let result = null;
	let ready = null;
	$: console.log('ready', ready);
	onMount(async () => {
		// onMount set up the worker as soon as the `App` component is mounted.
		if (!pipelineWorker) {
			// Create the worker if it does not yet exist.
			const Worker = await import('$lib/worker.js?worker');
			pipelineWorker = new Worker.default();

			const onMessageReceived = (e) => {
				switch (e.data.status) {
					case 'initiate':
						ready = false;
						break;
					case 'ready':
						ready = true;
						break;
					case 'complete':
						result = e.data.output[0];
						break;
				}
			};

			// Attach the callback function as an event listener.
			pipelineWorker.addEventListener('message', onMessageReceived);
		}
	});

	function classify(text) {
		if (pipelineWorker) {
			pipelineWorker.postMessage({ text });
		}
	}
</script>

<main class="flex min-h-screen flex-col items-center justify-center p-12">
	<h1 class="text-5xl font-bold mb-2 text-center">Transformers.js</h1>
	<h2 class="text-2xl mb-4 text-center">SvelteKit Static template (client-side)</h2>
	<input
		type="text"
		class="w-full max-w-xs p-2 border border-gray-300 rounded mb-4"
		placeholder="Enter text here"
		on:input={(e) => {
			classify(e.target.value);
		}}
	/>

	{#if ready !== null}
		<pre class="bg-gray-100 p-2 rounded">{!ready || !result
				? 'Loading...'
				: JSON.stringify(result, null, 2)}</pre>
	{/if}
</main>

<style lang="postcss">
	/* :global(html) {
		background-color: theme(colors.gray.100);
	} */
</style>

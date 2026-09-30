<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();
</script>

<main>
	<h1>School Visits</h1>

	<section>
		<h2>Record a visit</h2>
		<form
			method="POST"
			action="?/add"
			use:enhance={() =>
				async ({ result, update }) => {
					await update({ reset: result.type === 'success' });
					await invalidateAll();
				}}
		>
			<label>
				School
				<select name="schoolNumber" required value={form?.schoolNumber ?? data.selected}>
					<option value="" disabled>Choose a school…</option>
					{#each data.schools as s (s.schoolNumber)}
						<option value={s.schoolNumber}>{s.schoolName}</option>
					{/each}
				</select>
			</label>
			<label>
				Visit date
				<input type="date" name="visitDate" required max={data.today} value={form?.visitDate ?? data.today} />
			</label>
			<label>
				Note
				<textarea name="noteText" required rows="4">{form?.noteText ?? ''}</textarea>
			</label>
			<button type="submit">Save visit</button>
			{#if form?.error}<p role="alert" class="error">{form.error}</p>{/if}
			{#if form?.saved}<p role="status">Visit saved.</p>{/if}
		</form>
	</section>

	<section>
		<h2>Latest visit</h2>
		<form method="GET">
			<label>
				School
				<select name="school" required value={data.selected}>
					<option value="" disabled>Choose a school…</option>
					{#each data.schools as s (s.schoolNumber)}
						<option value={s.schoolNumber}>{s.schoolName}</option>
					{/each}
				</select>
			</label>
			<button type="submit">Look up</button>
		</form>

		{#if data.latest}
			<dl>
				<dt>School name</dt><dd>{data.latest.schoolName}</dd>
				<dt>Visit date</dt><dd>{data.latest.visitDate}</dd>
				<dt>Note</dt><dd class="note">{data.latest.noteText}</dd>
				<dt>Age (days)</dt><dd>{data.latest.ageDays}</dd>
			</dl>
		{:else if data.selected}
			<p>No visits recorded for this school yet.</p>
		{/if}
	</section>
</main>

<style>
	main { max-width: 40rem; margin: 2rem auto; padding: 0 1rem; font-family: system-ui, sans-serif; }
	form { display: grid; gap: 0.75rem; }
	label { display: grid; gap: 0.25rem; }
	select, input, textarea, button { font: inherit; padding: 0.4rem; }
	button { justify-self: start; }
	section + section { margin-top: 2rem; }
	dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; }
	dt { font-weight: 600; }
	dd { margin: 0; }
	.note { white-space: pre-wrap; }
	.error { color: #b00020; }
</style>

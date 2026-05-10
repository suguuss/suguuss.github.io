function renderRows(obj) {
	return '<ul>' + Object.entries(obj).map(([k, v]) =>
		`<li><span>${k}</span><span>${v}</span></li>`
	).join('') + '</ul>';
}

function openLightbox(id) {
	const p = photos[id];
	document.getElementById('lightbox-img').src = p.image;
	document.getElementById('lightbox-img').alt = p.subtitle;
	document.getElementById('lightbox-title').textContent = p.title;
	document.getElementById('lightbox-subtitle').textContent = p.subtitle;
	document.getElementById('lightbox-gear').innerHTML = '<h3>Gear</h3>' + renderRows(p.gear);
	document.getElementById('lightbox-processing').innerHTML = '<h3>Processing</h3>' + renderRows(p.processing);
	document.getElementById('lightbox').classList.add('active');
}

function closeLightbox(e) {
	const lb = document.getElementById('lightbox');
	if (!e || e.target === lb || e.target.classList.contains('lightbox-close')) {
		lb.classList.remove('active');
	}
}

document.addEventListener('keydown', e => {
	if (e.key === 'Escape') closeLightbox();
});

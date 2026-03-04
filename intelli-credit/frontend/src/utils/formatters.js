export const formatCurrency = (value) => {
	if (value === null || value === undefined) return '—';
	return new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		maximumFractionDigits: 0,
	}).format(value);
};

export const formatPercentage = (value) => {
	if (value === null || value === undefined) return '—';
	return `${Number(value).toFixed(2)}%`;
};

export const formatNumber = (value) => {
	if (value === null || value === undefined) return '—';
	return new Intl.NumberFormat('en-IN').format(value);
};

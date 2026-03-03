import { formatCurrency } from '../utils/formatters';

export default function ExtractedDataView({ data }) {
	if (!data) return null;
	return (
		<div style={{ border: '1px solid #ccc', padding: '15px' }}>
			<h3>Extracted Financials</h3>
			<ul>
				<li>Revenue: {formatCurrency(data.revenue)}</li>
				<li>Net Profit: {formatCurrency(data.net_profit)}</li>
				<li>Liabilities: {formatCurrency(data.liabilities)}</li>
				<li>GST Turnover: {formatCurrency(data.gst_turnover)}</li>
			</ul>
		</div>
	);
}

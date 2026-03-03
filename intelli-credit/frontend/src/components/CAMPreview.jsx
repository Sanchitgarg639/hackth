import { useState } from 'react';
import { downloadCAM } from '../api/creditApi';

export default function CAMPreview({ companyId }) {
	const [downloading, setDownloading] = useState(false);

	const handleDownload = async () => {
		setDownloading(true);
		try {
			const res = await downloadCAM(companyId);
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', `CAM_Report_${companyId}.docx`);
			document.body.appendChild(link);
			link.click();
			link.parentNode.removeChild(link);
		} catch (error) {
			alert('Failed to download CAM report');
		} finally {
			setDownloading(false);
		}
	};

	return (
		<div style={{ marginTop: '20px' }}>
			<h3>Credit Appraisal Memo</h3>
			<p>Your comprehensive Credit Appraisal Memo has been generated.</p>
			<button onClick={handleDownload} disabled={downloading}>
				{downloading ? 'Downloading...' : 'Download CAM (.docx)'}
			</button>
		</div>
	);
}

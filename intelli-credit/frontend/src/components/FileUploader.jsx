import { useState } from 'react';

export default function FileUploader({ onUpload }) {
	const [file, setFile] = useState(null);
	const [companyName, setCompanyName] = useState('');
	const [sector, setSector] = useState('');

	const handleSubmit = (e) => {
		e.preventDefault();
		if (file && companyName && sector) {
			onUpload(file, companyName, sector);
		}
	};

	return (
		<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
			<input type="text" placeholder="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
			<input type="text" placeholder="Sector" value={sector} onChange={e => setSector(e.target.value)} required />
			<input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} required />
			<button type="submit">Upload and Extract</button>
		</form>
	);
}

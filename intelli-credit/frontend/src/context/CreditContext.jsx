import { createContext, useState, useContext } from 'react';

const CreditContext = createContext();

export const useCredit = () => useContext(CreditContext);

export const CreditProvider = ({ children }) => {
	const [companyId, setCompanyId] = useState(null);
	const [fileId, setFileId] = useState(null);
	const [analysisId, setAnalysisId] = useState(null);
	const [analysisStatus, setAnalysisStatus] = useState(null);
	const [extractedData, setExtractedData] = useState(null);
	const [riskData, setRiskData] = useState(null);
	const [camSummary, setCamSummary] = useState(null);

	const reset = () => {
		setCompanyId(null);
		setFileId(null);
		setAnalysisId(null);
		setAnalysisStatus(null);
		setExtractedData(null);
		setRiskData(null);
		setCamSummary(null);
	};

	const value = {
		companyId, setCompanyId,
		fileId, setFileId,
		analysisId, setAnalysisId,
		analysisStatus, setAnalysisStatus,
		extractedData, setExtractedData,
		riskData, setRiskData,
		camSummary, setCamSummary,
		reset,
	};

	return <CreditContext.Provider value={value}>{children}</CreditContext.Provider>;
};

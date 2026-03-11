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
	// Stage 1: Onboarding
	const [entityDetails, setEntityDetails] = useState(null);
	const [loanDetails, setLoanDetails] = useState(null);
	// Stage 2 & 3: Documents
	const [documents, setDocuments] = useState([]);
	const [classificationResults, setClassificationResults] = useState({});
	const [schemas, setSchemas] = useState({});
	// Stage 4: Analysis results
	const [triangulationResults, setTriangulationResults] = useState(null);
	const [swotAnalysis, setSwotAnalysis] = useState(null);
	const [reasoningBreakdown, setReasoningBreakdown] = useState(null);
	const [researchTracks, setResearchTracks] = useState(null);

	const reset = () => {
		setCompanyId(null);
		setFileId(null);
		setAnalysisId(null);
		setAnalysisStatus(null);
		setExtractedData(null);
		setRiskData(null);
		setCamSummary(null);
		setEntityDetails(null);
		setLoanDetails(null);
		setDocuments([]);
		setClassificationResults({});
		setSchemas({});
		setTriangulationResults(null);
		setSwotAnalysis(null);
		setReasoningBreakdown(null);
		setResearchTracks(null);
	};

	const value = {
		companyId, setCompanyId,
		fileId, setFileId,
		analysisId, setAnalysisId,
		analysisStatus, setAnalysisStatus,
		extractedData, setExtractedData,
		riskData, setRiskData,
		camSummary, setCamSummary,
		entityDetails, setEntityDetails,
		loanDetails, setLoanDetails,
		documents, setDocuments,
		classificationResults, setClassificationResults,
		schemas, setSchemas,
		triangulationResults, setTriangulationResults,
		swotAnalysis, setSwotAnalysis,
		reasoningBreakdown, setReasoningBreakdown,
		researchTracks, setResearchTracks,
		reset,
	};

	return <CreditContext.Provider value={value}>{children}</CreditContext.Provider>;
};

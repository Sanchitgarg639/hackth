import { createContext, useState, useContext } from 'react';

const CreditContext = createContext();

export const useCredit = () => useContext(CreditContext);

export const CreditProvider = ({ children }) => {
	const [companyId, setCompanyId] = useState(null);
	const [extractedData, setExtractedData] = useState(null);
	const [riskData, setRiskData] = useState(null);

	const value = {
		companyId, setCompanyId,
		extractedData, setExtractedData,
		riskData, setRiskData
	};

	return <CreditContext.Provider value={value}>{children}</CreditContext.Provider>;
};

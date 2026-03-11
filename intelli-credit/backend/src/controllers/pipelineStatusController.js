const Analysis = require('../models/Analysis');
const { logger } = require('../utils/logger');

/**
 * GET /api/v1/pipeline-status/:analysisId
 * Return the current stage and progress of the analysis pipeline.
 */
exports.getPipelineStatus = async (req, res, next) => {
	try {
		const { analysisId } = req.params;

		const analysis = await Analysis.findOne({ analysisId });
		if (!analysis) {
			return res.status(404).json({
				error: { code: 'NOT_FOUND', message: 'Analysis not found' }
			});
		}

		const documents = analysis.documents || [];
		const totalDocs = documents.length;
		const classifiedDocs = documents.filter(d => d.approvalStatus === 'confirmed' || d.approvalStatus === 'rejected').length;
		const extractedDocs = documents.filter(d => d.extractedData && Object.keys(d.extractedData).length > 0).length;

		res.json({
			analysisId,
			status: analysis.status,
			stage: _determineStage(analysis),
			progress: {
				onboarding: analysis.entityDetails ? 'complete' : 'pending',
				upload: totalDocs > 0 ? 'complete' : 'pending',
				classification: totalDocs > 0 && classifiedDocs === totalDocs ? 'complete' : (classifiedDocs > 0 ? 'in_progress' : 'pending'),
				extraction: totalDocs > 0 && extractedDocs === totalDocs ? 'complete' : (extractedDocs > 0 ? 'in_progress' : 'pending'),
				research: analysis.researchFindings && Object.keys(analysis.researchFindings).length > 0 ? 'complete' : 'pending',
				risk: analysis.riskScore != null ? 'complete' : 'pending',
				report: analysis.camUrl ? 'complete' : 'pending',
			},
			updatedAt: analysis.updatedAt,
		});
	} catch (error) {
		next(error);
	}
};

function _determineStage(analysis) {
	if (analysis.camUrl) return 'report';
	if (analysis.riskScore != null) return 'scoring';
	if (analysis.researchFindings && Object.keys(analysis.researchFindings).length > 0) return 'researching';
	const docs = analysis.documents || [];
	if (docs.length > 0 && docs.some(d => d.extractedData && Object.keys(d.extractedData).length > 0)) return 'extracting';
	if (docs.length > 0) return 'classifying';
	if (analysis.entityDetails) return 'onboarded';
	return 'new';
}

const mongoose = require('mongoose');
const Analysis = require('./src/models/Analysis');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const a = await Analysis.findOne({ status: 'onboarded' }).lean();
    console.log('Found onboarded analysis:', a ? a.analysisId : 'none');
    process.exit(0);
});

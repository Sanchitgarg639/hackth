const logger = {
	info: (...args) => console.log('\x1b[36m%s\x1b[0m', '[INFO]', ...args),
	error: (...args) => console.error('\x1b[31m%s\x1b[0m', '[ERROR]', ...args),
	warn: (...args) => console.warn('\x1b[33m%s\x1b[0m', '[WARN]', ...args)
};

module.exports = { logger };

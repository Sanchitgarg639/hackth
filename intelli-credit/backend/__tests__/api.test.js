const request = require('supertest');
const app = require('../src/app');

describe('Backend API — Phase 1 Smoke Tests', () => {

	describe('Health & System', () => {
		test('GET /health returns 200 with status ok', async () => {
			const res = await request(app).get('/health');
			expect(res.status).toBe(200);
			expect(res.body).toHaveProperty('status', 'ok');
			expect(res.body).toHaveProperty('uptime');
			expect(res.body).toHaveProperty('time');
			expect(res.body).toHaveProperty('version');
		});

		test('GET /metrics returns 200 with counts', async () => {
			const res = await request(app).get('/metrics');
			expect(res.status).toBe(200);
			expect(res.body).toHaveProperty('uptime');
			expect(res.body).toHaveProperty('totalRequests');
		});
	});

	describe('Upload Routes', () => {
		test('POST /api/v1/upload without file returns 400', async () => {
			const res = await request(app)
				.post('/api/v1/upload')
				.field('companyName', 'Test Corp');
			expect(res.status).toBe(400);
			expect(res.body).toHaveProperty('error');
			expect(res.body.error).toHaveProperty('code');
		});
	});

	describe('Analysis Routes', () => {
		test('POST /api/v1/analyze without companyId returns 400', async () => {
			const res = await request(app)
				.post('/api/v1/analyze')
				.send({});
			expect(res.status).toBe(400);
			expect(res.body).toHaveProperty('error');
			expect(res.body.error.code).toBe('MISSING_COMPANY');
		});

		test('GET /api/v1/analyze/invalid returns 404 or 500', async () => {
			const res = await request(app).get('/api/v1/analyze/invalid');
			expect([404, 500]).toContain(res.status);
		});
	});

	describe('Report Routes', () => {
		test('GET /api/v1/report/invalid returns 404 or 500', async () => {
			const res = await request(app).get('/api/v1/report/invalid');
			expect([404, 500]).toContain(res.status);
		});
	});

	describe('404 Handler', () => {
		test('GET /nonexistent returns 404 with structured error', async () => {
			const res = await request(app).get('/nonexistent');
			expect(res.status).toBe(404);
			expect(res.body).toHaveProperty('error');
			expect(res.body.error.code).toBe('NOT_FOUND');
		});
	});
});

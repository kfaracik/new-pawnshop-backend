// Runs before every test file, ahead of any src import. The env module throws
// on missing required vars at import time; integration tests connect mongoose
// to an in-memory server themselves, so the URI value here is never dialed
// (src/app.ts skips DB bootstrap when NODE_ENV === "test").
process.env.NODE_ENV = "test";
process.env.MONGODB_URI ||= "mongodb://127.0.0.1:1/test-placeholder";
process.env.JWT_SECRET ||= "test-secret-not-used-in-production-0123456789";
// A dummy key so isStripeConfigured() passes and payment-endpoint guards
// (ownership, session checks) are reachable; guard-path tests never call Stripe.
process.env.STRIPE_SECRET_KEY ||= "sk_test_dummy_for_guard_tests";

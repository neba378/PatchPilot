// src/db/seed.ts
import { db } from './index';
import { projects, incidents, investigations } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Seeding initial sample project and incident...');

  // 1. Project
  const existingProject = await db.select().from(projects).where(eq(projects.id, 'proj_checkout')).get();
  if (!existingProject) {
    await db.insert(projects).values({
      id: 'proj_checkout',
      name: 'checkout-api-service',
      repoOwner: 'nebiyu-org',
      repoName: 'checkout-api-service',
      defaultBranch: 'main',
      sandboxProvider: 'fake',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // 2. Incident INC-9042
  const existingIncident = await db.select().from(incidents).where(eq(incidents.id, 'INC-9042')).get();
  if (!existingIncident) {
    await db.insert(incidents).values({
      id: 'INC-9042',
      projectId: 'proj_checkout',
      source: 'sentry',
      externalId: 'evt_99182a',
      fingerprint: 'paymentcontroller.ts:handlecheckout:typeerror:billingdetails',
      title: "TypeError: Cannot read properties of undefined (reading 'billingDetails')",
      severity: 'critical',
      category: 'code_bug',
      status: 'awaiting_approval',
      environment: 'production',
      errorType: 'TypeError',
      errorMessage: "Cannot read properties of undefined (reading 'billingDetails')",
      stackFrames: JSON.stringify([
        {
          file: 'src/controllers/paymentController.ts',
          line: 10,
          column: 33,
          function: 'handleCheckout',
          inApp: true
        }
      ]),
      logExcerpt: `TypeError: Cannot read properties of undefined (reading 'billingDetails')
    at handleCheckout (src/controllers/paymentController.ts:10:33)
    at Layer.handle [as handle_request] (node_modules/express/lib/router/layer.js:95:5)
    at next (node_modules/express/lib/router/route.js:144:13)
Endpoint: POST /api/v1/checkout/charge
HTTP Status: 500 Internal Server Error
Payload: {"amount":4900,"currency":"USD","customerId":"cus_9941a"} (missing metadata)`,
      commitSha: 'a7b31e9',
      repo: 'nebiyu-org/checkout-api-service',
      occurredAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      detectedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      occurrences: 4,
      relatedSignals: JSON.stringify([
        { source: 'sentry', timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
        { source: 'github_actions', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() }
      ])
    });

    await db.insert(investigations).values({
      id: 'INV-9042',
      incidentId: 'INC-9042',
      hypotheses: JSON.stringify([
        {
          statement: "Unchecked dereference on optional client metadata payload causing TypeError on null/undefined",
          supportingEvidence: "Stack frame points directly to line 10 dereferencing metadata.billingDetails. Incoming payload omits metadata key.",
          counterEvidence: "None found. Express middleware does not enforce JSON schema or default values on request body.",
          confidence: 0.95,
          status: "leading"
        },
        {
          statement: "Upstream Stripe SDK schema breaking change or network timeout",
          supportingEvidence: "Error occurred during checkout flow execution.",
          counterEvidence: "Ruled out: The stack trace terminates inside paymentController.ts prior to any external Stripe network invocation.",
          confidence: 0.10,
          status: "ruled_out"
        },
        {
          statement: "Missing Stripe environment variables (STRIPE_SECRET_KEY)",
          supportingEvidence: "Stripe integration is active in paymentController.",
          counterEvidence: "Ruled out: TypeError is accessing property of undefined in client payload, not an authentication or configuration exception.",
          confidence: 0.05,
          status: "ruled_out"
        }
      ]),
      rootCauses: JSON.stringify([
        "Unsafe direct property access on req.body.metadata without optional chaining or default fallback"
      ]),
      affectedFiles: JSON.stringify(['src/controllers/paymentController.ts']),
      fixable: true,
      riskLevel: 'low',
      confidenceScore: 95,
      createdAt: new Date().toISOString()
    });
  }

  console.log('✅ Seeding complete!');
}

seed();

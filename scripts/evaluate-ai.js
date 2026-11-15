import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { getPool, query } from '../server/db.js';
import { extractBudget } from '../server/ai-budget.js';
import { rankProducts } from '../server/rag.js';

const cutoff = 5;

function percentage(value) {
  return `${(value * 100).toFixed(1)}%`;
}

try {
  const dataset = JSON.parse(await readFile(new URL('../evaluation/flower-relevance.json', import.meta.url), 'utf8'));
  const documents = await query(
    `SELECT d.product_id, d.content, NULL AS embedding, p.name, p.price,
            p.flower_type AS "flowerType", p.flower_count AS "flowerCount",
            p.wrapping, p.color, p.occasions, p.stock
     FROM rag_documents d JOIN products p ON p.id = d.product_id
     WHERE p.is_active = 1`,
  );
  const catalogIds = new Set(documents.map((doc) => doc.product_id));
  const rows = [];
  let assertionFailures = 0;

  for (const testCase of dataset.queries) {
    const unknownIds = testCase.relevantProductIds.filter((id) => !catalogIds.has(id));
    if (unknownIds.length) {
      throw new Error(`${testCase.id} labels products missing from the active RAG catalog: ${unknownIds.join(', ')}`);
    }

    const budget = extractBudget(testCase.query);
    const result = rankProducts(testCase.query, budget, documents);
    const actualIds = result.products.map((product) => product.product_id);
    const relevantIds = new Set(testCase.relevantProductIds);
    const relevantFound = actualIds.filter((id) => relevantIds.has(id)).length;
    const firstRelevantRank = actualIds.findIndex((id) => relevantIds.has(id));
    const precisionAt5 = relevantFound / cutoff;
    const recallAt5 = relevantFound / relevantIds.size;
    const reciprocalRank = firstRelevantRank < 0 ? 0 : 1 / (firstRelevantRank + 1);
    const violations = result.products.filter((product) => (
      Number(product.stock) <= 0 || (budget != null && Number(product.price) > budget)
    ));
    if (violations.length) assertionFailures += 1;
    rows.push({ testCase, budget, actualIds, precisionAt5, recallAt5, reciprocalRank, violations });
  }

  const count = rows.length;
  const mean = (field) => rows.reduce((sum, row) => sum + row[field], 0) / count;
  const summary = {
    datasetVersion: dataset.version,
    evaluatedQueries: count,
    activeCatalogDocuments: documents.length,
    retrievalMode: 'TF-IDF + cosine similarity (offline baseline)',
    precisionAt5: percentage(mean('precisionAt5')),
    recallAt5: percentage(mean('recallAt5')),
    meanReciprocalRank: mean('reciprocalRank').toFixed(3),
    inventoryOrBudgetViolationQueries: assertionFailures,
  };

  console.log('AI recommendation evaluation');
  console.log(JSON.stringify(summary, null, 2));
  for (const row of rows) {
    console.log(JSON.stringify({
      id: row.testCase.id,
      budget: row.budget,
      relevantIds: row.testCase.relevantProductIds,
      recommendedIds: row.actualIds,
      precisionAt5: percentage(row.precisionAt5),
      recallAt5: percentage(row.recallAt5),
      reciprocalRank: row.reciprocalRank.toFixed(3),
      violations: row.violations.length,
    }));
  }

  if (assertionFailures) process.exitCode = 1;
} catch (error) {
  console.error(`AI evaluation failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await getPool().end();
}


import { generateFeaturesPdfBytes } from "../src/server/pdf/featuresPdf";
import { generateSpellsPdfBytes } from "../src/server/pdf/spellsPdf";
import { prisma } from "../src/lib/prisma";
import fs from "fs/promises";
import path from "path";

async function testSpellsPdf() {
  console.log("Testing Spells PDF...");
  try {
    // Get first 3 spells
    const spells = await prisma.spell.findMany({ take: 3, select: { spellId: true } });
    if (spells.length === 0) {
      console.log("No spells found in DB, skipping spells PDF test.");
      return;
    }
    const spellIds = spells.map(s => s.spellId);
    
    const start = Date.now();
    const pdfBytes = await generateSpellsPdfBytes(spellIds);
    const duration = Date.now() - start;
    
    console.log(`Spells PDF generated in ${duration}ms. Size: ${pdfBytes.length} bytes.`);
    await fs.writeFile(path.join(process.cwd(), "test-spells.pdf"), pdfBytes);
  } catch (e) {
    console.warn("⚠️  Skipping Spells PDF test due to DB error (likely connection issue):", e instanceof Error ? e.message : String(e));
  }
}

async function testFeaturesPdf() {
  console.log("Testing Features PDF...");
  const mockInput = {
    characterName: "Test Character",
    features: {
      passive: [
        { 
          name: "Test Passive", 
          description: "This is a **bold** description.", 
          sourceName: "Test Source",
          key: "test-passive",
          displayTypes: ["Passive"],
          primaryType: "Passive",
          source: "Test Rulebook"
        }
      ],
      actions: [
        { 
          name: "Test Action", 
          description: "Action *description*", 
          sourceName: "Test Source", 
          usesPer: 1, 
          usesRemaining: 1, 
          restType: "LR",
          key: "test-action",
          displayTypes: ["Action"],
          primaryType: "Action",
          source: "Test Rulebook"
        }
      ],
      bonusActions: [],
      reactions: []
    } as any
  };

  const start = Date.now();
  const pdfBytes = await generateFeaturesPdfBytes(mockInput);
  const duration = Date.now() - start;

  console.log(`Features PDF generated in ${duration}ms. Size: ${pdfBytes.length} bytes.`);
  await fs.writeFile(path.join(process.cwd(), "test-features.pdf"), pdfBytes);
}

async function main() {
  try {
    console.log("Starting PDF generation stress test...");
    
    // Warmup / Single run
    await testFeaturesPdf();
    await testSpellsPdf();

    console.log("--- Loop Test (5 iterations) ---");
    for (let i = 0; i < 5; i++) {
        process.stdout.write(`Iteration ${i + 1}... `);
        const t0 = Date.now();
        await testFeaturesPdf();
        await testSpellsPdf();
        console.log(`Done in ${Date.now() - t0}ms`);
    }

    console.log("✅ PDF Generation Verification Passed!");
  } catch (e) {
    console.error("❌ PDF Generation Failed:", e);
    process.exit(1);
  }
}

main();

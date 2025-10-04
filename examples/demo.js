"use strict";
/**
 * VIZTRTR Demo
 *
 * Runs VIZTRTR on the Performia upload interface
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const orchestrator_1 = require("../src/core/orchestrator");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
async function main() {
    const config = {
        // Project settings
        projectPath: path.join(__dirname, '../../frontend'),
        frontendUrl: 'http://localhost:5001',
        targetScore: 8.5,
        maxIterations: 3,
        // Plugin selection
        visionModel: 'claude-opus',
        implementationModel: 'claude-sonnet',
        // API credentials
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        // Screenshot config
        screenshotConfig: {
            width: 1440,
            height: 900,
            fullPage: false,
        },
        // Output
        outputDir: path.join(__dirname, '../../viztritr-output'),
        verbose: true,
    };
    // Validate API key
    if (!config.anthropicApiKey) {
        console.error('❌ Error: ANTHROPIC_API_KEY not found in environment');
        console.error('   Please create a .env file with your API key:');
        console.error('   ANTHROPIC_API_KEY=sk-ant-...\n');
        process.exit(1);
    }
    console.log('🎨 VIZTRTR - Visual Iteration Orchestrator');
    console.log('━'.repeat(70));
    console.log(`   Project: ${config.projectPath}`);
    console.log(`   URL: ${config.frontendUrl}`);
    console.log(`   Target: ${config.targetScore}/10`);
    console.log(`   Max Iterations: ${config.maxIterations}`);
    console.log('━'.repeat(70));
    console.log();
    // Create orchestrator
    const orchestrator = new orchestrator_1.VIZTRTROrchestrator(config);
    try {
        // Run iteration cycle
        const report = await orchestrator.run();
        console.log('\n📊 Final Report:');
        console.log(`   ${report.reportPath}`);
        if (report.targetReached) {
            console.log('\n🎉 Success! Target score reached.');
            process.exit(0);
        }
        else {
            console.log(`\n⚠️  Target not reached. Final score: ${report.finalScore.toFixed(1)}/10`);
            console.log('   Consider running additional iterations or manual refinement.');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=demo.js.map
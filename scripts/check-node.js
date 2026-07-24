const major = Number(process.versions.node.split(".")[0]);

if (Number.isNaN(major) || major < 20) {
  console.error("");
  console.error("❌ This app needs Node.js 20 or newer.");
  console.error(`   You have: Node.js ${process.versions.node}`);
  console.error("");
  console.error("Fix:");
  console.error("  1. Open https://nodejs.org");
  console.error("  2. Download the LTS version");
  console.error("  3. Install it (Next through defaults)");
  console.error("  4. CLOSE PowerShell completely");
  console.error("  5. Open a NEW PowerShell");
  console.error("  6. Run:  node -v");
  console.error("     (must show v20.x or v22.x)");
  console.error("  7. Then:  cd $HOME\\Desktop\\Uno-v2");
  console.error("            npm run dev");
  console.error("");
  process.exit(1);
}

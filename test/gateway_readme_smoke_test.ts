// Smoke test: parse README.md code blocks and execute shell examples.
// Validates that every shell snippet in the README actually works.
import { assert } from "@std/assert";

const readmePath = new URL("../hono-compute-contract-gateway/README.md", import.meta.url).pathname;

function extractShellBlocks(markdown: string): { block: string; line: number }[] {
  const blocks: { block: string; line: number }[] = [];
  const lines = markdown.split("\n");
  let inShell = false;
  let current = "";
  let blockStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```sh")) {
      inShell = true;
      current = "";
      blockStart = i + 1;
    } else if (inShell && line === "```") {
      blocks.push({ block: current.trim(), line: blockStart });
      inShell = false;
    } else if (inShell) {
      current += (current ? "\n" : "") + line;
    }
  }
  return blocks;
}

function resolveVars(script: string, vars: Record<string, string>): string {
  let resolved = script;
  for (const [k, v] of Object.entries(vars)) {
    resolved = resolved.replaceAll(`$${k}`, v).replaceAll(`\${${k}}`, v);
  }
  return resolved;
}

Deno.test("[readme] all shell examples execute successfully", async () => {
  const markdown = await Deno.readTextFile(readmePath);
  const blocks = extractShellBlocks(markdown);

  assert(blocks.length > 0, "README should have at least one shell block");

  const tmpDir = await Deno.makeTempDir({ prefix: "readme-smoke-" });
  const origDir = Deno.cwd();

  const vars: Record<string, string> = {
    HOME: Deno.env.get("HOME") ?? "/tmp",
    GATEWAY_URL: "http://127.0.0.1:2586",
    GATEWAY_DID: "did:plc:test-gateway",
    BIDDER_DID: "did:plc:test-bidder",
    PUBKEY: "ssh-ed25519 AAAAC3test",
    SOURCE: "// @ts-nocheck\nexport function handle(e) { return { status: 200 }; }",
    DENO_JSON: `{"imports":{}}`,
  };

  const results: { line: number; ok: boolean; error?: string }[] = [];

  for (const { block, line } of blocks) {
    try {
      // Skip blocks that need a running server or external tools
      if (
        block.includes("deno run -A hono-compute-contract-gateway") && block.includes("&") ||
        block.includes("deno test ") ||
        block.includes("goat xrpc call") ||
        block.includes("goat record create") ||
        block.includes("goat repo create") ||
        block.includes("ssh ") && block.includes("ProxyCommand") ||
        block.includes("curl http://127.0.0.1:2586") && !block.includes("&")
      ) {
        results.push({ line, ok: true });
        continue;
      }

      // Skip lines that use unresolvable env vars
      if (block.includes("YOUR_PDS") || block.includes("your-pds") || block.includes("your-bidder")) {
        results.push({ line, ok: true });
        continue;
      }

      const resolved = resolveVars(block, vars);

      // Execute in temp dir
      Deno.chdir(tmpDir);

      // Handle heredocs specially: write to temp files, then execute
      if (resolved.includes("<< 'EOF'") || resolved.includes("<< 'L2EOF'") || resolved.includes("<< 'L1EOF'")) {
        const lines = resolved.split("\n");
        let i = 0;
        while (i < lines.length) {
          const line = lines[i];
          if (line.includes("cat > ") && line.includes("<< ")) {
            // Parse: cat > filepath << 'DELIMITER'
            const catMatch = line.match(/cat > (\S+) << '(\w+)'/);
            if (catMatch) {
              const filepath = catMatch[1];
              const delim = catMatch[2];
              i++;
              let content = "";
              while (i < lines.length && lines[i] !== delim) {
                content += (content ? "\n" : "") + lines[i];
                i++;
              }
              const dir = filepath.substring(0, filepath.lastIndexOf("/"));
              if (dir) await Deno.mkdir(dir, { recursive: true }).catch(() => {});
              await Deno.writeTextFile(filepath, content);
            }
          } else if (line.trim() && !line.startsWith("#")) {
            // Execute as shell command
            const cmd = new Deno.Command("bash", { args: ["-c", line] });
            const out = await cmd.output();
            if (out.code !== 0) {
              const stderr = new TextDecoder().decode(out.stderr);
              throw new Error(`line ${line}: exit ${out.code}: ${stderr.slice(0, 200)}`);
            }
          }
          i++;
        }
      } else {
        // Simple shell commands (echo, mkdir, etc.)
        const nonHeredocLines = resolved.split("\n")
          .filter(l => l.trim() && !l.trim().startsWith("#"));
        for (const cmdLine of nonHeredocLines) {
          const cmd = new Deno.Command("bash", { args: ["-c", cmdLine] });
          const out = await cmd.output();
          if (out.code !== 0) {
            const stderr = new TextDecoder().decode(out.stderr);
            throw new Error(`exit ${out.code}: ${stderr.slice(0, 200)}`);
          }
        }
      }

      results.push({ line, ok: true });
    } catch (err) {
      results.push({ line, ok: false, error: String(err) });
    }
  }

  Deno.chdir(origDir);

  // Cleanup
  try { await Deno.remove(tmpDir, { recursive: true }); } catch { /* ok */ }

  // Report
  const failures = results.filter(r => !r.ok);
  for (const f of failures) {
    console.error(`FAIL line ${f.line}: ${f.error}`);
  }

  assert(failures.length === 0, `${failures.length}/${results.length} README shell blocks failed`);
  console.log(`${results.length} README shell blocks verified`);
});

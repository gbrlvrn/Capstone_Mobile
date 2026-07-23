// Kills any process occupying PORT before nodemon starts.
// Always exits 0 so npm predev never blocks the dev script.
import { execSync } from "child_process";

const PORT = process.env.PORT || 5001;

try {
  if (process.platform === "win32") {
    execSync(
      `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT}') do @taskkill /PID %a /F`,
      { shell: "cmd.exe", stdio: "ignore" }
    );
  } else {
    execSync(`lsof -ti tcp:${PORT} | xargs kill -9`, { stdio: "ignore" });
  }
  console.log(`\u2705  Port ${PORT} cleared.`);
} catch (_) {
  // Nothing was occupying the port — that's fine.
  console.log(`\u2705  Port ${PORT} is free.`);
}

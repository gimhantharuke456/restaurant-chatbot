import "dotenv/config";
import app from "./app.js";

const PORT = process.env.BACKEND_PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api/docs`);
});

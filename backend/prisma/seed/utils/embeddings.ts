import { VertexAI } from "@google-cloud/aiplatform";

const vertexAI = new VertexAI({
  project: process.env.VERTEX_PROJECT_ID!,
  location: process.env.VERTEX_LOCATION || "us-central1",
});

// If Vertex AI is not available in dev, generate a stable fake vector
function fakeDeterministicVector(text: string, dimensions = 768): number[] {
  const hash = text
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = hash / 1000;
  return Array.from(
    { length: dimensions },
    (_, i) => Math.sin(seed * (i + 1)) * 0.5,
  );
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (process.env.USE_FAKE_EMBEDDINGS === "true") {
    return fakeDeterministicVector(text);
  }

  try {
    const model = vertexAI.preview.getGenerativeModel({
      model: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
    });
    // Note: use the embedding endpoint directly
    const response = await fetch(
      `https://${process.env.VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${process.env.VERTEX_PROJECT_ID}/locations/${process.env.VERTEX_LOCATION}/publishers/google/models/${process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004"}:predict`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAccessToken()}`,
        },
        body: JSON.stringify({ instances: [{ content: text }] }),
      },
    );
    const data = await response.json();
    return data.predictions[0].embeddings.values;
  } catch {
    console.warn("Embedding API unavailable, using deterministic fake vector");
    return fakeDeterministicVector(text);
  }
}

async function getAccessToken(): Promise<string> {
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || "";
}

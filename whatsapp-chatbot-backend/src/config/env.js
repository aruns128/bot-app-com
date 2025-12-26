
export function validateEnv() {
  if (!process.env.PORT) process.env.PORT = "3001";
}

const API_URL = import.meta.env.VITE_API_URL;

export async function api(path, options = {}) {
  const token = localStorage.getItem("farmlinkToken");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...options.headers,
    },
  });

  const data =
    response.status === 204
      ? null
      : await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Request failed.");
  }

  return data;
}
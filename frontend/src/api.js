// In development Vite proxies this path to the backend. Keeping requests on the
// same origin avoids CORS and supports whichever port Vite selected (for example 5175).
const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/$/,
  ""
);

export async function api(path, options = {}) {
  const token = localStorage.getItem("farmlinkToken");

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    // Browser network and CORS errors otherwise surface only as "Failed to fetch".
    throw new Error(
      "Cannot reach the FarmLink server. Please make sure the backend is running and try again."
    );
  }

  // If backend issued a refreshed token, update client storage immediately
  const refreshedToken = response.headers.get("X-Refreshed-Token");
  if (refreshedToken) {
    try {
      localStorage.setItem("farmlinkToken", refreshedToken);
    } catch {
      // Storage failure safeguard
    }
  }

  let data = null;
  if (response.status !== 204) {
    const body = await response.text();
    try {
      data = body ? JSON.parse(body) : null;
    } catch {
      throw new Error("The server returned an invalid response. Please try again.");
    }
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      !path.includes("/auth/login") &&
      !path.includes("/auth/register")
    ) {
      // Token is permanently invalid or expired beyond refresh
      localStorage.removeItem("farmlinkToken");
      localStorage.removeItem("farmlinkCurrentUser");

      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/register" &&
        window.location.pathname !== "/"
      ) {
        setTimeout(() => {
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login?expired=1";
          }
        }, 150);
      }
    }

    throw new Error(data?.message || "Request failed.");
  }

  return data;
}

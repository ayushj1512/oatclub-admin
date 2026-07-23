const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "";

const buildUrl = (endpoint = "") => {
  const path = String(endpoint || "").trim();

  if (!path) {
    throw new Error("API endpoint is required");
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedBase = String(BASE_URL || "").replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
};

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {
        message: text || response.statusText,
      };
    }
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );

    error.status = response.status;
    error.response = data;

    throw error;
  }

  return data;
};

const request = async (
  endpoint,
  {
    method = "GET",
    body,
    headers = {},
    credentials = "include",
    cache = "no-store",
    signal,
  } = {}
) => {
  const url = buildUrl(endpoint);

  const options = {
    method,
    credentials,
    cache,
    signal,
    headers: {
      Accept: "application/json",
      ...headers,
    },
  };

  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.headers["Content-Type"] =
        options.headers["Content-Type"] || "application/json";

      options.body =
        typeof body === "string" ? body : JSON.stringify(body);
    }
  }

  const response = await fetch(url, options);

  return parseResponse(response);
};

export const getRequest = async (
  endpoint,
  options = {}
) => {
  return request(endpoint, {
    ...options,
    method: "GET",
  });
};

export const postRequest = async (
  endpoint,
  body,
  options = {}
) => {
  return request(endpoint, {
    ...options,
    method: "POST",
    body,
  });
};

export const putRequest = async (
  endpoint,
  body,
  options = {}
) => {
  return request(endpoint, {
    ...options,
    method: "PUT",
    body,
  });
};

export const patchRequest = async (
  endpoint,
  body,
  options = {}
) => {
  return request(endpoint, {
    ...options,
    method: "PATCH",
    body,
  });
};

export const deleteRequest = async (
  endpoint,
  body,
  options = {}
) => {
  return request(endpoint, {
    ...options,
    method: "DELETE",
    body,
  });
};

export const getErrorMessage = (
  error,
  fallback = "Something went wrong"
) => {
  return (
    error?.response?.message ||
    error?.response?.error ||
    error?.data?.message ||
    error?.message ||
    fallback
  );
};

export default request;